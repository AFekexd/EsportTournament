import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config';
import type { RootState } from '../index';

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

interface UsersState {
  currentProfile: PublicProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  currentProfile: null,
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
      });
  },
});

export const { clearCurrentProfile } = usersSlice.actions;
export default usersSlice.reducer;
