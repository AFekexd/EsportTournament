import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { deleteMatch } from './tournamentsSlice';

interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  steamId?: string;
  steamAvatar?: string;
  steamUrl?: string;
  steamLevel?: number;
  steamPersonaname?: string;
  steamCreatedAt?: string;
  perfectGamesCount?: number;
  teams: any[];
  ranks: {
    id: string;
    gameId: string;
    gameName: string;
    gameImage: string | null;
    rankName: string;
    rankValue: number;
    rankImage: string | null;
  }[];
}

export interface Match {
  id: string;
  tournamentId: string;
  tournament: {
    id: string;
    name: string;
    game?: {
      id: string;
      name: string;
      imageUrl: string | null;
    };
  };
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeUserId: string | null;
  awayUserId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  winnerUserId: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledAt: string | null;
  playedAt: string | null;
  round: number;
  position: number;
  homeUser?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  awayUser?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  homeTeam?: { id: string; name: string };
  awayTeam?: { id: string; name: string };
}

interface UsersState {
  currentProfile: PublicProfile | null;
  userMatches: Match[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  currentProfile: null,
  userMatches: [],
  isLoading: false,
  error: null,
};

const getToken = (state: RootState) => state.auth.token;

export const fetchPublicProfile = createAsyncThunk(
  'users/fetchPublicProfile',
  async (userId: string, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);

    const response = await fetch(`${API_URL}/users/${userId}/public`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch user profile');
    }
    return data.data;
  }
);

export const searchUsers = createAsyncThunk(
  'users/searchUsers',
  async (query: string, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);

    const response = await fetch(`${API_URL}/users?search=${encodeURIComponent(query)}&limit=10`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to search users');
    }
    return data.data;
  }
);

export const fetchUserMatches = createAsyncThunk(
  'users/fetchUserMatches',
  async (userId: string, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);

    const response = await fetch(`${API_URL}/matches/user/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch user matches');
    }
    return data.data;
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearCurrentProfile: (state) => {
      state.currentProfile = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPublicProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProfile = action.payload;
      })
      .addCase(fetchPublicProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      })
      // User Matches
      .addCase(fetchUserMatches.pending, () => {
        // We don't necessarily want to trigger global loading for this part
      })
      .addCase(fetchUserMatches.fulfilled, (state, action) => {
        state.userMatches = action.payload;
      })
      // Handle match deletion (soft delete update) from tournamentsSlice
      .addCase(deleteMatch.fulfilled, (state, action) => {
        // If a match is cleared (soft deleted), the user is no longer a participant.
        // So we remove it from their history list.
        if (state.userMatches) {
          state.userMatches = state.userMatches.filter(m => m.id !== action.payload.matchId);
        }
      });
  },
});

export const { clearCurrentProfile } = usersSlice.actions;
export default usersSlice.reducer;
