using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace EsportManager.Services
{
    public interface IOfflineModeService
    {
        Task<bool> CacheUserCredentialsAsync(string username, string password);
        Task<bool> ValidateOfflineCredentialsAsync(string username, string password);
        Task<OfflineSessionInfo?> GetOfflineSessionInfoAsync(string username);
        bool IsOfflineModeAvailable(string username);
        void ClearCache();
    }

    public class OfflineSessionInfo
    {
        public string Username { get; set; } = string.Empty;
        public int OfflineTimeLimit { get; set; } = 1800; // 30 minutes default
        public DateTime LastOnlineLogin { get; set; }
    }

    public class OfflineModeService : IOfflineModeService
    {
        private readonly string _cacheDirectory;
        private readonly byte[] _entropy;

        public OfflineModeService()
        {
            _cacheDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "EsportManager",
                "OfflineCache"
            );
            Directory.CreateDirectory(_cacheDirectory);

            // Machine-specific entropy for encryption
            _entropy = Encoding.UTF8.GetBytes(Environment.MachineName + Environment.UserName);
        }

        public async Task<bool> CacheUserCredentialsAsync(string username, string password)
        {
            try
            {
                var hash = HashPassword(password);
                var cacheData = new CachedCredential
                {
                    Username = username,
                    PasswordHash = hash,
                    CachedAt = DateTime.Now,
                    LastOnlineLogin = DateTime.Now
                };

                var json = JsonSerializer.Serialize(cacheData);
                var encrypted = ProtectData(json);
                
                var filePath = GetCacheFilePath(username);
                await File.WriteAllBytesAsync(filePath, encrypted);

                Console.WriteLine($"[OFFLINE] Cached credentials for {username}");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OFFLINE] Failed to cache credentials: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> ValidateOfflineCredentialsAsync(string username, string password)
        {
            try
            {
                var filePath = GetCacheFilePath(username);
                if (!File.Exists(filePath))
                {
                    Console.WriteLine($"[OFFLINE] No cached credentials for {username}");
                    return false;
                }

                var encrypted = await File.ReadAllBytesAsync(filePath);
                var json = UnprotectData(encrypted);
                var cacheData = JsonSerializer.Deserialize<CachedCredential>(json);

                if (cacheData == null)
                {
                    return false;
                }

                // Check if cache is not too old (7 days)
                if ((DateTime.Now - cacheData.CachedAt).TotalDays > 7)
                {
                    Console.WriteLine($"[OFFLINE] Cached credentials expired for {username}");
                    return false;
                }

                var inputHash = HashPassword(password);
                var isValid = cacheData.PasswordHash == inputHash;

                Console.WriteLine($"[OFFLINE] Offline validation for {username}: {isValid}");
                return isValid;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OFFLINE] Failed to validate offline credentials: {ex.Message}");
                return false;
            }
        }

        public async Task<OfflineSessionInfo?> GetOfflineSessionInfoAsync(string username)
        {
            try
            {
                var filePath = GetCacheFilePath(username);
                if (!File.Exists(filePath))
                {
                    return null;
                }

                var encrypted = await File.ReadAllBytesAsync(filePath);
                var json = UnprotectData(encrypted);
                var cacheData = JsonSerializer.Deserialize<CachedCredential>(json);

                if (cacheData == null)
                {
                    return null;
                }

                return new OfflineSessionInfo
                {
                    Username = cacheData.Username,
                    OfflineTimeLimit = 1800, // 30 minutes
                    LastOnlineLogin = cacheData.LastOnlineLogin
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OFFLINE] Failed to get offline session info: {ex.Message}");
                return null;
            }
        }

        public bool IsOfflineModeAvailable(string username)
        {
            var filePath = GetCacheFilePath(username);
            if (!File.Exists(filePath))
            {
                return false;
            }

            try
            {
                var fileInfo = new FileInfo(filePath);
                // Cache available if file exists and is less than 7 days old
                return (DateTime.Now - fileInfo.LastWriteTime).TotalDays <= 7;
            }
            catch
            {
                return false;
            }
        }

        public void ClearCache()
        {
            try
            {
                if (Directory.Exists(_cacheDirectory))
                {
                    Directory.Delete(_cacheDirectory, true);
                    Directory.CreateDirectory(_cacheDirectory);
                    Console.WriteLine("[OFFLINE] Cache cleared");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OFFLINE] Failed to clear cache: {ex.Message}");
            }
        }

        private string GetCacheFilePath(string username)
        {
            var safeUsername = string.Join("_", username.Split(Path.GetInvalidFileNameChars()));
            return Path.Combine(_cacheDirectory, $"{safeUsername}.cache");
        }

        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password + Environment.MachineName);
                var hash = sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

        private byte[] ProtectData(string data)
        {
            var dataBytes = Encoding.UTF8.GetBytes(data);
            return ProtectedData.Protect(dataBytes, _entropy, DataProtectionScope.CurrentUser);
        }

        private string UnprotectData(byte[] encryptedData)
        {
            var dataBytes = ProtectedData.Unprotect(encryptedData, _entropy, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(dataBytes);
        }

        private class CachedCredential
        {
            public string Username { get; set; } = string.Empty;
            public string PasswordHash { get; set; } = string.Empty;
            public DateTime CachedAt { get; set; }
            public DateTime LastOnlineLogin { get; set; }
        }
    }
}
