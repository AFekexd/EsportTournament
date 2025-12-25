using System;
using System.IO;
using System.Text.Json;

namespace EsportManager.Services
{
    public enum LockState
    {
        Locked,
        LoginPrompt,
        Authenticating,
        Unlocked,
        SessionActive,
        SessionPaused,
        SessionExpiring,
        LoggingOut
    }

    public interface IStateManager
    {
        LockState CurrentState { get; }
        void TransitionTo(LockState newState);
        bool CanTransitionTo(LockState newState);
        void SaveState();
        void LoadState();
        event EventHandler<StateTransitionEventArgs>? StateChanged;
    }

    public class StateTransitionEventArgs : EventArgs
    {
        public LockState PreviousState { get; set; }
        public LockState NewState { get; set; }
        public DateTime TransitionTime { get; set; }
    }

    public class StateManager : IStateManager
    {
        private LockState _currentState;
        private readonly string _stateFilePath;
        private readonly ITelemetryService? _telemetry;

        public LockState CurrentState => _currentState;

        public event EventHandler<StateTransitionEventArgs>? StateChanged;

        public StateManager(ITelemetryService? telemetry = null)
        {
            _telemetry = telemetry;
            var stateDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "EsportManager"
            );
            Directory.CreateDirectory(stateDirectory);
            _stateFilePath = Path.Combine(stateDirectory, "state.json");
            
            _currentState = LockState.Locked;
        }

        public void TransitionTo(LockState newState)
        {
            if (!CanTransitionTo(newState))
            {
                throw new InvalidOperationException($"Cannot transition from {_currentState} to {newState}");
            }

            var previousState = _currentState;
            _currentState = newState;

            var eventArgs = new StateTransitionEventArgs
            {
                PreviousState = previousState,
                NewState = newState,
                TransitionTime = DateTime.Now
            };

            Console.WriteLine($"[STATE] {previousState} → {newState}");
            
            _telemetry?.TrackEvent("StateTransition", new System.Collections.Generic.Dictionary<string, string>
            {
                { "PreviousState", previousState.ToString() },
                { "NewState", newState.ToString() }
            });

            StateChanged?.Invoke(this, eventArgs);
            SaveState();
        }

        public bool CanTransitionTo(LockState newState)
        {
            // Define valid state transitions
            return (_currentState, newState) switch
            {
                // From Locked
                (LockState.Locked, LockState.LoginPrompt) => true,
                
                // From LoginPrompt
                (LockState.LoginPrompt, LockState.Locked) => true,
                (LockState.LoginPrompt, LockState.Authenticating) => true,
                
                // From Authenticating
                (LockState.Authenticating, LockState.Locked) => true,
                (LockState.Authenticating, LockState.Unlocked) => true,
                (LockState.Authenticating, LockState.LoginPrompt) => true,
                
                // From Unlocked
                (LockState.Unlocked, LockState.SessionActive) => true,
                (LockState.Unlocked, LockState.Locked) => true,
                
                // From SessionActive
                (LockState.SessionActive, LockState.SessionPaused) => true,
                (LockState.SessionActive, LockState.SessionExpiring) => true,
                (LockState.SessionActive, LockState.LoggingOut) => true,
                (LockState.SessionActive, LockState.Locked) => true,
                
                // From SessionPaused
                (LockState.SessionPaused, LockState.SessionActive) => true,
                (LockState.SessionPaused, LockState.LoggingOut) => true,
                (LockState.SessionPaused, LockState.Locked) => true,
                
                // From SessionExpiring
                (LockState.SessionExpiring, LockState.SessionActive) => true,
                (LockState.SessionExpiring, LockState.LoggingOut) => true,
                (LockState.SessionExpiring, LockState.Locked) => true,
                
                // From LoggingOut
                (LockState.LoggingOut, LockState.Locked) => true,
                
                // Allow same state (no-op)
                _ when _currentState == newState => true,
                
                _ => false
            };
        }

        public void SaveState()
        {
            try
            {
                var state = new
                {
                    State = _currentState.ToString(),
                    Timestamp = DateTime.Now,
                    MachineName = Environment.MachineName
                };

                var json = JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_stateFilePath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[STATE] Failed to save state: {ex.Message}");
                _telemetry?.TrackException(ex);
            }
        }

        public void LoadState()
        {
            try
            {
                if (File.Exists(_stateFilePath))
                {
                    var json = File.ReadAllText(_stateFilePath);
                    var state = JsonSerializer.Deserialize<StateData>(json);
                    
                    if (state != null && Enum.TryParse<LockState>(state.State, out var loadedState))
                    {
                        // Only restore certain states, always start locked for security
                        if (loadedState == LockState.SessionActive || loadedState == LockState.SessionPaused)
                        {
                            Console.WriteLine($"[STATE] Previous state was {loadedState}, but starting as Locked for security");
                        }
                        
                        _currentState = LockState.Locked;
                        Console.WriteLine($"[STATE] Loaded state from file: {_currentState}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[STATE] Failed to load state: {ex.Message}");
                _telemetry?.TrackException(ex);
                _currentState = LockState.Locked;
            }
        }

        private class StateData
        {
            public string State { get; set; } = string.Empty;
            public DateTime Timestamp { get; set; }
            public string MachineName { get; set; } = string.Empty;
        }
    }
}
