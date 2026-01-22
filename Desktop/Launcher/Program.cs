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
        
        // Use ProgramData for logs to avoid permission issues
        static string LOG_FILE => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "EsportManager", "launcher_debug.log");

        [STAThread]
        static async Task Main()
        {
            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Log("Launcher started.");

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
                    Log("Update check finished. Launching main app.");
                    LaunchMainApp();
                    Application.Exit();
                }
                catch (Exception ex)
                {
                    Log($"FATAL ERROR: {ex}");
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
            Log($"Checking version from {API_BASE_URL}/latest...");
            string latestVersion = "";
            try
            {
                var response = await client.GetStringAsync($"{API_BASE_URL}/latest");
                Log($"Version response: {response}");
                using var doc = JsonDocument.Parse(response);
                if (doc.RootElement.TryGetProperty("version", out var v))
                {
                    latestVersion = v.GetString();
                }
            }
            catch (Exception ex)
            {
                Log($"Failed to check version: {ex.Message}");
                // Verify if server is reachable or 404 (no update)
                // If failed, just valid to continue to launch
                return;
            }

            if (string.IsNullOrEmpty(latestVersion)) 
            {
                Log("Latest version is empty/null. Aborting update.");
                return;
            }

            // 2. Compare with local
            string currentVersion = "0.0.0";
            string installDir = AppDomain.CurrentDomain.BaseDirectory;
            string versionPath = Path.Combine(installDir, VERSION_FILE);

            if (File.Exists(versionPath))
            {
                currentVersion = File.ReadAllText(versionPath).Trim();
            }
            
            Log($"Current Version: {currentVersion}, Latest Version: {latestVersion}");

            if (latestVersion != currentVersion)
            {
                statusLabel.Text = $"Updating to {latestVersion}...";
                Log("Versions mismatch. Starting update...");
                
                // 3. Download to TEMP folder (no admin rights needed)
                string tempFolder = Path.GetTempPath();
                string zipPath = Path.Combine(tempFolder, "esport_update.zip");
                
                Log($"Downloading update to {zipPath}...");
                var zipBytes = await client.GetByteArrayAsync($"{API_BASE_URL}/download");
                await File.WriteAllBytesAsync(zipPath, zipBytes);
                Log("Download complete.");

                // 3.5. Kill running application
                try
                {
                    string processName = Path.GetFileNameWithoutExtension(MAIN_EXE);
                    Process[] processes = Process.GetProcessesByName(processName);
                    if (processes.Length > 0)
                    {
                        Log($"Found {processes.Length} running instances of {processName}. Killing...");
                        foreach (var p in processes)
                        {
                            try 
                            { 
                                p.Kill(); 
                                p.WaitForExit(3000); // 3 sec timeout
                            } 
                            catch (Exception px) 
                            {
                                Log($"WARNING: Failed to kill process {p.Id}: {px.Message}");
                            }
                        }
                        // Give OS time to release file locks
                        await Task.Delay(1000);
                    }
                }
                catch (Exception ex)
                {
                    Log($"WARNING: Error ensuring app termination: {ex.Message}");
                }

                // 4. Extract to install directory
                Log($"Extracting to {installDir}...");
                
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
                            catch (IOException ioEx)
                            {
                                Log($"WARNING: Could not overwrite {entry.FullName} (locked?): {ioEx.Message}");
                                // File might be locked - skip and continue
                                // This is OK for non-critical files
                            }
                        }
                    }
                    Log("Extraction complete.");
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
                Log($"Writing new version {latestVersion} to {versionPath}");
                await File.WriteAllTextAsync(versionPath, latestVersion);
                Log("Update successful.");
            }
            else
            {
                Log("Version is up to date.");
            }
        }

        static void LaunchMainApp()
        {
            string mainExePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, MAIN_EXE);
            Log($"Launching main app: {mainExePath}");
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
                string msg = $"Application not found: {mainExePath}";
                Log(msg);
                MessageBox.Show(msg, "Fatal Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void Log(string message)
        {
            try
            {
                // Ensure directory exists
                string logDir = Path.GetDirectoryName(LOG_FILE);
                if (!Directory.Exists(logDir))
                {
                    Directory.CreateDirectory(logDir);
                }

                string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                string line = $"[{timestamp}] {message}{Environment.NewLine}";
                File.AppendAllText(LOG_FILE, line);
            }
            catch (Exception)
            {
                // Try to log to temp file if ProgramData fails
                try
                {
                    string tempLog = Path.Combine(Path.GetTempPath(), "esport_launcher_fallback.log");
                    File.AppendAllText(tempLog, $"[{DateTime.Now}] (Fallback) {message}{Environment.NewLine}");
                }
                catch { }
            }
        }
    }
}