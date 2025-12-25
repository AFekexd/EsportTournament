using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.Json;

namespace EsportManager.Services
{
    public interface ITelemetryService
    {
        void TrackEvent(string eventName, Dictionary<string, string>? properties = null);
        void TrackException(Exception exception, Dictionary<string, string>? properties = null);
        void TrackMetric(string metricName, double value, Dictionary<string, string>? properties = null);
        void TrackPerformance(string operationName, TimeSpan duration);
    }

    public class TelemetryService : ITelemetryService
    {
        private readonly string _logFilePath;
        private readonly bool _enableConsoleLogging;

        public TelemetryService(string? logDirectory = null, bool enableConsoleLogging = true)
        {
            _enableConsoleLogging = enableConsoleLogging;
            
            if (string.IsNullOrEmpty(logDirectory))
            {
                logDirectory = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "EsportManager",
                    "Logs"
                );
            }

            Directory.CreateDirectory(logDirectory);
            _logFilePath = Path.Combine(logDirectory, $"telemetry_{DateTime.Now:yyyyMMdd}.log");
        }

        public void TrackEvent(string eventName, Dictionary<string, string>? properties = null)
        {
            var telemetryData = new
            {
                Type = "Event",
                Timestamp = DateTime.UtcNow,
                EventName = eventName,
                Properties = properties ?? new Dictionary<string, string>(),
                MachineName = Environment.MachineName,
                UserName = Environment.UserName
            };

            LogTelemetry(telemetryData);
        }

        public void TrackException(Exception exception, Dictionary<string, string>? properties = null)
        {
            var telemetryData = new
            {
                Type = "Exception",
                Timestamp = DateTime.UtcNow,
                ExceptionType = exception.GetType().Name,
                Message = exception.Message,
                StackTrace = exception.StackTrace,
                Properties = properties ?? new Dictionary<string, string>(),
                MachineName = Environment.MachineName,
                UserName = Environment.UserName
            };

            LogTelemetry(telemetryData);
            
            if (_enableConsoleLogging)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[EXCEPTION] {exception.GetType().Name}: {exception.Message}");
                Console.ResetColor();
            }
        }

        public void TrackMetric(string metricName, double value, Dictionary<string, string>? properties = null)
        {
            var telemetryData = new
            {
                Type = "Metric",
                Timestamp = DateTime.UtcNow,
                MetricName = metricName,
                Value = value,
                Properties = properties ?? new Dictionary<string, string>(),
                MachineName = Environment.MachineName
            };

            LogTelemetry(telemetryData);
        }

        public void TrackPerformance(string operationName, TimeSpan duration)
        {
            var telemetryData = new
            {
                Type = "Performance",
                Timestamp = DateTime.UtcNow,
                OperationName = operationName,
                DurationMs = duration.TotalMilliseconds,
                MachineName = Environment.MachineName
            };

            LogTelemetry(telemetryData);

            if (_enableConsoleLogging && duration.TotalMilliseconds > 1000)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[PERFORMANCE] {operationName} took {duration.TotalMilliseconds:F2}ms");
                Console.ResetColor();
            }
        }

        private void LogTelemetry(object telemetryData)
        {
            try
            {
                var json = JsonSerializer.Serialize(telemetryData, new JsonSerializerOptions 
                { 
                    WriteIndented = false 
                });

                File.AppendAllText(_logFilePath, json + Environment.NewLine);

                if (_enableConsoleLogging)
                {
                    var prop = telemetryData.GetType().GetProperty("Type");
                    var type = prop?.GetValue(telemetryData)?.ToString() ?? "Unknown";
                    
                    Console.ForegroundColor = type switch
                    {
                        "Event" => ConsoleColor.Cyan,
                        "Exception" => ConsoleColor.Red,
                        "Metric" => ConsoleColor.Green,
                        "Performance" => ConsoleColor.Yellow,
                        _ => ConsoleColor.White
                    };
                    
                    Console.WriteLine($"[TELEMETRY:{type.ToUpper()}] {json}");
                    Console.ResetColor();
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to log telemetry: {ex.Message}");
            }
        }
    }
}
