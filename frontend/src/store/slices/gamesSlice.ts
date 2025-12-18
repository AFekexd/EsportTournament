import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Game, ApiResponse, Rank, UserRank } from '../../types';
import { API_URL } from '../../config';
import type { RootState } from '../index';

interface GamesState {
    games: Game[];
    currentGame: Game | null;
    gameRanks: Record<string, Rank[]>;
    userRanks: UserRank[];
    isLoading: boolean;
    createLoading: boolean;
    updateLoading: boolean;
    error: string | null;
}

const initialState: GamesState = {
    games: [],
    currentGame: null,
    gameRanks: {},
    userRanks: [],
    isLoading: false,
    createLoading: false,
    updateLoading: false,
    error: null,
};

export const fetchGames = createAsyncThunk('games/fetchGames', async () => {
    const response = await fetch(`${API_URL}/games`);
    const data: ApiResponse<Game[]> = await response.json();

    if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch games');
    }

    return data.data!;
});

export const fetchGame = createAsyncThunk('games/fetchGame', async (id: string) => {
    const response = await fetch(`${API_URL}/games/${id}`);
    const data: ApiResponse<Game> = await response.json();

    if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch game');
    }

    return data.data!;
});

const getToken = (state: RootState) => state.auth.token;

export const createGame = createAsyncThunk(
    'games/createGame',
    async (gameData: { name: string; description?: string; imageUrl?: string; rules?: string; teamSize: number }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(gameData),
        });

        const data: ApiResponse<Game> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to create game');
        }

        return data.data!;
    }
);

export const updateGame = createAsyncThunk(
    'games/updateGame',
    async ({ id, data }: { id: string; data: Partial<Game> }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/games/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const resData: ApiResponse<Game> = await response.json();

        if (!resData.success) {
            throw new Error(resData.error?.message || 'Failed to update game');
        }

        return resData.data!;
    }
);

export const deleteGame = createAsyncThunk(
    'games/deleteGame',
    async (id: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/games/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const resData = await response.json();

        if (!resData.success) {
            throw new Error(resData.error?.message || 'Failed to delete game');
        }

        return id;
    }
);

export const fetchRanks = createAsyncThunk('games/fetchRanks', async (gameId: string) => {
    const response = await fetch(`${API_URL}/games/${gameId}/ranks`);
    const data: ApiResponse<Rank[]> = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to fetch ranks');
    return { gameId, ranks: data.data! };
});

export const addRank = createAsyncThunk(
    'games/addRank',
    async ({ gameId, rankData }: { gameId: string; rankData: { name: string; value: number; image?: string; order: number } }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/games/${gameId}/ranks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(rankData),
        });
        const data: ApiResponse<Rank> = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to add rank');
        return data.data!;
    }
);

export const deleteRank = createAsyncThunk(
    'games/deleteRank',
    async ({ gameId, rankId }: { gameId: string; rankId: string }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/games/ranks/${rankId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to delete rank');
        return { gameId, rankId };
    }
);

export const fetchUserRanks = createAsyncThunk('games/fetchUserRanks', async (_, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/users/me/ranks`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data: ApiResponse<UserRank[]> = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to fetch user ranks');
    return data.data!;
});

export const setUserRank = createAsyncThunk(
    'games/setUserRank',
    async ({ gameId, rankId }: { gameId: string; rankId: string }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/users/me/ranks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ gameId, rankId }),
        });
        const data: ApiResponse<UserRank> = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to set rank');
        return data.data!;
    }
);

const gamesSlice = createSlice({
    name: 'games',
    initialState,
    reducers: {
        clearCurrentGame: (state) => {
            state.currentGame = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchGames.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchGames.fulfilled, (state, action) => {
                state.isLoading = false;
                state.games = action.payload;
            })
            .addCase(fetchGames.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch games';
            })
            .addCase(fetchGame.fulfilled, (state, action) => {
                state.currentGame = action.payload;
            })
            // Create game
            .addCase(createGame.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createGame.fulfilled, (state, action) => {
                state.createLoading = false;
                state.games.push(action.payload);
            })
            .addCase(createGame.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.error.message || 'Failed to create game';
            })
            // Update game
            .addCase(updateGame.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(updateGame.fulfilled, (state, action) => {
                state.updateLoading = false;
                const index = state.games.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.games[index] = action.payload;
                }
                if (state.currentGame?.id === action.payload.id) {
                    state.currentGame = action.payload;
                }
            })
            .addCase(updateGame.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.error.message || 'Failed to update game';
            })
            // Delete game
            .addCase(deleteGame.fulfilled, (state, action) => {
                state.games = state.games.filter(g => g.id !== action.payload);
                if (state.currentGame?.id === action.payload) {
                    state.currentGame = null;
                }
            })
            // Ranks
            .addCase(fetchRanks.fulfilled, (state, action) => {
                state.gameRanks[action.payload.gameId] = action.payload.ranks;
            })
            .addCase(addRank.fulfilled, (state, action) => {
                const gameId = action.payload.gameId;
                if (!state.gameRanks[gameId]) state.gameRanks[gameId] = [];
                state.gameRanks[gameId].push(action.payload);
                state.gameRanks[gameId].sort((a, b) => a.order - b.order);
            })
            .addCase(deleteRank.fulfilled, (state, action) => {
                const { gameId, rankId } = action.payload;
                if (state.gameRanks[gameId]) {
                    state.gameRanks[gameId] = state.gameRanks[gameId].filter(r => r.id !== rankId);
                }
            })
            // User Ranks
            .addCase(fetchUserRanks.fulfilled, (state, action) => {
                state.userRanks = action.payload;
            })
            .addCase(setUserRank.fulfilled, (state, action) => {
                const index = state.userRanks.findIndex(ur => ur.gameId === action.payload.gameId);
                if (index !== -1) {
                    state.userRanks[index] = action.payload;
                } else {
                    state.userRanks.push(action.payload);
                }
            });
    },
});

export const { clearCurrentGame } = gamesSlice.actions;
export default gamesSlice.reducer;
