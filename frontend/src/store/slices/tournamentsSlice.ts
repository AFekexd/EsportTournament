import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Tournament, ApiResponse } from '../../types';
import { API_URL } from '../../config';
import type { RootState } from '../index';

interface TournamentsState {
    tournaments: Tournament[];
    currentTournament: Tournament | null;
    isLoading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    } | null;
}

const initialState: TournamentsState = {
    tournaments: [],
    currentTournament: null,
    isLoading: false,
    error: null,
    pagination: null,
};

const getToken = (state: RootState) => state.auth.keycloak?.token;

export const fetchTournaments = createAsyncThunk(
    'tournaments/fetchTournaments',
    async (
        { page = 1, status, gameId }: { page?: number; status?: string; gameId?: string },
        { getState }
    ) => {
        const state = getState() as RootState;
        const token = getToken(state);

        const params = new URLSearchParams({ page: String(page), limit: '12' });
        if (status) params.append('status', status);
        if (gameId) params.append('gameId', gameId);

        const response = await fetch(`${API_URL}/tournaments?${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data: ApiResponse<Tournament[]> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to fetch tournaments');
        }

        return { tournaments: data.data!, pagination: data.pagination! };
    }
);

export const fetchTournament = createAsyncThunk(
    'tournaments/fetchTournament',
    async (id: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        const response = await fetch(`${API_URL}/tournaments/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data: ApiResponse<Tournament> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to fetch tournament');
        }

        return data.data!;
    }
);

export const registerForTournament = createAsyncThunk(
    'tournaments/register',
    async ({ tournamentId, teamId }: { tournamentId: string; teamId: string }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ teamId }),
        });

        const data: ApiResponse<any> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to register for tournament');
        }

        return data.data!;
    }
);

export const unregisterFromTournament = createAsyncThunk(
    'tournaments/unregister',
    async ({ tournamentId, teamId }: { tournamentId: string; teamId: string }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/register/${teamId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        const data: ApiResponse<any> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to unregister from tournament');
        }

        return { tournamentId, teamId };
    }
);

const tournamentsSlice = createSlice({
    name: 'tournaments',
    initialState,
    reducers: {
        clearCurrentTournament: (state) => {
            state.currentTournament = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch tournaments
            .addCase(fetchTournaments.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTournaments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tournaments = action.payload.tournaments;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchTournaments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch tournaments';
            })
            // Fetch single tournament
            .addCase(fetchTournament.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTournament.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentTournament = action.payload;
            })
            .addCase(fetchTournament.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch tournament';
            });
    },
});

export const { clearCurrentTournament, clearError } = tournamentsSlice.actions;
export default tournamentsSlice.reducer;
