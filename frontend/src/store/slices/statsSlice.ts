import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Stats {
  activeTournaments: number;
  registeredUsers: number;
  createdTeams: number;
  playedMatches: number;
}

interface StatsState {
  data: Stats | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: StatsState = {
  data: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunk to fetch stats
export const fetchStats = createAsyncThunk('stats/fetch', async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const response = await fetch(`${apiUrl}/stats`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  
  const data = await response.json();
  return data as Stats;
});

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    clearStatsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action: PayloadAction<Stats>) => {
        state.loading = false;
        state.data = action.payload;
        state.lastUpdated = Date.now();
        state.error = null;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stats';
      });
  },
});

export const { clearStatsError } = statsSlice.actions;
export default statsSlice.reducer;
