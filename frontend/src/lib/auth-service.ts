import Keycloak from 'keycloak-js';
import { keycloakConfig, API_URL } from '../config';
import { store } from '../store';
import { setCredentials, clearCredentials, setError } from '../store/slices/authSlice';
import type { User, ApiResponse } from '../types';
import { toast } from 'sonner';

class AuthService {
    private static instance: AuthService;
    private _keycloak: Keycloak | null = null;
    private _initialized = false;
    private _tokenRefreshTimer: number | null = null;

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public get keycloak(): Keycloak | null {
        return this._keycloak;
    }

    public async init(): Promise<boolean> {
        if (this._initialized && this._keycloak) {
            console.log('Keycloak already initialized, returning current state');
            return !!this._keycloak.authenticated;
        }

        console.log('Initializing Keycloak with config:', keycloakConfig);
        this._keycloak = new Keycloak(keycloakConfig);

        try {
            const authenticated = await this._keycloak.init({
                onLoad: 'check-sso',
                checkLoginIframe: false,
                enableLogging: true,
                flow: 'standard'
            });

            this._initialized = true;
            console.log('Keycloak initialized successfully. Authenticated:', authenticated);

            if (authenticated) {
                console.log('User is authenticated, setting up token refresh and syncing with backend');
                this.setupTokenRefresh();
                await this.syncUserWithBackend();
            } else {
                console.log('User is Nincs bejelentkezve!');
                store.dispatch(clearCredentials());
            }

            return authenticated;
        } catch (error) {
            console.error('Keycloak initialization failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize authentication service';
            store.dispatch(setError(errorMessage));
            this._initialized = false;
            return false;
        }
    }

    public async login(): Promise<void> {
        if (!this._keycloak) {
            console.error('Keycloak not initialized');
            throw new Error('Authentication service not initialized');
        }

        try {
            console.log('Redirecting to login page');
            await this._keycloak.login({
                redirectUri: window.location.origin
            });
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    public async logout(): Promise<void> {
        if (!this._keycloak) {
            console.error('Keycloak not initialized');
            return;
        }

        try {
            console.log('Logging out');
            this.clearTokenRefreshTimer();
            await this._keycloak.logout({
                redirectUri: window.location.origin
            });
            store.dispatch(clearCredentials());
        } catch (error) {
            console.error('Logout failed:', error);
            // Still clear credentials even if logout fails
            store.dispatch(clearCredentials());
            throw error;
        }
    }

    public async getToken(): Promise<string | null> {
        if (!this._keycloak) {
            console.warn('Keycloak not initialized');
            return null;
        }

        if (!this._keycloak.authenticated) {
            console.warn('User Nincs bejelentkezve!');
            return null;
        }

        try {
            // Try to refresh token if it expires in less than 30 seconds
            const refreshed = await this._keycloak.updateToken(30);
            if (refreshed) {
                console.log('Token was refreshed');
                // Update token in store
                if (this._keycloak.token) {
                    const state = store.getState();
                    if (state.auth.user) {
                        store.dispatch(setCredentials({
                            user: state.auth.user,
                            token: this._keycloak.token,
                            refreshToken: this._keycloak.refreshToken
                        }));
                    }
                }
            }
            return this._keycloak.token || null;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            toast.error('A munkamenet lejárt. Kérjük, jelentkezz be újra.', {
                duration: 5000,
            });
            // Token refresh failed, logout user
            await this.logout();
            return null;
        }
    }

    private setupTokenRefresh() {
        if (!this._keycloak) return;

        // Clear any existing timer
        this.clearTokenRefreshTimer();

        // Set up token expiration handler
        this._keycloak.onTokenExpired = () => {
            console.log('Token expired, attempting to refresh');
            toast.warning('A munkamenet hamarosan lejár, frissítés...', {
                duration: 3000,
            });
            this._keycloak?.updateToken(30)
                .then((refreshed) => {
                    if (refreshed) {
                        console.log('Token refreshed successfully');
                        toast.success('Munkamenet frissítve', {
                            duration: 2000,
                        });
                        // Re-sync user data with new token
                        this.syncUserWithBackend();
                    }
                })
                .catch((error) => {
                    console.error('Token refresh failed:', error);
                    toast.error('A munkamenet lejárt. Kérjük, jelentkezz be újra.', {
                        duration: 5000,
                    });
                    this.logout();
                });
        };

        // Also set up a periodic check every 5 minutes
        this._tokenRefreshTimer = setInterval(() => {
            if (this._keycloak?.authenticated) {
                this._keycloak.updateToken(70)
                    .then((refreshed) => {
                        if (refreshed) {
                            console.log('Token refreshed via periodic check');
                            // Update token in store
                            if (this._keycloak?.token) {
                                const state = store.getState();
                                if (state.auth.user) {
                                    store.dispatch(setCredentials({
                                        user: state.auth.user,
                                        token: this._keycloak.token,
                                        refreshToken: this._keycloak.refreshToken
                                    }));
                                }
                            }
                        }
                    })
                    .catch((error) => {
                        console.error('Periodic token refresh failed:', error);
                        toast.error('A munkamenet lejárt. Kérjük, jelentkezz be újra.', {
                            duration: 5000,
                        });
                        this.logout();
                    });
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    private clearTokenRefreshTimer() {
        if (this._tokenRefreshTimer) {
            clearInterval(this._tokenRefreshTimer);
            this._tokenRefreshTimer = null;
        }
    }

    private async syncUserWithBackend(): Promise<void> {
        if (!this._keycloak?.token) {
            console.warn('No token available for sync');
            return;
        }

        try {
            console.log('Syncing user with backend at:', `${API_URL}/auth/sync`);

            const response = await fetch(`${API_URL}/auth/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._keycloak.token}`
                }
            });

            if (response.status === 401) {
                console.error('Unauthorized during sync - token may be expired');
                toast.error('A munkamenet lejárt. Kérjük, jelentkezz be újra.', {
                    duration: 5000,
                });
                await this.logout();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to sync user. Status:', response.status, 'Response:', errorText);
                throw new Error(`Sync failed with status ${response.status}`);
            }

            const data: ApiResponse<User> = await response.json();

            if (data.success && data.data) {
                console.log('User synced successfully:', data.data);
                store.dispatch(setCredentials({
                    user: data.data,
                    token: this._keycloak.token,
                    refreshToken: this._keycloak.refreshToken
                }));
            } else {
                console.error('Sync response was not successful:', data);
                throw new Error('Sync response indicated failure');
            }
        } catch (error) {
            console.error('Error syncing user with backend:', error);
            // Don't throw - allow the app to continue even if sync fails
            // The user is still authenticated with Keycloak
            store.dispatch(setError('Failed to sync user data. Some features may be limited.'));
        }
    }
}

export const authService = AuthService.getInstance();
