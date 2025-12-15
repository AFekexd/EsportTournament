import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import Keycloak from 'keycloak-js';
import type { User, ApiResponse } from '../../types';
import { API_URL, keycloakConfig } from '../../config';

interface AuthState {
    user: User | null;
    keycloak: Keycloak | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    keycloak: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

export const initKeycloak = createAsyncThunk(
    'auth/initKeycloak',
    async (_, { dispatch }) => {
        const keycloak = new Keycloak(keycloakConfig);

        try {
            const authenticated = await keycloak.init({
                onLoad: 'check-sso',
                silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
                checkLoginIframe: false,
                pkceMethod: 'S256',
            });

            dispatch(setKeycloak(keycloak));

            if (authenticated && keycloak.token) {
                // Sync user with backend
                try {
                    const response = await fetch(`${API_URL}/auth/sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${keycloak.token}`,
                        },
                    });

                    const data: ApiResponse<User> = await response.json();

                    if (data.success && data.data) {
                        return data.data;
                    }
                } catch (error) {
                    console.warn('Failed to sync user with backend:', error);
                }
            }

            return null;
        } catch (error) {
            console.warn('Keycloak init error (this is normal if not logged in):', error);
            dispatch(setKeycloak(keycloak));
            return null;
        }
    }
);

export const login = createAsyncThunk(
    'auth/login',
    async (_, { getState }) => {
        const state = getState() as { auth: AuthState };
        const { keycloak } = state.auth;

        if (keycloak) {
            await keycloak.login();
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { getState }) => {
        const state = getState() as { auth: AuthState };
        const { keycloak } = state.auth;

        if (keycloak) {
            await keycloak.logout({ redirectUri: window.location.origin });
        }
    }
);

export const refreshUserData = createAsyncThunk(
    'auth/refreshUserData',
    async (_, { getState }) => {
        const state = getState() as { auth: AuthState };
        const { keycloak } = state.auth;

        if (!keycloak?.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${keycloak.token}`,
            },
        });

        const data: ApiResponse<User> = await response.json();

        if (data.success && data.data) {
            return data.data;
        }

        throw new Error(data.error?.message || 'Failed to fetch user data');
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setKeycloak: (state, action: PayloadAction<Keycloak>) => {
            state.keycloak = action.payload as any;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(initKeycloak.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(initKeycloak.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = !!action.payload;
            })
            .addCase(initKeycloak.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to initialize authentication';
            })
            .addCase(refreshUserData.fulfilled, (state, action) => {
                state.user = action.payload;
            });
    },
});

export const { setKeycloak, clearError } = authSlice.actions;
export default authSlice.reducer;
