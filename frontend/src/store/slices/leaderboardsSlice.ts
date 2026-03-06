import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config';

interface LeaderboardPlayer {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    elo: number;
    rank: number;
    matchesPlayed: number;
    matchesWon: number;
    winRate: number;
}

interface LeaderboardTeam {
    id: string;
    name: string;
    logoUrl: string | null;
    elo: number;
    rank: number;
    matchesPlayed: number;
    matchesWon: number;
    winRate: number;
}

interface LeaderboardsState {
    topPlayers: LeaderboardPlayer[];
    topTeams: LeaderboardTeam[];
    steamTopPlayers: any[];
    loading: boolean;
    error: string | null;
}

const initialState: LeaderboardsState = {
    topPlayers: [],
    topTeams: [],
    steamTopPlayers: [],
    loading: false,
    error: null,
};

export const fetchTopPlayers = createAsyncThunk(
    'leaderboards/fetchTopPlayers',
    async () => {
        const response = await fetch(`${API_URL}/leaderboards/players/top`);
        const data = await response.json();
        return (data.data || []) as LeaderboardPlayer[];
    }
);

export const fetchTopTeams = createAsyncThunk(
    'leaderboards/fetchTopTeams',
    async (limit: number = 3) => {
        const response = await fetch(`${API_URL}/leaderboards/teams?limit=${limit}`);
        const data = await response.json();
        return (data.data || []) as LeaderboardTeam[];
    }
);

export const fetchSteamTopPlayers = createAsyncThunk(
    'leaderboards/fetchSteamTopPlayers',
    async (limit: number = 3) => {
        const response = await fetch(`${API_URL}/leaderboards/steam/top?limit=${limit}`);
        const data = await response.json();
        return data.data || [];
    }
);

const leaderboardsSlice = createSlice({
    name: 'leaderboards',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTopPlayers.fulfilled, (state, action) => {
                state.topPlayers = action.payload;
            })
            .addCase(fetchTopTeams.fulfilled, (state, action) => {
                state.topTeams = action.payload;
            })
            .addCase(fetchSteamTopPlayers.fulfilled, (state, action) => {
                state.steamTopPlayers = action.payload;
            });
    },
});

export default leaderboardsSlice.reducer;
