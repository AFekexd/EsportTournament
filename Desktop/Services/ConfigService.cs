using System;
using System.IO;
using System.Text.Json;

namespace EsportManager.Services
{
    public class ConfigService
    {
        private static AppConfig _config;

        public static AppConfig Current
        {
            get
            {
                if (_config == null)
                {
                    Load();
                }
                return _config;
            }
        }

        public static void Load()
        {
            try
            {
                var path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "appsettings.json");
                if (!File.Exists(path))
                {
                    // Fallback to example if exists, or defaults
                    path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "appsettings.example.json");
                }

                if (File.Exists(path))
                {
                    var json = File.ReadAllText(path);
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        ReadCommentHandling = JsonCommentHandling.Skip
                    };
                    _config = JsonSerializer.Deserialize<AppConfig>(json, options);
                }
                else
                {
                    _config = new AppConfig(); // Defaults
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CONFIG] Error loading config: {ex.Message}");
                _config = new AppConfig();
            }
        }
    }

    public class AppConfig
    {
        public KeycloakConfig Keycloak { get; set; } = new();
        public ApiConfig Api { get; set; } = new();
        public SecurityConfig Security { get; set; } = new();
        public SessionConfig Session { get; set; } = new();
    }

    public class KeycloakConfig
    {
        public string LoginUrl { get; set; } = "https://keycloak.pollak.info/realms/master/protocol/openid-connect/token";
        public string ClientId { get; set; } = "esportdesktop";
        public string Realm { get; set; } = "master";
    }

    public class ApiConfig
    {
        public string BaseUrl { get; set; } = "https://esport-backend.pollak.info/api";
        public string StatusUrl { get; set; } = "https://esport-backend.pollak.info/api/kiosk/status/";
        public string StartSessionUrl { get; set; } = "https://esport-backend.pollak.info/api/kiosk/session/start";
        public string EndSessionUrl { get; set; } = "https://esport-backend.pollak.info/api/kiosk/session/end";
    }

    public class SecurityConfig
    {
        public string FailSafePassword { get; set; } = "admin123";
        public bool DisableTaskManager { get; set; } = true;
    }

    public class SessionConfig
    {
        public int DefaultDurationSeconds { get; set; } = 3600;
        public int[] WarningIntervals { get; set; } = new[] { 900, 600, 300, 60 };
        public int MaxPauseDurationSeconds { get; set; } = 300;
    }
}
