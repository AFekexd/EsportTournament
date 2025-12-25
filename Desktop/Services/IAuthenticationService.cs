using System.Threading.Tasks;

namespace EsportManager.Services
{
    public interface IAuthenticationService
    {
        Task<AuthResult> AuthenticateAsync(string username, string password);
        Task<bool> ValidateOfflineCredentialsAsync(string username, string password);
        Task CacheCredentialsAsync(string username, string passwordHash);
    }

    public class AuthResult
    {
        public bool Success { get; set; }
        public string? UserId { get; set; }
        public string? Username { get; set; }
        public string? AccessToken { get; set; }
        public string? OmNumber { get; set; }
        public string? ErrorMessage { get; set; }
        public bool IsOfflineMode { get; set; }
    }
}
