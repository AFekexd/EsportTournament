namespace EsportManager.Services
{
    public interface ILockService
    {
        void Lock();
        void Unlock();
        bool IsLocked { get; }
        void DisableTaskManager();
        void EnableTaskManager();
    }
}
