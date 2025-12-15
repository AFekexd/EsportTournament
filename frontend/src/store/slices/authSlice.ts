import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type Keycloak from 'keycloak-js';
import type { User } from '../../types';
import { authService } from '../../lib/auth-service';

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    keycloak: Keycloak | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    keycloak: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

// Async thunks
export const initKeycloak = createAsyncThunk(
    'auth/initKeycloak',
    async (_, { rejectWithValue }) => {
        try {
            const authenticated = await authService.init();
            return {
                authenticated,
                keycloak: authService.keycloak,
            };
        } catch (error) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to initialize authentication'
            );
        }
    }
);

export const login = createAsyncThunk(
    'auth/login',
    async (_, { rejectWithValue }) => {
        try {
            await authService.login();
            return true;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to login'
            );
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await authService.logout();
            return true;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to logout'
            );
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: User; token: string | undefined; refreshToken: string | undefined }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token || null;
            state.refreshToken = action.payload.refreshToken || null;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.error = null;
        },
        clearCredentials: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
        setKeycloak: (state, action: PayloadAction<Keycloak | null>) => {
            state.keycloak = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // initKeycloak
            .addCase(initKeycloak.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(initKeycloak.fulfilled, (state, action) => {
                state.keycloak = action.payload.keycloak;
                state.isAuthenticated = action.payload.authenticated;
                state.isLoading = false;
                state.error = null;
            })
            .addCase(initKeycloak.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // login
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // logout
            .addCase(logout.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.refreshToken = null;
                state.isAuthenticated = false;
                state.isLoading = false;
                state.error = null;
            })
            .addCase(logout.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setCredentials, clearCredentials, setLoading, setError, setKeycloak } = authSlice.actions;
export default authSlice.reducer;

