using System;
using System.Diagnostics;
using System.Drawing;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.IO;
using Microsoft.Win32;
using System.Linq;

namespace EsportManager
{
    public partial class Form1 : Form
    {
        private readonly System.Windows.Forms.Timer _timer;
        private readonly HttpClient _httpClient;

        // Config-backed properties
        private string KeycloakLoginUrl => Services.ConfigService.Current.Keycloak.LoginUrl;
        private string BaseApiUrl => Services.ConfigService.Current.Api.BaseUrl;
        private string StatusApiUrl => Services.ConfigService.Current.Api.StatusUrl;
        private string StartSessionUrl => Services.ConfigService.Current.Api.StartSessionUrl;
        private string EndSessionUrl => Services.ConfigService.Current.Api.EndSessionUrl;
        private string FailSafePassword => Services.ConfigService.Current.Security.FailSafePassword;
        private int MaxPauseDurationSeconds => Services.ConfigService.Current.Session.MaxPauseDurationSeconds;
        private int[] _warningIntervals => Services.ConfigService.Current.Session.WarningIntervals;

        // Fields
        private bool _allowClose = false;
        private bool _isUnlocked = false;
        private string? _currentUserId;
        private string? _currentOmNumber;
        private string? _accessToken;
        private bool _isAdmin = false;
        
        // UI
        private Panel _loginPanel = null!;
        private TextBox _usernameTextBox = null!;
        private TextBox _passwordTextBox = null!;
        private Button _loginButton = null!;
        private Label _statusLabel = null!;
        private Panel _lockedPanel = null!;
        private NotifyIcon _notifyIcon = null!;
        private ContextMenuStrip _contextMenuStrip = null!;
        private Label _clockLabel = null!;
        private System.Windows.Forms.Timer _clockTimer = null!;
        
        // Session
        private System.Windows.Forms.Timer _sessionTimer = null!;
        private int _remainingSeconds;
        private bool _isSessionPaused = false;
        private DateTime _pauseStartTime;
        
        // Notification
        private NotificationOverlay _notificationOverlay = null!;
        private System.Windows.Forms.Timer _notificationHideTimer = null!;
        private HashSet<int> _warningsShown = new HashSet<int>();

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
        private const int SPI_SETDESKWALLPAPER = 20;
        private const int SPIF_UPDATEINIFILE = 0x01;
        private const int SPIF_SENDWININICHANGE = 0x02;

        // Kiosk Security
        private Services.KeyboardHook _keyboardHook;

        // Form beállítások a Kiosk módhoz
        public Form1()
        {
            InitializeComponent();

            // Auto-Start beállítása - KIKAPCSOLVA: Scheduled Task használata helyette
            // EnsureStartup();

            // Form beállítások a Kiosk módhoz
            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            this.TopMost = true;
            this.BackColor = EsportManager.Controls.UiColors.Background;
            this.ForeColor = Color.White;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.KeyPreview = true;

            // Billentyűzet blokkolás aktiválása
            _keyboardHook = new Services.KeyboardHook();
            _keyboardHook.Hook();

            // HttpClient inicializálása - SSL ellenőrzés kikapcsolása fejlesztéshez
            var handler = new HttpClientHandler();
            _httpClient = new HttpClient(handler);
            
            // UI létrehozása
            CreateUI();

            // Timer inicializálása (ellenőrzi a státuszt)
            _timer = new System.Windows.Forms.Timer { Interval = 5000 };
            _timer.Tick += Timer_Tick;
            _timer.Start();

            // Task Manager letiltása induláskor


            // Billentyű események
            this.KeyDown += Form1_KeyDown;
            this.FormClosing += Form1_FormClosing;

            // Zárolva állapot beállítása
            ShowLockedScreen();
        }

        protected override async void OnShown(EventArgs e)
        {
            base.OnShown(e);
            await CheckRegistration(force: false, silent: true);
        }

        private async Task CheckUserRoleAndRegister()
        {
            try
            {
                if (string.IsNullOrEmpty(_currentUserId) || string.IsNullOrEmpty(_accessToken)) return;

                // Create request to get user details (role)
                // We use the ID extracted from token
                var request = new HttpRequestMessage(HttpMethod.Get, $"{Services.ConfigService.Current.Api.BaseUrl}/users/{_currentUserId}");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _accessToken);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    
                    // Backend returns { success: true, data: { ... role: "ADMIN" ... } }
                    if (doc.RootElement.TryGetProperty("data", out var dataProp))
                    {
                        if (dataProp.TryGetProperty("role", out var roleProp))
                        {
                            string role = roleProp.GetString() ?? "";
                            if (role == "ADMIN" || role == "TEACHER" || role == "ORGANIZER")
                            {
                                // Trigger registration check explicitly
                                await CheckRegistration(force: true, silent: false);
                                
                                // Enable Admin Features
                                _isAdmin = true;
                                UpdateAdminMenu();
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CheckUserRole] Error: {ex.Message}");
            }
        }

        private async Task CheckRegistration(bool force = false, bool silent = true)
        {
            try
            {
                // Check status
                // Check status
                string machineName = Environment.MachineName;
                string version = "0.0.0";
                string versionFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "version.txt");
                if (File.Exists(versionFile))
                {
                     version = File.ReadAllText(versionFile).Trim();
                }

                var response = await _httpClient.GetAsync($"{Services.ConfigService.Current.Api.BaseUrl}/kiosk/status/{machineName}?version={version}");
                
                string content = await response.Content.ReadAsStringAsync();
                bool needsRegistration = false;
                
                if (!response.IsSuccessStatusCode)
                {
                    if (!silent && force) 
                    {
                         // If network error or 404 and we forced it, maybe we assume not registered if 404? 
                         // But index.ts mounts it. 
                         // Let's parse content if possible or fallback.
                         // If 404 Not Found, usually means endpoint exists but resource not found? No, express returns 200 with "Machine not registered" usually in my logic options?
                         // Wait, check kiosk.ts: 
                         // if !machine -> res.json({ Locked: false, Message: "Machine not registered" });
                         // So it RETURNS 200 OK.
                         // If response is NOT success, it's a real error.
                         MessageBox.Show($"Szerver hiba (Status Check): {response.StatusCode}", "Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                    return;
                }

                using var doc = JsonDocument.Parse(content);
                if (doc.RootElement.TryGetProperty("Message", out var msgElement))
                {
                    string msg = msgElement.GetString() ?? "";
                    if (msg.Contains("not registered", StringComparison.OrdinalIgnoreCase))
                    {
                        needsRegistration = true;
                    }
                }

                if (needsRegistration || (force && !silent))
                {
                    // If forced by admin, and ALREADY registered?
                    if (!needsRegistration && force)
                    {
                         // Admin invoked check, but it IS registered. 
                         // Should we offer to EDIT? Or just say "Registered".
                         // For now, let's only show if needsRegistration.
                         // User said: "If admin tries to login throw up the option". Implies blocking or missing.
                         // If it IS registered, we shouldn't bother them unless they asked "Re-register".
                         // BUT, maybe the "Message" was "not registered".
                         // So only enter here if needsRegistration is true.
                         // Wait, my condition `if (needsRegistration || (force && !silent))` allows entry if force=true even same if registered.
                         // I should strictly check `needsRegistration`.
                         // UNLESS the user wants to re-register.
                         // Let's stick to needsRegistration.
                         if (!needsRegistration) return; 
                    }

                    // Loop for registration form
                    while (true)
                    {
                        using (var regForm = new RegistrationForm())
                        {
                            if (regForm.ShowDialog(this) != DialogResult.OK)
                            {
                                // If triggered during login (force=true), cancel means "Skip registration and log in"
                                if (force) return;
                                
                                // If startup (silent=true), cancel means Exit
                                Application.Exit();
                                return;
                            }

                            // Try to register
                            var regData = new
                            {
                                name = regForm.MachineName,
                                hostname = machineName,
                                row = regForm.Row,
                                position = regForm.Position,
                                adminPassword = regForm.AdminPassword
                            };

                            var json = JsonSerializer.Serialize(regData);
                            var postContent = new StringContent(json, Encoding.UTF8, "application/json");

                            try 
                            {
                                var regResponse = await _httpClient.PostAsync($"{Services.ConfigService.Current.Api.BaseUrl}/kiosk/register", postContent);
                                if (regResponse.IsSuccessStatusCode)
                                {
                                    MessageBox.Show("Sikeres regisztráció!", "Info", MessageBoxButtons.OK, MessageBoxIcon.Information);
                                    break; // Success
                                }
                                else
                                {
                                    string err = await regResponse.Content.ReadAsStringAsync();
                                    MessageBox.Show($"Hiba: {err}", "Regisztrációs Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
                                }
                            }
                            catch (Exception ex)
                            {
                                 MessageBox.Show($"Hálózat hiba: {ex.Message}", "Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                if (!silent) MessageBox.Show($"CheckRegistration Error: {ex.Message}", "Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Console.WriteLine($"[CheckRegistration] Error: {ex.Message}");
            }
        }

        private void EnsureStartup()
        {
            try
            {
                string runKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(runKey, true))
                {
                    if (key != null)
                    {
                        string appName = "EsportHubKiosk";
                        string? existingVal = key.GetValue(appName) as string;
                        string currentPath = Application.ExecutablePath;

                        if (existingVal != currentPath)
                        {
                            key.SetValue(appName, currentPath);
                            Console.WriteLine("[SETUP] Added to startup.");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SETUP] Failed to set startup: {ex.Message}");
            }
        }

        private void Form1_FormClosing(object? sender, FormClosingEventArgs e)
        {
            if (_keyboardHook != null)
            {
                _keyboardHook.Unhook();
            }
            
            // Ha véletlenül bezáródna, tálcára küldjük inkább (kivéve ha épp zárolva van)
            if (_isUnlocked && !_allowClose)
            {
                UnlockAndHide();
                e.Cancel = true; // Megakadályozza a bezárást
            }
            
            // Cleanup: Enable Task Manager on exit
            SetTaskMgrEnabled(true);
            
            base.OnFormClosing(e);
        }

        private void CreateUI()
        {
            // 0. Set Application Icon from Logo
            try
            {
                string appIconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "esportlogo.png");
                if (File.Exists(appIconPath))
                {
                    using (Bitmap bmp = new Bitmap(appIconPath))
                    {
                        IntPtr hIcon = bmp.GetHicon();
                        Icon appIcon = Icon.FromHandle(hIcon);
                        this.Icon = appIcon;
                        if (_notifyIcon != null) _notifyIcon.Icon = appIcon;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ICON] Failed to set icon: {ex.Message}");
            }

            // Locked Screen Panel (Custom Paint)
            _lockedPanel = new Panel
            {
                Dock = DockStyle.Fill,
                Visible = true
            };
            
            // Betöltjük a logót a Paint-hez
            string logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "esportlogo.png");
            Image? logo = null;
            if (File.Exists(logoPath))
            {
                try { logo = Image.FromFile(logoPath); } catch { }
            }

            _lockedPanel.Paint += (s, e) => 
            {
                var g = e.Graphics;
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                // 1. Háttér (Sötét gradiens)
                using (var brush = new System.Drawing.Drawing2D.LinearGradientBrush(
                    this.ClientRectangle, 
                    Color.FromArgb(10, 10, 20), 
                    Color.FromArgb(20, 20, 40), 
                    90F))
                {
                    g.FillRectangle(brush, this.ClientRectangle);
                }

                int centerY = this.Height / 2;
                int centerX = this.Width / 2;
                int currentY = centerY - 150;

                // 2. Logo drawing
                if (logo != null)
                {
                    int logoW = 200; // Méretezzük a logót
                    int logoH = (int)((float)logo.Height / logo.Width * logoW);
                    g.DrawImage(logo, centerX - (logoW / 2), currentY - 50, logoW, logoH);
                    currentY += logoH + 20;
                }
                else
                {
                    // Fallback logo text if image missing
                    currentY += 50;
                }

                // 3. Text: "ZÁROLVA"
                using (var font = new Font("Segoe UI", 48, FontStyle.Bold))
                using (var brush = new SolidBrush(Color.White))
                {
                    string text = "SZÁMÍTÓGÉP ZÁROLVA";
                    var size = g.MeasureString(text, font);
                    g.DrawString(text, font, brush, centerX - (size.Width / 2), currentY);
                    currentY += (int)size.Height + 10;
                }

                // 4. Hint: "Nyomj SPACE-t"
                using (var font = new Font("Segoe UI", 16, FontStyle.Regular))
                using (var brush = new SolidBrush(Color.LightGray))
                {
                    string text = "Bejelentkezéshez nyomj SPACE-t";
                    var size = g.MeasureString(text, font);
                    g.DrawString(text, font, brush, centerX - (size.Width / 2), currentY);
                }
            };

            // Real-time Clock Label
            _clockLabel = new Label
            {
                Text = DateTime.Now.ToString("HH:mm"),
                Font = new Font("Segoe UI", 36, FontStyle.Bold),
                ForeColor = Color.White,
                AutoSize = true,
                BackColor = Color.Transparent,
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            
            _clockLabel.Location = new Point(Screen.PrimaryScreen?.Bounds.Width ?? 1920 - 200, 30);
            
            _lockedPanel.Controls.Add(_clockLabel);

            // Clock Timer
            _clockTimer = new System.Windows.Forms.Timer { Interval = 1000 };
            _clockTimer.Tick += (s, e) => 
            {
                if (_clockLabel != null && !_clockLabel.IsDisposed)
                {
                    _clockLabel.Text = DateTime.Now.ToString("HH:mm");
                    _clockLabel.Location = new Point(_lockedPanel.Width - _clockLabel.Width - 50, 30);
                }
            };
            _clockTimer.Start();

            // Version Label (bottom-right)
            string versionText = "v0.0.0";
            try
            {
                string versionPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "version.txt");
                if (File.Exists(versionPath))
                {
                    versionText = "v" + File.ReadAllText(versionPath).Trim();
                }
            }
            catch { }
            
            Label lockedVersionLabel = new Label
            {
                Text = versionText,
                Font = new Font("Segoe UI", 12, FontStyle.Regular),
                ForeColor = Color.FromArgb(100, 100, 100),
                AutoSize = true,
                BackColor = Color.Transparent,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Right
            };
            
            // Position at bottom-right
            lockedVersionLabel.Location = new Point(
                (Screen.PrimaryScreen?.Bounds.Width ?? 1920) - 150, 
                (Screen.PrimaryScreen?.Bounds.Height ?? 1080) - 50
            );
            
            _lockedPanel.Controls.Add(lockedVersionLabel);

            this.Controls.Add(_lockedPanel);

            // Login panel (rejtve induláskor)
            _loginPanel = new Panel
            {
                Size = new Size(400, 320),
                BackColor = EsportManager.Controls.UiColors.Card,

                Visible = false
            };
            
            // Add rounded border to panel
            _loginPanel.Paint += (s, e) => 
            {
                ControlPaint.DrawBorder(e.Graphics, _loginPanel.ClientRectangle, 
                    EsportManager.Controls.UiColors.Border, ButtonBorderStyle.Solid);
            };

            _loginPanel.Location = new Point(
                (this.Width - _loginPanel.Width) / 2,
                (this.Height - _loginPanel.Height) / 2
            );

            Label titleLabel = new Label
            {
                Text = "Bejelentkezés",
                Font = new Font("Segoe UI", 18, FontStyle.Bold),
                ForeColor = EsportManager.Controls.UiColors.Foreground,
                Location = new Point(20, 20),
                Size = new Size(360, 40),
                TextAlign = ContentAlignment.MiddleCenter
            };

            Label usernameLabel = new Label
            {
                Text = "Felhasználónév",
                ForeColor = EsportManager.Controls.UiColors.Foreground,
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
                Location = new Point(30, 75),
                Size = new Size(340, 20)
            };

            var modernUserBox = new EsportManager.Controls.ModernTextBox
            {
                Location = new Point(30, 100),
                Size = new Size(340, 35)
            };
            _usernameTextBox = modernUserBox.InnerTextBox; 

            Label passwordLabel = new Label
            {
                Text = "Jelszó",
                ForeColor = EsportManager.Controls.UiColors.Foreground,
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
                Location = new Point(30, 145), 
                Size = new Size(340, 20)
            };

            var modernPassBox = new EsportManager.Controls.ModernTextBox
            {
                Location = new Point(30, 170),
                Size = new Size(340, 35),
                UseSystemPasswordChar = true
            };
            _passwordTextBox = modernPassBox.InnerTextBox; 
            _passwordTextBox.KeyDown += PasswordTextBox_KeyDown;

            var modernLoginBtn = new EsportManager.Controls.ModernButton
            {
                Text = "Bejelentkezés",
                Location = new Point(30, 225),
                Size = new Size(340, 40),
                StartColor = EsportManager.Controls.UiColors.Primary,
                EndColor = EsportManager.Controls.UiColors.NeonPink
            };
            _loginButton = modernLoginBtn; 
            _loginButton.Click += LoginButton_Click;

            _statusLabel = new Label
            {
                Text = "",
                ForeColor = EsportManager.Controls.UiColors.NeonPink,
                Location = new Point(30, 275),
                Size = new Size(340, 30),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 9, FontStyle.Regular)
            };
            
            // Show version on UI check
             string ver = "v0.0.0";
             if (File.Exists(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "version.txt")))
                 ver = "v" + File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "version.txt")).Trim();
            
             Label versionLabel = new Label
             {
                 Text = ver,
                 ForeColor = Color.Gray,
                 Location = new Point(30, 280),
                 Size = new Size(340, 20),
                 TextAlign = ContentAlignment.MiddleCenter,
                 Font = new Font("Segoe UI", 8, FontStyle.Regular)
             };

            _loginPanel.Controls.AddRange(new Control[] {
                titleLabel, usernameLabel, modernUserBox,
                passwordLabel, modernPassBox, modernLoginBtn, _statusLabel, versionLabel
            });

            this.Controls.Add(_loginPanel);

            // NotifyIcon és ContextMenu inicializálása
            _contextMenuStrip = new ContextMenuStrip();
            
            var logoutItem = new ToolStripMenuItem("Kijelentkezés");
            logoutItem.Click += LogoutItem_Click;
            _contextMenuStrip.Items.Add(logoutItem);

            _notifyIcon = new NotifyIcon
            {
                Icon = SystemIcons.Application,
                Text = "Esport Manager",
                ContextMenuStrip = _contextMenuStrip,
                Visible = false
            };

            // Notification Overlay inicializálása
            _notificationOverlay = new NotificationOverlay();
            _notificationHideTimer = new System.Windows.Forms.Timer { Interval = 5000 }; // 5 másodpercig látszik
            _notificationHideTimer.Tick += (s, e) => 
            { 
                _notificationOverlay.Hide(); 
                _notificationHideTimer.Stop(); 
            };

            // Disable Task Manager on startup
            SetTaskMgrEnabled(false);
        }

        private async void LogoutItem_Click(object? sender, EventArgs e)
        {
            string currentUser = _usernameTextBox.Text;

            // Stop session timer
            if (_sessionTimer != null)
            {
                _sessionTimer.Stop();
            }
            
            // End session on backend
            await EndSession();
            
            // Hide notification if visible
            _notificationHideTimer.Stop();
            _notificationOverlay.Hide();

            // Tálca ikon elrejtése
            _notifyIcon.Visible = false;
            
            // Képernyő megjelenítése és zárolása
            this.Show();
            this.WindowState = FormWindowState.Maximized;
            this.Activate();
            
            ShowLockedScreen();

            _isUnlocked = false;
            
            // Re-enable keyboard hook when locked
            if (_keyboardHook != null) _keyboardHook.Hook();

            _isAdmin = false;
            UpdateAdminMenu(); // Remove admin items
            
            Console.WriteLine("[LOGOUT] Felhasználó kijelentkezett a tálca ikon segítségével");
        }

        private void PauseResumeItem_Click(object? sender, EventArgs e)
        {
            if (_isSessionPaused)
            {
                ResumeSession();
            }
            else
            {
                PauseSession();
            }
        }

        private void PauseSession()
        {
            if (!_isUnlocked || _isSessionPaused) return;
            
            _isSessionPaused = true;
            _pauseStartTime = DateTime.Now;
            
            // Update context menu
            var pauseItem = _contextMenuStrip.Items.Find("pauseResumeItem", false).FirstOrDefault() as ToolStripMenuItem;
            if (pauseItem != null)
            {
                pauseItem.Text = "Resume Session";
            }
            
            ShowNotification($"Session paused (max {MaxPauseDurationSeconds / 60} minutes)");
            Console.WriteLine("[SESSION] Session paused by user");
        }

        private void ResumeSession()
        {
            if (!_isSessionPaused) return;
            
            _isSessionPaused = false;
            
            // Update context menu
            var pauseItem = _contextMenuStrip.Items.Find("pauseResumeItem", false).FirstOrDefault() as ToolStripMenuItem;
            if (pauseItem != null)
            {
                pauseItem.Text = "Pause Session";
            }
            
            ShowNotification("Session resumed");
            Console.WriteLine("[SESSION] Session resumed");
        }

        private void ShowLockedScreen()
        {
            if (_lockedPanel != null) _lockedPanel.Visible = true;
            _loginPanel.Visible = false;
            _isUnlocked = false;

            // Reset state
            _statusLabel.Text = "";
            _usernameTextBox.Text = "";
            _passwordTextBox.Text = "";
            _loginButton.Enabled = true;

            // Start clock
            _clockTimer.Start();
            
            // Disable Task Manager (Lockdown)
            SetTaskMgrEnabled(false);
        }

        private void ShowLoginScreen()
        {
            if (_lockedPanel != null) _lockedPanel.Visible = false;
            _loginPanel.Visible = true;
            _loginPanel.BringToFront();
            
            // Panel középre igazítása
            _loginPanel.Location = new Point(
                (this.Width - _loginPanel.Width) / 2,
                (this.Height - _loginPanel.Height) / 2
            );
            
            _usernameTextBox.Clear();
            _passwordTextBox.Clear();
            _statusLabel.Text = "";
            _usernameTextBox.Focus();
        }

        private void PasswordTextBox_KeyDown(object? sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter)
            {
                LoginButton_Click(_loginButton, EventArgs.Empty);
            }
        }

        private async void LoginButton_Click(object? sender, EventArgs e)
        {
            string username = _usernameTextBox.Text.Trim();
            string password = _passwordTextBox.Text;
            
            // Reset user ID
            _currentUserId = null;
            _isAdmin = false;

            Console.WriteLine("\n========== BEJELENTKEZÉSI KÍSÉRLET ==========");
            Console.WriteLine($"Username: {username}");
            Console.WriteLine($"Password length: {password.Length}");

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                _statusLabel.Text = "Töltsd ki az összes mezőt!";
                _statusLabel.ForeColor = Color.Red;
                Console.WriteLine("[LOGIN] ✗ Üres mezők");
                return;
            }

            _loginButton.Enabled = false;
            _statusLabel.Text = "Bejelentkezés...";
            _statusLabel.ForeColor = Color.Yellow;

            try
            {
                bool success = await AuthenticateWithKeycloak(username, password);

                if (success)
                {
                    Console.WriteLine("[LOGIN] ✓ SIKERES BEJELENTKEZÉS!");
                    _statusLabel.Text = "Bejelentkezés a rendszerbe...";
                    
                    // Check for registration if Admin
                    await CheckUserRoleAndRegister();

                    // Session indítása a backend-en
                    bool sessionStarted = await StartSession(username);
                    
                    if (sessionStarted)
                    {
                        _statusLabel.Text = "Sikeres bejelentkezés!";
                        _statusLabel.ForeColor = Color.LightGreen;
                        
                        // Set Wallpaper
                        SetUserWallpaper(username, _currentOmNumber);

                        await Task.Delay(500);
                        
                        // Show declaration dialog - user must accept before proceeding
                        bool declarationAccepted = ShowDeclarationDialog();
                        
                        if (!declarationAccepted)
                        {
                            // User declined - end session and return to locked screen
                            _statusLabel.Text = "A nyilatkozat elfogadása kötelező a használathoz.";
                            _statusLabel.ForeColor = Color.Orange;
                            await EndSession();
                            _loginButton.Enabled = true;
                            Console.WriteLine("[LOGIN] ✗ User declined declaration");
                            return;
                        }
                        
                        Console.WriteLine("[LOGIN] ✓ Declaration accepted");
                        
                        // Log declaration acceptance to backend
                        await LogDeclarationAcceptance(username);
                        
                        // Alkalmazás elrejtése
                        UnlockAndHide();
                        
                        // Enable Task Manager for user
                        SetTaskMgrEnabled(true);
                    }
                    else
                    {
                        _statusLabel.ForeColor = Color.Red;
                        if (string.IsNullOrEmpty(_statusLabel.Text) || _statusLabel.Text == "Bejelentkezés a rendszerbe...")
                            _statusLabel.Text = "Nincs elég játékidő vagy a gép zárolva van.";
                        _loginButton.Enabled = true;
                    }
                }
                else
                {
                    Console.WriteLine("[LOGIN] ✗ Sikertelen bejelentkezés");
                    // A statusLabel-t már az AuthenticateWithKeycloak állítja be
                    if (string.IsNullOrEmpty(_statusLabel.Text) || _statusLabel.Text == "Bejelentkezés...")
                    {
                        _statusLabel.Text = "Hibás felhasználónév vagy jelszó!";
                    }
                    _statusLabel.ForeColor = Color.Red;
                    _loginButton.Enabled = true;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LOGIN] ✗ EXCEPTION: {ex.GetType().Name}: {ex.Message}");
                Console.WriteLine($"[LOGIN] StackTrace: {ex.StackTrace}");
                _statusLabel.Text = $"Hiba: {ex.Message == ""}";
                _statusLabel.ForeColor = Color.Red;
                _loginButton.Enabled = true;
            }
            
            Console.WriteLine("============================================\n");
        }

        private async Task<bool> AuthenticateWithKeycloak(string username, string password)
        {
            try
            {
                Console.WriteLine($"[AUTH] Bejelentkezési kísérlet - Username: {username}");
                Console.WriteLine($"[AUTH] Keycloak URL: {KeycloakLoginUrl}");

                var content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("client_id", "esportdesktop"),
                    new KeyValuePair<string, string>("grant_type", "password"),
                    new KeyValuePair<string, string>("username", username),
                    new KeyValuePair<string, string>("password", password)
                });

                Console.WriteLine("[AUTH] HTTP POST küldése...");
                var response = await _httpClient.PostAsync(KeycloakLoginUrl, content);
                Console.WriteLine($"[AUTH] Válasz státusz: {(int)response.StatusCode} {response.StatusCode}");

                var responseBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[AUTH] Válasz tartalom: {responseBody}");

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var tokenData = JsonSerializer.Deserialize<KeycloakTokenResponse>(responseBody);
                        Console.WriteLine("[AUTH] ✓ Token sikeresen deserializálva");
                        Console.WriteLine($"[AUTH] Access token hossza: {tokenData?.access_token?.Length ?? 0}");
                        
                        if (!string.IsNullOrEmpty(tokenData?.access_token))
                        {
                            _accessToken = tokenData.access_token;
                            _currentUserId = ExtractUserIdFromToken(tokenData.access_token);
                            _currentOmNumber = ExtractClaimFromToken(tokenData.access_token, "OM");
                            Console.WriteLine($"[AUTH] User ID (sub): {_currentUserId}");
                            Console.WriteLine($"[AUTH] OM Number: {_currentOmNumber}");
                        }

                        // Token sikeres
                        // MEGJEGYZÉS: Ha ki akarod jelentkeztetni a felhasználót sikeres auth után, 
                        // akkor aktiváld az alábbi sort:
                        // await Task.Delay(100);
                        // RunLogoutScript(username);
                        
                        return true;
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"[AUTH] ✗ JSON parse hiba: {ex.Message}");
                        _statusLabel.Text = $"JSON hiba: {ex.Message}";
                        return false;
                    }
                }
                else
                {
                    // Hibás válasz - próbáljuk meg értelmezni a hibaüzenetet
                    try
                    {
                        var errorDoc = JsonDocument.Parse(responseBody);
                        if (errorDoc.RootElement.TryGetProperty("error", out var errorProp))
                        {
                            string error = errorProp.GetString() ?? "unknown";
                            string errorDesc = errorDoc.RootElement.TryGetProperty("error_description", out var descProp) 
                                ? descProp.GetString() ?? "" 
                                : "";
                            
                            Console.WriteLine($"[AUTH] ✗ Keycloak hiba: {error} - {errorDesc}");
                            _statusLabel.Text = $"Hiba: {error}";
                        }
                    }
                    catch
                    {
                        Console.WriteLine($"[AUTH] ✗ HTTP {(int)response.StatusCode}: {responseBody}");
                    }
                    
                    return false;
                }
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"[AUTH] ✗ Hálózati hiba: {ex.Message}");
                Console.WriteLine($"[AUTH] ✗ InnerException: {ex.InnerException?.Message}");
                _statusLabel.Text = $"Kapcsolódási hiba: {ex.Message}";
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AUTH] ✗ Váratlan hiba: {ex.GetType().Name}: {ex.Message}");
                Console.WriteLine($"[AUTH] StackTrace: {ex.StackTrace}");
                _statusLabel.Text = $"Hiba: {ex.Message}";
                return false;
            }
        }

        private async Task<bool> StartSession(string username)
        {
            try
            {
                var payload = new { 
                    username = username, 
                    userId = _currentUserId,
                    machineId = Environment.MachineName 
                };
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(StartSessionUrl, content);
                var responseBody = await response.Content.ReadAsStringAsync();
                
                if (response.IsSuccessStatusCode)
                {
                    var result = JsonSerializer.Deserialize<StartSessionResponse>(responseBody);
                    if (result != null && result.success)
                    {
                        _remainingSeconds = result.remainingTime;
                        return true;
                    }
                }
                
                // Hiba kezelése
                try 
                {
                    var errorDoc = JsonDocument.Parse(responseBody);
                    if (errorDoc.RootElement.TryGetProperty("error", out var errorProp))
                    {
                        _statusLabel.Text = errorProp.GetString();
                    }
                }
                catch { }
                
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SESSION] Start error: {ex.Message}");
                return false;
            }
        }

        private string? ExtractUserIdFromToken(string accessToken)
        {
            try
            {
                var parts = accessToken.Split('.');
                if (parts.Length != 3) return null;

                var payload = parts[1];
                // Fix Base64Url padding
                switch (payload.Length % 4)
                {
                    case 2: payload += "=="; break;
                    case 3: payload += "="; break;
                }
                var jsonBytes = Convert.FromBase64String(payload.Replace('-', '+').Replace('_', '/'));
                var json = Encoding.UTF8.GetString(jsonBytes);
                
                using (var doc = JsonDocument.Parse(json))
                {
                    if (doc.RootElement.TryGetProperty("sub", out var subProp))
                    {
                        return subProp.GetString();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JWT] Error parsing token: {ex.Message}");
            }
            return null;
        }

        private string? ExtractClaimFromToken(string accessToken, string claimName)
        {
            try
            {
                var parts = accessToken.Split('.');
                if (parts.Length != 3) return null;

                var payload = parts[1];
                switch (payload.Length % 4)
                {
                    case 2: payload += "=="; break;
                    case 3: payload += "="; break;
                }
                var jsonBytes = Convert.FromBase64String(payload.Replace('-', '+').Replace('_', '/'));
                var json = Encoding.UTF8.GetString(jsonBytes);
                
                // Debug: Log payload to see what's inside
                Console.WriteLine($"[JWT] Token Payload: {json}");

                using (var doc = JsonDocument.Parse(json))
                {
                    JsonElement prop;
                    
                    // 1. Try exact match
                    if (doc.RootElement.TryGetProperty(claimName, out prop))
                    {
                        return CleanClaimValue(prop);
                    }
                    
                    // 2. Try lowercase
                    if (doc.RootElement.TryGetProperty(claimName.ToLower(), out prop))
                    {
                        return CleanClaimValue(prop);
                    }

                    // 3. Try inside 'attributes' (Keycloak specific)
                    if (doc.RootElement.TryGetProperty("attributes", out var attributes))
                    {
                        if (attributes.TryGetProperty(claimName, out prop) || 
                            attributes.TryGetProperty(claimName.ToLower(), out prop))
                        {
                            return CleanClaimValue(prop);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JWT] Error parsing token claim {claimName}: {ex.Message}");
            }
            return null;
        }

        private string? CleanClaimValue(JsonElement prop)
        {
            if (prop.ValueKind == JsonValueKind.Array && prop.GetArrayLength() > 0)
            {
                var first = prop[0];
                if (first.ValueKind == JsonValueKind.String) return first.GetString();
                return first.ToString();
            }
            
            if (prop.ValueKind == JsonValueKind.String)
            {
                return prop.GetString();
            }
            
            return prop.ToString();
        }

        private async Task EndSession()
        {
            try
            {
                var payload = new { machineId = Environment.MachineName };
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                await _httpClient.PostAsync(EndSessionUrl, content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SESSION] End error: {ex.Message}");
            }
        }

        private async Task LogDeclarationAcceptance(string username)
        {
            try
            {
                var payload = new 
                { 
                    userId = _currentUserId,
                    username = username,
                    machineId = Environment.MachineName 
                };
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                string declarationUrl = BaseApiUrl + "/kiosk/declaration/accept";
                var response = await _httpClient.PostAsync(declarationUrl, content);
                
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[DECLARATION] ✓ Logged acceptance for {username}");
                }
                else
                {
                    Console.WriteLine($"[DECLARATION] ✗ Failed to log acceptance: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                // Don't fail the login if logging fails, just log the error
                Console.WriteLine($"[DECLARATION] ✗ Error logging acceptance: {ex.Message}");
            }
        }

        private void RunLogoutScript(string username)
        {
            try
            {
                Console.WriteLine($"[LOGOUT] Kijelentkeztetés indítása felhasználónak: {username}");
                
                // PowerShell script futtatása a felhasználó kijelentkeztetéséhez
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"logoff\"",
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                var process = Process.Start(psi);
                Console.WriteLine($"[LOGOUT] ✓ Logoff parancs elindítva (PID: {process?.Id})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LOGOUT] ✗ Kijelentkeztetési hiba: {ex.Message}");
                Console.WriteLine($"[LOGOUT] StackTrace: {ex.StackTrace}");
            }
        }

        private void UnlockAndHide()
        {
            _isUnlocked = true;
            this.Hide();

            // Disable keyboard hook when in tray
            if (_keyboardHook != null) _keyboardHook.Unhook();

            
            // Tálca ikon megjelenítése
            _notifyIcon.Visible = true;
            _notifyIcon.ShowBalloonTip(3000, "Esport Manager", "Az alkalmazás a háttérben fut. Jobb klikk a kilépéshez.", ToolTipIcon.Info);
            
            // Start session timer
            // _remainingSeconds is already set by StartSession
            if (_sessionTimer == null)
            {
                _sessionTimer = new System.Windows.Forms.Timer { Interval = 1000 };
                _sessionTimer.Tick += SessionTimer_Tick;
            }
            _sessionTimer.Start();
            UpdateTrayIconText();

            // Enable Task Manager for user
            SetTaskMgrEnabled(true);
        }

        private async void SessionTimer_Tick(object? sender, EventArgs e)
        {
            if (_isSessionPaused)
            {
                // Check if pause duration exceeded
                var pauseDuration = (DateTime.Now - _pauseStartTime).TotalSeconds;
                if (pauseDuration > MaxPauseDurationSeconds)
                {
                    ShowNotification("Pause time limit exceeded! Session resumed.");
                    ResumeSession();
                }
                return; // Don't decrement time while paused
            }

            // Infinite time check
            if (_remainingSeconds == -1)
            {
                UpdateTrayIconText();
                return;
            }
            
            _remainingSeconds--;
            UpdateTrayIconText();

            // Multi-interval warnings: 15min, 10min, 5min, 1min
            foreach (var warningThreshold in _warningIntervals)
            {
                if (_remainingSeconds == warningThreshold && !_warningsShown.Contains(warningThreshold))
                {
                    _warningsShown.Add(warningThreshold);
                    var minutes = warningThreshold / 60;
                    ShowNotification($"FIGYELEM: {minutes} perc van hátra a játékidőből!");
                    break;
                }
            }

            if (_remainingSeconds <= 0)
            {
                _sessionTimer.Stop();
                if (_isUnlocked)
                {
                    try
                    {
                        // End session on backend
                        await EndSession();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[LOGOUT] Error ending session: {ex.Message}");
                    }
                    finally
                    {
                        // Auto logout
                        _notificationHideTimer.Stop();
                        _notificationOverlay.Hide();
                        _notifyIcon.Visible = false;
                        this.Show();
                        this.Activate();
                        ShowLockedScreen();

                        // Force Windows Logout
                        RunLogoutScript(_currentUserId ?? "User");
                    }
                }
            }
        }

        private void ShowNotification(string message)
        {
            // Biztosítjuk, hogy a UI szálon fusson
            if (this.InvokeRequired)
            {
                this.Invoke(new Action<string>(ShowNotification), message);
                return;
            }

            _notificationOverlay.ShowMessage(message);
            _notificationHideTimer.Stop();
            _notificationHideTimer.Start();
        }

        private void UpdateTrayIconText()
        {
            if (_notifyIcon != null)
            {
                TimeSpan span = TimeSpan.FromSeconds(_remainingSeconds);
                string timeStr;
                
                if (_remainingSeconds == -1)
                {
                    timeStr = "Végtelen";
                }
                else
                {
                     timeStr = span.TotalHours >= 1 
                        ? $"{(int)span.TotalHours}:{span.Minutes:D2}:{span.Seconds:D2}" 
                        : span.ToString(@"mm\:ss");
                }
                
                string pauseIndicator = _isSessionPaused ? " [PAUSED]" : "";
                
                // Limit text length to 63 chars
                string text = $"Esport Manager - {timeStr}{pauseIndicator}";
                if (text.Length >= 64) text = text.Substring(0, 63);
                _notifyIcon.Text = text;
            }
        }

        private async void Timer_Tick(object? sender, EventArgs e)
        {
            try
            {
                // Lekérdezés a szervertől
                string machineName = Environment.MachineName;
                HttpResponseMessage response = await _httpClient.GetAsync(StatusApiUrl + machineName);

                if (response.IsSuccessStatusCode)
                {
                    string jsonResponse = await response.Content.ReadAsStringAsync();
                    var status = JsonSerializer.Deserialize<ServerStatus>(jsonResponse);

                    if (status != null && status.IsCompetitionMode)
                    {
                        if (!_isUnlocked)
                        {
                            _isUnlocked = true;
                            this.Hide();

                            _notifyIcon.Visible = true;
                            _notifyIcon.ShowBalloonTip(3000, "Esport Manager", "Verseny mód aktív.", ToolTipIcon.Info);
                        }
                        
                        // Verseny módban ne fusson a session timer
                        if (_sessionTimer != null && _sessionTimer.Enabled) _sessionTimer.Stop();
                        if (_notificationHideTimer != null && _notificationHideTimer.Enabled) _notificationHideTimer.Stop();
                        if (_notificationOverlay != null) _notificationOverlay.Hide();
                    }
                    else if (status != null && status.Locked && _isUnlocked)
                    {
                        // Újra zárolás és kijelentkeztetés
                        Console.WriteLine("[SYNC] Szerver oldali zárolás észlelve. Kijelentkeztetés...");
                        
                        if (_sessionTimer != null) _sessionTimer.Stop();
                        _notificationHideTimer.Stop();
                        _notificationOverlay.Hide();
                        _notifyIcon.Visible = false;
                        
                        this.Show();
                        this.Activate();
                        ShowLockedScreen();

                        
                        // Windows kijelentkeztetés
                        RunLogoutScript(_currentUserId ?? "User");
                    }
                    else if (status != null && !status.Locked && _isUnlocked)
                    {
                        // Sync time if provided
                        if (status.RemainingSeconds.HasValue)
                        {
                            // Only update if difference is significant (> 5 seconds) to avoid jitter
                            if (Math.Abs(_remainingSeconds - status.RemainingSeconds.Value) > 5)
                            {
                                _remainingSeconds = status.RemainingSeconds.Value;
                                UpdateTrayIconText();
                            }
                        }
                    }
                    else if (status != null && !status.Locked && !_isUnlocked)
                    {
                        // Ha a szerver szerint nincs zárolva, de mi zárolva vagyunk
                        // Megtartjuk a zárolást, csak a felhasználó jelentkezhet be
                    }
                }
            }
            catch (HttpRequestException ex)
            {
                // Ha a szerver nem elérhető, maradjon zárolva
                Console.WriteLine($"Hálózati hiba: {ex.Message}");
            }
        }

        private void Form1_KeyDown(object? sender, KeyEventArgs e)
        {
            // SPACE: Login képernyő megjelenítése
            if (e.KeyCode == Keys.Space && !_loginPanel.Visible)
            {
                ShowLoginScreen();
                e.Handled = true;
            }
            // ESC: Login képernyő bezárása
            else if (e.KeyCode == Keys.Escape && _loginPanel.Visible)
            {
                ShowLockedScreen();
                e.Handled = true;
            }
            // Fail-safe: Ctrl+Shift+F12 - Admin kilépés teszteléshez
            else if (e.Control && e.Shift && e.KeyCode == Keys.F12)
            {
                ShowFailSafeDialog();
                e.Handled = true;
            }
            // Alt+F4 letiltása
            else if (e.Alt && e.KeyCode == Keys.F4)
            {
                e.Handled = true;
            }
        }

        private void ShowFailSafeDialog()
        {
            bool shouldExit = false;
            string enteredPassword = "";
            
            using (Form failsafeForm = new Form())
            {
                failsafeForm.Text = "Fail-Safe Kilépés";
                failsafeForm.FormBorderStyle = FormBorderStyle.FixedDialog;
                failsafeForm.StartPosition = FormStartPosition.CenterScreen;
                failsafeForm.Size = new Size(400, 180);
                failsafeForm.MaximizeBox = false;
                failsafeForm.MinimizeBox = false;
                failsafeForm.TopMost = true;
                failsafeForm.BackColor = Color.FromArgb(45, 45, 45);

                Label label = new Label
                {
                    Text = "Emergency Admin Jelszó:",
                    ForeColor = Color.White,
                    Location = new Point(20, 20),
                    Size = new Size(350, 20)
                };

                TextBox textBox = new TextBox
                {
                    Location = new Point(20, 50),
                    Size = new Size(350, 25),
                    PasswordChar = '•',
                    BackColor = Color.FromArgb(60, 60, 60),
                    ForeColor = Color.White
                };

                Button okButton = new Button
                {
                    Text = "Kilépés",
                    DialogResult = DialogResult.OK,
                    Location = new Point(200, 95),
                    Size = new Size(80, 35),
                    BackColor = Color.FromArgb(200, 50, 50),
                    ForeColor = Color.White,
                    FlatStyle = FlatStyle.Flat
                };
                okButton.FlatAppearance.BorderSize = 0;

                Button cancelButton = new Button
                {
                    Text = "Mégse",
                    DialogResult = DialogResult.Cancel,
                    Location = new Point(290, 95),
                    Size = new Size(80, 35),
                    BackColor = Color.FromArgb(80, 80, 80),
                    ForeColor = Color.White,
                    FlatStyle = FlatStyle.Flat
                };
                cancelButton.FlatAppearance.BorderSize = 0;

                failsafeForm.Controls.AddRange(new Control[] { label, textBox, okButton, cancelButton });
                failsafeForm.AcceptButton = okButton;
                failsafeForm.CancelButton = cancelButton;

                if (failsafeForm.ShowDialog() == DialogResult.OK)
                {
                    enteredPassword = textBox.Text ?? "";
                }
            }
            
            // Process password AFTER dialog is closed and disposed
            if (!string.IsNullOrEmpty(enteredPassword))
            {
                try
                {
                    // Compute Hash of input
                    string hash;
                    using (var sha256 = System.Security.Cryptography.SHA256.Create())
                    {
                        var bytes = System.Text.Encoding.UTF8.GetBytes(enteredPassword);
                        hash = BitConverter.ToString(sha256.ComputeHash(bytes)).Replace("-", "").ToLower();
                    }
                    
                    // Safely get the failsafe password with null check
                    string expectedHash;
                    try
                    {
                        expectedHash = FailSafePassword?.ToLower() ?? "";
                    }
                    catch
                    {
                        expectedHash = "25487c1b7dae15d895fcb2be6c08b9140fe0e1913925dcf4c6059b385a74058c"; // Fallback hash
                    }
                    
                    if (hash == expectedHash)
                    {
                        shouldExit = true;
                    }
                    else
                    {
                        MessageBox.Show("Hibás jelszó!", "Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[FAILSAFE] Error during password check: {ex.Message}");
                    MessageBox.Show($"Hiba történt: {ex.Message}", "Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            
            // Exit AFTER dialog is fully disposed
            if (shouldExit)
            {
                PerformEmergencyExit();
            }
        }
        
        private void PerformEmergencyExit()
        {
            Console.WriteLine("[FAILSAFE] Starting emergency exit...");
            
            // Set flag first to prevent closing issues
            _allowClose = true;
            
            // Re-enable Task Manager IMMEDIATELY (Priority)
            try { SetTaskMgrEnabled(true); } catch { }

            // Stop timers safely
            try { _timer?.Stop(); } catch { }
            try { _sessionTimer?.Stop(); } catch { }
            try { _clockTimer?.Stop(); } catch { }
            try { _notificationHideTimer?.Stop(); } catch { }
            
            // Hide notification overlay
            try { _notificationOverlay?.Hide(); } catch { }
            
            // Hide tray icon
            try { if (_notifyIcon != null) _notifyIcon.Visible = false; } catch { }
            
            // Unhook keyboard with extra safety
            try { 
                if (_keyboardHook != null)
                {
                    _keyboardHook.Unhook(); 
                    _keyboardHook = null;
                }
            } catch { }
            
            // Create stop signal for watchdog
            try 
            {
                string signalPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "EsportManager_Stop.signal");
                File.Create(signalPath).Close();
                Console.WriteLine($"[FAILSAFE] Created stop signal at {signalPath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FAILSAFE] Could not create stop signal: {ex.Message}");
            }
            
            Console.WriteLine("[FAILSAFE] Exiting application via Environment.Exit(0)...");
            
            // Force exit process immediately
            Environment.Exit(0);
        }

        /// <summary>
        /// Shows a declaration dialog that users must accept before starting their session.
        /// Returns true if accepted, false if declined.
        /// </summary>
        private bool ShowDeclarationDialog()
        {
            using (Form declarationForm = new Form())
            {
                declarationForm.Text = "Nyilatkozat Elfogadása";
                declarationForm.FormBorderStyle = FormBorderStyle.FixedDialog;
                declarationForm.StartPosition = FormStartPosition.CenterScreen;
                declarationForm.Size = new Size(700, 550);
                declarationForm.MaximizeBox = false;
                declarationForm.MinimizeBox = false;
                declarationForm.TopMost = true;
                declarationForm.BackColor = Color.FromArgb(30, 30, 35);

                // Title Label
                Label titleLabel = new Label
                {
                    Text = "FELHASZNÁLÁSI FELTÉTELEK ÉS NYILATKOZAT",
                    ForeColor = Color.White,
                    Font = new Font("Segoe UI", 14, FontStyle.Bold),
                    Location = new Point(20, 15),
                    Size = new Size(650, 30),
                    TextAlign = ContentAlignment.MiddleCenter
                };

                // Load declaration text from external file
                string declarationText;
                string declarationFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "nyilatkozat.txt");
                
                try
                {
                    if (File.Exists(declarationFilePath))
                    {
                        declarationText = File.ReadAllText(declarationFilePath, Encoding.UTF8);
                    }
                    else
                    {
                        // Fallback text if file not found
                        declarationText = "A nyilatkozat fájl nem található.\n\nKérjük, helyezze el a 'nyilatkozat.txt' fájlt a Resources mappába.\n\nFájl helye: " + declarationFilePath;
                        Console.WriteLine($"[DECLARATION] Warning: nyilatkozat.txt not found at {declarationFilePath}");
                    }
                }
                catch (Exception ex)
                {
                    declarationText = "Hiba a nyilatkozat betöltésekor: " + ex.Message;
                    Console.WriteLine($"[DECLARATION] Error loading declaration file: {ex.Message}");
                }
                
                // Add current date/time at the end
                declarationText += "\n\nDátum: " + DateTime.Now.ToString("yyyy.MM.dd HH:mm");

                // Scrollable text area
                RichTextBox textBox = new RichTextBox
                {
                    Text = declarationText,
                    Location = new Point(20, 55),
                    Size = new Size(645, 350),
                    ReadOnly = true,
                    BackColor = Color.FromArgb(45, 45, 50),
                    ForeColor = Color.White,
                    Font = new Font("Segoe UI", 10),
                    BorderStyle = BorderStyle.None,
                    ScrollBars = RichTextBoxScrollBars.Vertical
                };

                // Checkbox for acceptance
                CheckBox acceptCheckBox = new CheckBox
                {
                    Text = "Elolvastam és elfogadom a fenti nyilatkozatot",
                    ForeColor = Color.White,
                    Font = new Font("Segoe UI", 10),
                    Location = new Point(20, 420),
                    Size = new Size(400, 25),
                    Checked = false
                };

                // Accept button
                Button acceptButton = new Button
                {
                    Text = "Elfogadom",
                    DialogResult = DialogResult.OK,
                    Location = new Point(460, 460),
                    Size = new Size(100, 40),
                    BackColor = Color.FromArgb(50, 150, 50),
                    ForeColor = Color.White,
                    FlatStyle = FlatStyle.Flat,
                    Enabled = false
                };
                acceptButton.FlatAppearance.BorderSize = 0;

                // Cancel button
                Button cancelButton = new Button
                {
                    Text = "Elutasítom",
                    DialogResult = DialogResult.Cancel,
                    Location = new Point(570, 460),
                    Size = new Size(100, 40),
                    BackColor = Color.FromArgb(150, 50, 50),
                    ForeColor = Color.White,
                    FlatStyle = FlatStyle.Flat
                };
                cancelButton.FlatAppearance.BorderSize = 0;

                // Enable accept button only when checkbox is checked
                acceptCheckBox.CheckedChanged += (s, e) =>
                {
                    acceptButton.Enabled = acceptCheckBox.Checked;
                    acceptButton.BackColor = acceptCheckBox.Checked 
                        ? Color.FromArgb(50, 180, 50) 
                        : Color.FromArgb(50, 150, 50);
                };

                declarationForm.Controls.AddRange(new Control[] { titleLabel, textBox, acceptCheckBox, acceptButton, cancelButton });
                declarationForm.AcceptButton = acceptButton;
                declarationForm.CancelButton = cancelButton;

                DialogResult result = declarationForm.ShowDialog();
                return result == DialogResult.OK && acceptCheckBox.Checked;
            }
        }

        protected override CreateParams CreateParams
        {
            get
            {
                // Alt+F4 és más bezárási műveletek letiltása
                CreateParams cp = base.CreateParams;
                cp.ClassStyle |= 0x200; // CS_NOCLOSE
                return cp;
            }
        }

        // Model osztályok
        private class ServerStatus
        {
            public bool Locked { get; set; }
            public string? Message { get; set; }
            public int? RemainingSeconds { get; set; }
            public bool IsCompetitionMode { get; set; }
        }

        private class StartSessionResponse
        {
            public bool success { get; set; }
            public int remainingTime { get; set; }
            public string? error { get; set; }
        }

        private class KeycloakTokenResponse
        {
            public string? access_token { get; set; }
            public string? refresh_token { get; set; }
            public int expires_in { get; set; }
        }

        // Notification Overlay ablak
        private class NotificationOverlay : Form
        {
            private Label _messageLabel;

            public NotificationOverlay()
            {
                this.FormBorderStyle = FormBorderStyle.None;
                this.ShowInTaskbar = false;
                this.TopMost = true;
                this.Size = new Size(600, 60);
                this.BackColor = Color.DarkRed;
                this.Opacity = 0.85;
                this.StartPosition = FormStartPosition.Manual;
                
                _messageLabel = new Label
                {
                    Dock = DockStyle.Fill,
                    TextAlign = ContentAlignment.MiddleCenter,
                    ForeColor = Color.White,
                    Font = new Font("Segoe UI", 16, FontStyle.Bold)
                };
                this.Controls.Add(_messageLabel);
            }

            public void ShowMessage(string message)
            {
                _messageLabel.Text = message;
                
                // Képernyő tetejére, középre
                Rectangle screen = Screen.PrimaryScreen?.Bounds ?? Screen.AllScreens[0].Bounds;
                this.Location = new Point((screen.Width - this.Width) / 2, 0);
                
                // Megjelenítés aktiválás nélkül
                ShowWindow(this.Handle, 4); // SW_SHOWNOACTIVATE = 4
            }

            protected override bool ShowWithoutActivation => true;

            protected override CreateParams CreateParams
            {
                get
                {
                    CreateParams cp = base.CreateParams;
                    cp.ExStyle |= 0x00000080; // WS_EX_TOOLWINDOW
                    cp.ExStyle |= 0x00000008; // WS_EX_TOPMOST
                    cp.ExStyle |= 0x08000000; // WS_EX_NOACTIVATE
                    cp.ExStyle |= 0x00000020; // WS_EX_TRANSPARENT (Click-through)
                    return cp;
                }
            }

            [System.Runtime.InteropServices.DllImport("user32.dll")]
            private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }

        private void SetUserWallpaper(string username, string? omNumber)
        {
            try 
            {
                Rectangle screenBounds = Screen.PrimaryScreen?.Bounds ?? Screen.AllScreens[0].Bounds;
                int width = screenBounds.Width;
                int height = screenBounds.Height;
                
                using (Bitmap bmp = new Bitmap(width, height))
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                    g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                    // 1. Background Gradient (Dark Blue/Purple aesthetic)
                    using (var brush = new System.Drawing.Drawing2D.LinearGradientBrush(
                        new Rectangle(0, 0, width, height), 
                        Color.FromArgb(10, 10, 30), 
                        Color.FromArgb(30, 0, 40), 
                        45F))
                    {
                        g.FillRectangle(brush, 0, 0, width, height);
                    }
                    
                    // 2. Load Logo
                    string logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "esportlogo.png");
                    if (File.Exists(logoPath))
                    {
                        try 
                        {
                            using (Image logo = Image.FromFile(logoPath))
                            {
                                int logoW = 300;
                                int logoH = (int)((float)logo.Height / logo.Width * logoW);
                                g.DrawImage(logo, (width - logoW) / 2, (height / 2) - 250, logoW, logoH);
                            }
                        }
                        catch { }
                    }
                    else
                    {
                         // Fallback Text
                        using (Font titleFont = new Font("Segoe UI", 72, FontStyle.Bold))
                        using (Brush titleBrush = new SolidBrush(Color.FromArgb(50, 50, 60)))
                        {
                            string watermark = "Esport Manager";
                            SizeF watermarkSize = g.MeasureString(watermark, titleFont);
                            g.DrawString(watermark, titleFont, titleBrush, (width - watermarkSize.Width) / 2, (height / 2) - 150);
                        }
                    }

                    // 3. User Info
                    using (Font font = new Font("Segoe UI", 28, FontStyle.Bold))
                    using (Brush brush = new SolidBrush(Color.White))
                    {
                        string text = $"Utolsó bejelentkezés: {username}";
                        if (!string.IsNullOrEmpty(omNumber))
                        {
                            text += $"\nOM: {omNumber}";
                        }
                        
                        SizeF textSize = g.MeasureString(text, font);
                        g.DrawString(text, font, brush, (width - textSize.Width) / 2, (height / 2) + 100);
                    }
                    
                    string tempPath = Path.Combine(Path.GetTempPath(), "esport_wallpaper.png");
                    bmp.Save(tempPath, System.Drawing.Imaging.ImageFormat.Png);
                    
                    SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, tempPath, SPIF_UPDATEINIFILE | SPIF_SENDWININICHANGE);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WALLPAPER] Error setting wallpaper: {ex.Message}");
            }
        }
        private void UpdateAdminMenu()
        {
            if (_contextMenuStrip.InvokeRequired)
            {
                _contextMenuStrip.Invoke(new Action(UpdateAdminMenu));
                return;
            }

            // Remove existing admin items
            var itemsToRemove = _contextMenuStrip.Items.Find("adminToolItem", true);
            foreach (var item in itemsToRemove)
            {
                _contextMenuStrip.Items.Remove(item);
            }
            
            var separator = _contextMenuStrip.Items.Find("adminSeparator", true).FirstOrDefault();
            if (separator != null) _contextMenuStrip.Items.Remove(separator);

            if (!_isAdmin) return;

            // Add Admin Tools
            _contextMenuStrip.Items.Add(new ToolStripSeparator { Name = "adminSeparator" });

            var adminRoot = new ToolStripMenuItem("Admin Eszközök");
            adminRoot.Name = "adminToolItem";

            bool isAutoStart = IsAutoStartEnabled();
            
            var autoStartItem = new ToolStripMenuItem(isAutoStart ? "Automatikus indítás KIKAPCSOLÁSA" : "Automatikus indítás BEKAPCSOLÁSA");
            autoStartItem.Click += (s, e) => 
            {
                SetAutoStart(!isAutoStart);
            };

            adminRoot.DropDownItems.Add(autoStartItem);
            _contextMenuStrip.Items.Add(adminRoot);
        }

        private bool IsAutoStartEnabled()
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "schtasks",
                    Arguments = "/query /TN \"EsportManagerWatchdog\"",
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                using (var p = Process.Start(psi))
                {
                    if (p != null)
                    {
                        p.WaitForExit();
                        return p.ExitCode == 0;
                    }
                }
            }
            catch { }
            return false;
        }

        private void SetAutoStart(bool enable)
        {
            try
            {
                string scriptName = enable ? "install_fast_startup.ps1" : "remove_startup.ps1";
                string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Scripts", scriptName);
                
                if (!File.Exists(scriptPath))
                {
                    MessageBox.Show($"Nem található a script: {scriptName}", "Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // Run PowerShell script as Admin with NonInteractive flag
                var psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{scriptPath}\" -NonInteractive",
                    UseShellExecute = true,
                    Verb = "runas", // Request elevation
                    WindowStyle = ProcessWindowStyle.Normal // Show window so user sees progress
                };

                Process.Start(psi);
                
                // Update menu after a short delay (wait for script)
                Task.Delay(2000).ContinueWith(t => UpdateAdminMenu());
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Hiba a beállítás mentésekor: {ex.Message}", "Hiba", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void SetTaskMgrEnabled(bool enabled)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Policies\System"))
                {
                    if (key != null)
                    {
                        if (enabled)
                        {
                            key.DeleteValue("DisableTaskMgr", false);
                        }
                        else
                        {
                            key.SetValue("DisableTaskMgr", 1, RegistryValueKind.DWord);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[REGISTRY] Failed to set TaskMgr status (enabled={enabled}): {ex.Message}");
            }
        }
    }
}
