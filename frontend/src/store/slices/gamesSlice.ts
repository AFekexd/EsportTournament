import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Game, ApiResponse } from '../../types';
import { API_URL } from '../../config';
import type { RootState } from '../index';

interface GamesState {
    games: Game[];
    currentGame: Game | null;
    isLoading: boolean;
    createLoading: boolean;
    error: string | null;
}

const initialState: GamesState = {
    games: [],
    currentGame: null,
    isLoading: false,
    createLoading: false,
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

const getToken = (state: RootState) => state.auth.keycloak?.token;

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
            });
    },
});

export const { clearCurrentGame } = gamesSlice.actions;
export default gamesSlice.reducer;
