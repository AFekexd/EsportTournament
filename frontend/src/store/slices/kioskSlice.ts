import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import type { Computer, Log, Session } from '../../types';

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
    if (!token) throw new Error('Nincs bejelentkezve!');

    const response = await fetch(`${API_URL}/admin/kiosk/machines`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data as Computer[];
});

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
            const index = state.machines.findIndex(m => m.id === id || m.hostname === id);
            if (index !== -1) {
                state.machines[index] = { ...state.machines[index], ...changes };
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMachines.pending, (state) => {
                if (state.machines.length === 0) {
                    state.isLoading = true;
                }
            })
            .addCase(fetchMachines.fulfilled, (state, action) => {
                state.isLoading = false;
                state.machines = action.payload;
            })
            .addCase(fetchMachines.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch machines';
            })
            .addCase(fetchLogs.fulfilled, (state, action) => {
                state.logs = action.payload;
            });
    },
});

export const { updateMachineStatus } = kioskSlice.actions;
export default kioskSlice.reducer;
