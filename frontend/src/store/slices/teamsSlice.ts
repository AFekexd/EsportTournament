import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Team, ApiResponse } from '../../types';
import { API_URL } from '../../config';
import type { RootState } from '../index';

interface TeamsState {
    teams: Team[];
    currentTeam: Team | null;
    myTeams: Team[];
    isLoading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    } | null;
}

const initialState: TeamsState = {
    teams: [],
    currentTeam: null,
    myTeams: [],
    isLoading: false,
    error: null,
    pagination: null,
};

const getToken = (state: RootState) => state.auth.keycloak?.token;

export const fetchTeams = createAsyncThunk(
    'teams/fetchTeams',
    async ({ page = 1, search }: { page?: number; search?: string }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        const params = new URLSearchParams({ page: String(page), limit: '12' });
        if (search) params.append('search', search);

        const response = await fetch(`${API_URL}/teams?${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data: ApiResponse<Team[]> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to fetch teams');
        }

        return { teams: data.data!, pagination: data.pagination! };
    }
);

export const fetchTeam = createAsyncThunk(
    'teams/fetchTeam',
    async (id: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        const response = await fetch(`${API_URL}/teams/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data: ApiResponse<Team> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to fetch team');
        }

        return data.data!;
    }
);

export const createTeam = createAsyncThunk(
    'teams/createTeam',
    async (teamData: { name: string; description?: string; logoUrl?: string }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(teamData),
        });

        const data: ApiResponse<Team> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to create team');
        }

        return data.data!;
    }
);

export const joinTeam = createAsyncThunk(
    'teams/joinTeam',
    async (code: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/teams/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ code }),
        });

        const data: ApiResponse<any> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to join team');
        }

        return data.data!;
    }
);

export const leaveTeam = createAsyncThunk(
    'teams/leaveTeam',
    async (teamId: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/teams/${teamId}/leave`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });

        const data: ApiResponse<any> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to leave team');
        }

        return teamId;
    }
);

const teamsSlice = createSlice({
    name: 'teams',
    initialState,
    reducers: {
        setMyTeams: (state, action: PayloadAction<Team[]>) => {
            state.myTeams = action.payload;
        },
        clearCurrentTeam: (state) => {
            state.currentTeam = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch teams
            .addCase(fetchTeams.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTeams.fulfilled, (state, action) => {
                state.isLoading = false;
                state.teams = action.payload.teams;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchTeams.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch teams';
            })
            // Fetch single team
            .addCase(fetchTeam.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTeam.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentTeam = action.payload;
            })
            .addCase(fetchTeam.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch team';
            })
            // Create team
            .addCase(createTeam.fulfilled, (state, action) => {
                state.teams.unshift(action.payload);
                state.myTeams.push(action.payload);
            })
            // Join team
            .addCase(joinTeam.fulfilled, (state, action) => {
                if (action.payload.team) {
                    state.myTeams.push(action.payload.team);
                }
            })
            // Leave team
            .addCase(leaveTeam.fulfilled, (state, action) => {
                state.myTeams = state.myTeams.filter((t) => t.id !== action.payload);
            });
    },
});

export const { setMyTeams, clearCurrentTeam, clearError } = teamsSlice.actions;
export default teamsSlice.reducer;
