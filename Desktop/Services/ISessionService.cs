using System;
using System.Threading.Tasks;

namespace EsportManager.Services
{
    public interface ISessionService
    {
        Task<SessionStartResult> StartSessionAsync(string userId, string username, string machineId);
        Task EndSessionAsync(string machineId);
        Task<bool> PauseSessionAsync();
        Task<bool> ResumeSessionAsync();
        Task<int> GetRemainingTimeAsync();
        bool IsSessionActive { get; }
        bool IsSessionPaused { get; }
        event EventHandler<int>? RemainingTimeChanged;
        event EventHandler? SessionExpired;
    }

    public class SessionStartResult
    {
        public bool Success { get; set; }
        public int RemainingTimeSeconds { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
