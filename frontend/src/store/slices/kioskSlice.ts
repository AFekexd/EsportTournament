
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import type { Computer, Log, Session, User } from '../../types';

interface KioskState {
    machines: Computer[];
    activeSessions: Session[];
    logs: Log[];
    isLoading: boolean;
    error: string | null;
}

const initialState: KioskState = {
    machines: [],
    activeSessions: [],
    logs: [],
    isLoading: false,
    error: null,
};

const getToken = (state: RootState) => state.auth.token;

export const fetchMachines = createAsyncThunk('kiosk/fetchMachines', async (_, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/admin/kiosk/machines`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data as Computer[];
});

export const toggleLock = createAsyncThunk(
    'kiosk/toggleLock',
    async ({ id, locked }: { id: string; locked: boolean }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        // Optimistic update could be done here if needed
        const response = await fetch(`${API_URL}/admin/kiosk/machines/${id}/lock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ locked }),
        });
        const data = await response.json();
        return data as Computer;
    }
);

export const toggleCompetitionMode = createAsyncThunk(
    'kiosk/toggleCompetitionMode',
    async ({ id, enabled }: { id: string; enabled: boolean }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        const response = await fetch(`${API_URL}/admin/kiosk/machines/${id}/competition-mode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ enabled }),
        });
        const data = await response.json();
        return data as Computer;
    }
);

export const addTime = createAsyncThunk(
    'kiosk/addTime',
    async ({ userId, seconds }: { userId: string; seconds: number }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        const response = await fetch(`${API_URL}/admin/kiosk/users/${userId}/add-time`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ seconds }),
        });
        const data = await response.json();
        return data as User;
    }
);

export const fetchLogs = createAsyncThunk('kiosk/fetchLogs', async (_, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);
    const response = await fetch(`${API_URL}/admin/kiosk/logs`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data as Log[];
});

const kioskSlice = createSlice({
    name: 'kiosk',
    initialState,
    reducers: {
        updateMachineStatus: (state, action) => {
            const { id, ...changes } = action.payload;
            const index = state.machines.findIndex(m => m.id === id || m.hostname === id); // Handle hostname update if mapped
            if (index !== -1) {
                state.machines[index] = { ...state.machines[index], ...changes };
            }
        },

    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMachines.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMachines.fulfilled, (state, action) => {
                state.isLoading = false;
                state.machines = action.payload;
            })
            .addCase(fetchMachines.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch machines';
            })
            .addCase(toggleLock.fulfilled, (state, action) => {
                const index = state.machines.findIndex(m => m.id === action.payload.id);
                if (index !== -1) state.machines[index] = action.payload;
            })
            .addCase(toggleCompetitionMode.fulfilled, (state, action) => {
                const index = state.machines.findIndex(m => m.id === action.payload.id);
                if (index !== -1) state.machines[index] = action.payload;
            })
            .addCase(fetchLogs.fulfilled, (state, action) => {
                state.logs = action.payload;
            });
    },
});

export const { updateMachineStatus } = kioskSlice.actions;
export default kioskSlice.reducer;
