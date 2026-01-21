using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace EsportLauncher
{
    static class Program
    {
        // CONFIG
        const string API_BASE_URL = "https://esport-backend.pollak.info/api/client/update"; // Change to production URL
        const string MAIN_EXE = "EsportManager.exe";
        const string VERSION_FILE = "version.txt";

        [STAThread]
        static async Task Main()
        {
            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Simple UI for status
            var form = new Form
            {
                Text = "Esport Launcher",
                Size = new System.Drawing.Size(300, 150),
                StartPosition = FormStartPosition.CenterScreen,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false
            };
            var label = new Label
            {
                Text = "Checking for updates...",
                AutoSize = false,
                TextAlign = System.Drawing.ContentAlignment.MiddleCenter,
                Dock = DockStyle.Fill
            };
            form.Controls.Add(label);

            form.Shown += async (s, e) =>
            {
                try
                {
                    await CheckAndInstallUpdate(label);
                    LaunchMainApp();
                    Application.Exit();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Update failed: {ex.Message}\nLaunching current version...", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    LaunchMainApp();
                    Application.Exit();
                }
            };

            Application.Run(form);
        }

        static async Task CheckAndInstallUpdate(Label statusLabel)
        {
            using var client = new HttpClient();
            
            // 1. Get latest version info
            statusLabel.Text = "Checking version...";
            string latestVersion = "";
            try
            {
                var response = await client.GetStringAsync($"{API_BASE_URL}/latest");
                using var doc = JsonDocument.Parse(response);
                if (doc.RootElement.TryGetProperty("version", out var v))
                {
                    latestVersion = v.GetString();
                }
            }
            catch (Exception)
            {
                // Verify if server is reachable or 404 (no update)
                // If failed, just valid to continue to launch
                return;
            }

            if (string.IsNullOrEmpty(latestVersion)) return;

            // 2. Compare with local
            string currentVersion = "0.0.0";
            if (File.Exists(VERSION_FILE))
            {
                currentVersion = File.ReadAllText(VERSION_FILE).Trim();
            }

            if (latestVersion != currentVersion)
            {
                statusLabel.Text = $"Updating to {latestVersion}...";
                
                // 3. Download to TEMP folder (no admin rights needed)
                string tempFolder = Path.GetTempPath();
                string zipPath = Path.Combine(tempFolder, "esport_update.zip");
                
                var zipBytes = await client.GetByteArrayAsync($"{API_BASE_URL}/download");
                await File.WriteAllBytesAsync(zipPath, zipBytes);

                // 4. Extract to install directory
                string installDir = AppDomain.CurrentDomain.BaseDirectory;
                
                try
                {
                    // Extract files one by one to handle locked files gracefully
                    using (var archive = ZipFile.OpenRead(zipPath))
                    {
                        foreach (var entry in archive.Entries)
                        {
                            string destinationPath = Path.Combine(installDir, entry.FullName);
                            
                            // Skip directories (they're created automatically)
                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(destinationPath);
                                continue;
                            }
                            
                            // Ensure directory exists
                            string destDir = Path.GetDirectoryName(destinationPath);
                            if (!string.IsNullOrEmpty(destDir) && !Directory.Exists(destDir))
                            {
                                Directory.CreateDirectory(destDir);
                            }
                            
                            try
                            {
                                entry.ExtractToFile(destinationPath, true);
                            }
                            catch (IOException)
                            {
                                // File might be locked - skip and continue
                                // This is OK for non-critical files
                            }
                        }
                    }
                }
                catch (UnauthorizedAccessException ex)
                {
                    throw new Exception($"Permission denied. Please run as Administrator or check folder permissions.\n{installDir}\n\nDetails: {ex.Message}");
                }
                catch (Exception ex)
                {
                    throw new Exception("Extraction failed: " + ex.Message);
                }
                finally
                {
                    try { File.Delete(zipPath); } catch { }
                }

                // Update local version file
                await File.WriteAllTextAsync(Path.Combine(installDir, VERSION_FILE), latestVersion);
            }
        }

        static void LaunchMainApp()
        {
            string mainExePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, MAIN_EXE);
            if (File.Exists(mainExePath))
            {
                var psi = new ProcessStartInfo(mainExePath)
                {
                    UseShellExecute = true,
                    WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory
                };
                Process.Start(psi);
            }
            else
            {
                MessageBox.Show($"Application not found: {mainExePath}", "Fatal Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}