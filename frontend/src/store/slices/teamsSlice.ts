import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Team, ApiResponse } from '../../types';
import { API_URL } from '../../config';
import type { RootState } from '../index';

interface TeamsState {
    teams: Team[];
    currentTeam: Team | null;
    myTeams: Team[];
    isLoading: boolean;
    createLoading: boolean;
    updateLoading: boolean;
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
    createLoading: false,
    updateLoading: false,
    error: null,
    pagination: null,
};

const getToken = (state: RootState) => state.auth.token;

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

export const updateTeam = createAsyncThunk(
    'teams/updateTeam',
    async ({ id, data }: { id: string; data: { name?: string; description?: string; logoUrl?: string } }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/teams/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const result: ApiResponse<Team> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to update team');
        }

        return result.data!;
    }
);

export const deleteTeam = createAsyncThunk(
    'teams/deleteTeam',
    async (id: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/teams/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to delete team');
        }

        return id;
    }
);

export const removeMember = createAsyncThunk(
    'teams/removeMember',
    async ({ teamId, memberId }: { teamId: string; memberId: string }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/teams/${teamId}/members/${memberId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to remove member');
        }

        return { teamId, memberId };
    }
);

export const regenerateJoinCode = createAsyncThunk(
    'teams/regenerateJoinCode',
    async (teamId: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/teams/${teamId}/regenerate-code`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });

        const result: ApiResponse<{ joinCode: string }> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to regenerate join code');
        }

        return { teamId, joinCode: result.data!.joinCode };
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
            .addCase(createTeam.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createTeam.fulfilled, (state, action) => {
                state.createLoading = false;
                state.teams.unshift(action.payload);
                state.myTeams.push(action.payload);
                state.currentTeam = action.payload;
            })
            .addCase(createTeam.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.error.message || 'Failed to create team';
            })
            // Update team
            .addCase(updateTeam.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(updateTeam.fulfilled, (state, action) => {
                state.updateLoading = false;
                if (state.currentTeam?.id === action.payload.id) {
                    state.currentTeam = action.payload;
                }
                const index = state.teams.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.teams[index] = action.payload;
                }
            })
            .addCase(updateTeam.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.error.message || 'Failed to update team';
            })
            // Delete team
            .addCase(deleteTeam.fulfilled, (state, action) => {
                state.teams = state.teams.filter(t => t.id !== action.payload);
                state.myTeams = state.myTeams.filter(t => t.id !== action.payload);
                if (state.currentTeam?.id === action.payload) {
                    state.currentTeam = null;
                }
            })
            // Remove member
            .addCase(removeMember.fulfilled, (state, action) => {
                if (state.currentTeam?.id === action.payload.teamId) {
                    state.currentTeam.members = state.currentTeam.members?.filter(
                        m => m.userId !== action.payload.memberId
                    );
                }
            })
            // Regenerate join code
            .addCase(regenerateJoinCode.fulfilled, (state, action) => {
                if (state.currentTeam?.id === action.payload.teamId) {
                    state.currentTeam.joinCode = action.payload.joinCode;
                }
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
