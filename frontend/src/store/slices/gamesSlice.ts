import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Game, ApiResponse } from '../../types';
import { API_URL } from '../../config';

interface GamesState {
    games: Game[];
    currentGame: Game | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: GamesState = {
    games: [],
    currentGame: null,
    isLoading: false,
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
            });
    },
});

export const { clearCurrentGame } = gamesSlice.actions;
export default gamesSlice.reducer;
