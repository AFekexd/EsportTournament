import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Tournament, TournamentEntry, ApiResponse } from '../../types';
import { API_URL } from '../../config';
import { authService } from '../../lib/auth-service';

interface TournamentsState {
    tournaments: Tournament[];
    currentTournament: Tournament | null;
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

const initialState: TournamentsState = {
    tournaments: [],
    currentTournament: null,
    isLoading: false,
    createLoading: false,
    updateLoading: false,
    error: null,
    pagination: null,
};

const getToken = () => authService.keycloak?.token;

export const fetchTournaments = createAsyncThunk(
    'tournaments/fetchTournaments',
    async ({ page = 1, limit = 12, status, gameId, search }: { page?: number; limit?: number; status?: string; gameId?: string; search?: string }) => {
        const token = getToken();

        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.append('status', status);
        if (gameId) params.append('gameId', gameId);
        if (search) params.append('search', search);

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
    async (id: string) => {
        const token = getToken();

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
    async ({ tournamentId, teamId, memberIds, userId }: { tournamentId: string; teamId?: string; memberIds?: string[]; userId?: string }, { rejectWithValue }) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ teamId, memberIds, userId }),
        });

        const data: ApiResponse<any> = await response.json();

        if (!data.success) {
            return rejectWithValue(data.error);
        }

        return data.data!;
    }
);

export const unregisterFromTournament = createAsyncThunk(
    'tournaments/unregister',
    async ({ tournamentId, targetId }: { tournamentId: string; targetId: string }) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/register/${targetId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        const data: ApiResponse<any> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to unregister from tournament');
        }

        return { tournamentId, targetId };
    }
);

export const createTournament = createAsyncThunk(
    'tournaments/createTournament',
    async (
        tournamentData: {
            name: string;
            description?: string;
            imageUrl?: string;
            gameId: string;
            format?: string;
            maxTeams: number;
            startDate: string;
            endDate?: string;
            registrationDeadline: string;
            prizePool?: string;
            hasQualifier?: boolean;
            qualifierMatches?: number;
            qualifierMinPoints?: number;
            teamSize?: number | null;
            seedingMethod?: 'STANDARD' | 'SEQUENTIAL' | 'RANDOM';
            requireRank?: boolean;
        }
    ) => {
        const token = getToken();
        if (!token) throw new Error('Nincs bejelentkezve!');
        const response = await fetch(`${API_URL}/tournaments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(tournamentData),
        });
        const data: ApiResponse<Tournament> = await response.json();
        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to create tournament');
        }
        return data.data!;
    }
);

export const updateTournament = createAsyncThunk(
    'tournaments/updateTournament',
    async (
        { id, data }: {
            id: string; data: {
                status?: string;
                name?: string;
                description?: string;
                imageUrl?: string;
                format?: string;
                startDate?: string;
                endDate?: string;
                registrationDeadline?: string;
                notifyUsers?: boolean;
                notifyDiscord?: boolean;
                discordChannelId?: string;
                hasQualifier?: boolean;
                qualifierMatches?: number;
                qualifierMinPoints?: number;
                maxTeams?: number;
                teamSize?: number | null;
                seedingMethod?: 'STANDARD' | 'SEQUENTIAL' | 'RANDOM';
                requireRank?: boolean;
            }
        }

    ) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/tournaments/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const result: ApiResponse<Tournament> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to update tournament');
        }

        return result.data!;
    }
);

export const deleteTournament = createAsyncThunk(
    'tournaments/deleteTournament',
    async (id: string) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/tournaments/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to delete tournament');
        }

        return id;
    }
);

export const generateBracket = createAsyncThunk(
    'tournaments/generateBracket',
    async (tournamentId: string) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/generate-bracket`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to generate bracket');
        }

        return { tournamentId, matches: result.data };
    }
);

export const deleteBracket = createAsyncThunk(
    'tournaments/deleteBracket',
    async (tournamentId: string) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/bracket`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to delete bracket');
        }

        return tournamentId;
    }
);

export const updateMatch = createAsyncThunk(
    'tournaments/updateMatch',
    async ({ matchId, data }: { matchId: string; data: { homeScore?: number; awayScore?: number; winnerId?: string; winnerUserId?: string } }) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/matches/${matchId}/result`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to update match');
        }

        return result.data;
    }
);

export const updateEntryStats = createAsyncThunk(
    'tournaments/updateEntryStats',
    async ({ tournamentId, entryId, data }: { tournamentId: string; entryId: string; data: { matchesPlayed?: number; qualifierPoints?: number } }) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/tournaments/${tournamentId}/entries/${entryId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const result: ApiResponse<TournamentEntry> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to update entry stats');
        }

        return result.data!;
    }
);

// Reset match result (admin only)
export const resetMatch = createAsyncThunk(
    'tournaments/resetMatch',
    async (matchId: string) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/matches/${matchId}/reset`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to reset match');
        }

        return { matchId, data: result.data, message: (result as any).message };
    }
);

// Delete match (admin only)
export const deleteMatch = createAsyncThunk(
    'tournaments/deleteMatch',
    async (matchId: string) => {
        const token = getToken();

        if (!token) throw new Error('Nincs bejelentkezve!');

        const response = await fetch(`${API_URL}/matches/${matchId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result: ApiResponse<any> = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to delete match');
        }

        return { matchId, data: result.data, message: (result as any).message };
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
                if (state.tournaments.length === 0) {
                    state.isLoading = true;
                }
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
                if (!state.currentTournament) {
                    state.isLoading = true;
                }
                state.error = null;
            })
            .addCase(fetchTournament.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentTournament = action.payload;
            })
            .addCase(fetchTournament.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch tournament';
            })
            // Create tournament
            .addCase(createTournament.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createTournament.fulfilled, (state, action) => {
                state.createLoading = false;
                state.tournaments.unshift(action.payload);
            })
            .addCase(createTournament.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.error.message || 'Failed to create tournament';
            })
            // Update tournament
            .addCase(updateTournament.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(updateTournament.fulfilled, (state, action) => {
                state.updateLoading = false;
                // Update in tournaments list
                const index = state.tournaments.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.tournaments[index] = action.payload;
                }
                // Update current tournament if it's the same
                if (state.currentTournament?.id === action.payload.id) {
                    state.currentTournament = {
                        ...state.currentTournament,
                        ...action.payload,
                        // Preserve relations if missing in payload
                        entries: action.payload.entries || state.currentTournament.entries,
                        matches: action.payload.matches || state.currentTournament.matches,
                        game: action.payload.game || state.currentTournament.game,
                        _count: action.payload._count || state.currentTournament._count,
                    };
                }
            })
            .addCase(updateTournament.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.error.message || 'Failed to update tournament';
            })
            // Delete tournament
            .addCase(deleteTournament.fulfilled, (state, action) => {
                state.tournaments = state.tournaments.filter(t => t.id !== action.payload);
                if (state.currentTournament?.id === action.payload) {
                    state.currentTournament = null;
                }
            })
            // Generate bracket
            .addCase(generateBracket.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(generateBracket.fulfilled, (state, action) => {
                state.isLoading = false;
                // Refresh current tournament to get updated matches
                if (state.currentTournament?.id === action.payload.tournamentId) {
                    // Will be refreshed by fetchTournament call
                }
            })
            .addCase(generateBracket.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to generate bracket';
            })
            // Delete bracket
            .addCase(deleteBracket.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteBracket.fulfilled, (state, action) => {
                state.isLoading = false;
                if (state.currentTournament?.id === action.payload) {
                    state.currentTournament.matches = [];
                }
            })
            .addCase(deleteBracket.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to delete bracket';
            })
            // Update match
            .addCase(updateMatch.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(updateMatch.fulfilled, (state, action) => {
                state.updateLoading = false;
                // Update match in current tournament
                if (state.currentTournament?.matches) {
                    const index = state.currentTournament.matches.findIndex(m => m.id === action.payload.id);
                    if (index !== -1) {
                        state.currentTournament.matches[index] = action.payload;
                    }
                }
            })
            .addCase(updateMatch.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.error.message || 'Failed to update match';
            })
            // Update entry stats
            .addCase(updateEntryStats.fulfilled, (state, action) => {
                if (state.currentTournament?.entries) {
                    const index = state.currentTournament.entries.findIndex(e => e.id === action.payload.id);
                    if (index !== -1) {
                        state.currentTournament.entries[index] = action.payload;
                    }
                }
            })
            // Register
            .addCase(registerForTournament.fulfilled, (state, action) => {
                if (state.currentTournament) {
                    if (!state.currentTournament.entries) {
                        state.currentTournament.entries = [];
                    }
                    state.currentTournament.entries.push(action.payload);
                    // Update counts
                    if (state.currentTournament.participantsCount !== undefined) {
                        state.currentTournament.participantsCount++;
                    } else if (state.currentTournament._count) {
                        state.currentTournament._count.entries++;
                    }
                }
            })
            // Unregister
            .addCase(unregisterFromTournament.fulfilled, (state, action) => {
                if (state.currentTournament && state.currentTournament.entries) {
                    const { targetId } = action.payload;
                    state.currentTournament.entries = state.currentTournament.entries.filter(e =>
                        e.id !== targetId
                    );
                    // Update counts
                    if (state.currentTournament.participantsCount !== undefined) {
                        state.currentTournament.participantsCount = Math.max(0, state.currentTournament.participantsCount - 1);
                    } else if (state.currentTournament._count) {
                        state.currentTournament._count.entries = Math.max(0, state.currentTournament._count.entries - 1);
                    }
                }
            })
            // Reset match
            .addCase(resetMatch.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(resetMatch.fulfilled, (state, action) => {
                state.updateLoading = false;
                // Update match in current tournament
                if (state.currentTournament?.matches) {
                    const index = state.currentTournament.matches.findIndex(m => m.id === action.payload.matchId);
                    if (index !== -1) {
                        state.currentTournament.matches[index] = action.payload.data;
                    }
                }
            })
            .addCase(resetMatch.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.error.message || 'Failed to reset match';
            })
            // Delete match
            .addCase(deleteMatch.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(deleteMatch.fulfilled, (state, action) => {
                state.updateLoading = false;
                // Update match in current tournament (it's cleared, not removed)
                if (state.currentTournament?.matches) {
                    const index = state.currentTournament.matches.findIndex(m => m.id === action.payload.matchId);
                    if (index !== -1) {
                        state.currentTournament.matches[index] = action.payload.data;
                    }
                }
            })
            .addCase(deleteMatch.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.error.message || 'Failed to delete match';
            });
    },
});

export const { clearCurrentTournament, clearError } = tournamentsSlice.actions;
export default tournamentsSlice.reducer;
