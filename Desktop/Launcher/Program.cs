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
                
                // 3. Download
                var zipBytes = await client.GetByteArrayAsync($"{API_BASE_URL}/download");
                string zipPath = "update.zip";
                await File.WriteAllBytesAsync(zipPath, zipBytes);

                // 4. Extract (Overwrite)
                // Use a temporary folder or extract directly? Direct is risky if files locked.
                // Assuming Launcher is separate from Main App files regarding locking.
                // Best practice: Extract to 'temp', then move/overwrite.
                // For 'Easiest': Just overwrite. If MainApp is closed, it works.
                
                try
                {
                    ZipFile.ExtractToDirectory(zipPath, AppDomain.CurrentDomain.BaseDirectory, true);
                }
                catch (Exception ex)
                {
                    throw new Exception("Extraction failed: " + ex.Message);
                }
                finally
                {
                    File.Delete(zipPath);
                }

                // Update local version file
                await File.WriteAllTextAsync(VERSION_FILE, latestVersion);
            }
        }

        static void LaunchMainApp()
        {
            if (File.Exists(MAIN_EXE))
            {
                Process.Start(new ProcessStartInfo(MAIN_EXE) { UseShellExecute = true });
            }
            else
            {
                MessageBox.Show($"Application not found: {MAIN_EXE}", "Fatal Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}