using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace EsportManager.Services
{
    public interface IHealthCheckService
    {
        Task<HealthStatus> CheckKeycloakHealthAsync();
        Task<HealthStatus> CheckBackendHealthAsync();
        Task<SystemHealth> GetSystemHealthAsync();
        event EventHandler<HealthStatus>? HealthStatusChanged;
    }

    public class HealthStatus
    {
        public string ServiceName { get; set; } = string.Empty;
        public bool IsHealthy { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CheckedAt { get; set; }
        public long ResponseTimeMs { get; set; }
    }

    public class SystemHealth
    {
        public HealthStatus KeycloakHealth { get; set; } = new();
        public HealthStatus BackendHealth { get; set; } = new();
        public bool IsFullyOperational => KeycloakHealth.IsHealthy && BackendHealth.IsHealthy;
    }

    public class HealthCheckService : IHealthCheckService
    {
        private readonly HttpClient _httpClient;
        private readonly string _keycloakUrl;
        private readonly string _backendUrl;

        public event EventHandler<HealthStatus>? HealthStatusChanged;

        public HealthCheckService(HttpClient httpClient, string keycloakUrl, string backendUrl)
        {
            _httpClient = httpClient;
            _keycloakUrl = keycloakUrl;
            _backendUrl = backendUrl;
        }

        public async Task<HealthStatus> CheckKeycloakHealthAsync()
        {
            var status = new HealthStatus
            {
                ServiceName = "Keycloak",
                CheckedAt = DateTime.Now
            };

            var startTime = DateTime.Now;
            try
            {
                var response = await _httpClient.GetAsync(_keycloakUrl, HttpCompletionOption.ResponseHeadersRead);
                status.ResponseTimeMs = (long)(DateTime.Now - startTime).TotalMilliseconds;
                status.IsHealthy = response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.Unauthorized;
            }
            catch (Exception ex)
            {
                status.IsHealthy = false;
                status.ErrorMessage = ex.Message;
                status.ResponseTimeMs = (long)(DateTime.Now - startTime).TotalMilliseconds;
            }

            HealthStatusChanged?.Invoke(this, status);
            return status;
        }

        public async Task<HealthStatus> CheckBackendHealthAsync()
        {
            var status = new HealthStatus
            {
                ServiceName = "Backend API",
                CheckedAt = DateTime.Now
            };

            var startTime = DateTime.Now;
            try
            {
                var response = await _httpClient.GetAsync($"{_backendUrl}/health", HttpCompletionOption.ResponseHeadersRead);
                status.ResponseTimeMs = (long)(DateTime.Now - startTime).TotalMilliseconds;
                status.IsHealthy = response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                status.IsHealthy = false;
                status.ErrorMessage = ex.Message;
                status.ResponseTimeMs = (long)(DateTime.Now - startTime).TotalMilliseconds;
            }

            HealthStatusChanged?.Invoke(this, status);
            return status;
        }

        public async Task<SystemHealth> GetSystemHealthAsync()
        {
            var keycloakTask = CheckKeycloakHealthAsync();
            var backendTask = CheckBackendHealthAsync();

            await Task.WhenAll(keycloakTask, backendTask);

            return new SystemHealth
            {
                KeycloakHealth = await keycloakTask,
                BackendHealth = await backendTask
            };
        }
    }
}
