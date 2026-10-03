import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { API_URL } from '../../config';
import { apiFetchJson } from '../../lib/api-client';
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

export const fetchMachines = createAsyncThunk('kiosk/fetchMachines', async () => {
    const data = await apiFetchJson<Computer[]>(`${API_URL}/admin/kiosk/machines`);
    return data;
});

export const createMachine = createAsyncThunk(
    'kiosk/createMachine',
    async (
        machineData: {
            name: string;
            hostname?: string;
            row: number;
            position: number;
            status?: 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_ORDER';
            isActive?: boolean;
            installedGames?: string[];
        }
    ) => {
        const res = await apiFetchJson<{ success: boolean; data: Computer }>(
            `${API_URL}/bookings/computers`,
            {
                method: 'POST',
                body: JSON.stringify(machineData),
            }
        );
        return res.data;
    }
);

export const updateMachine = createAsyncThunk(
    'kiosk/updateMachine',
    async ({
        id,
        ...updateData
    }: {
        id: string;
        name?: string;
        hostname?: string;
        row?: number;
        position?: number;
        status?: 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_ORDER';
        isActive?: boolean;
        installedGames?: string[];
    }) => {
        const res = await apiFetchJson<{ success: boolean; data: Computer }>(
            `${API_URL}/bookings/computers/${id}`,
            {
                method: 'PATCH',
                body: JSON.stringify(updateData),
            }
        );
        return res.data;
    }
);

export const deleteMachine = createAsyncThunk(
    'kiosk/deleteMachine',
    async (machineId: string) => {
        await apiFetchJson(`${API_URL}/bookings/computers/${machineId}`, {
            method: 'DELETE',
        });
        return machineId;
    }
);

export const bulkUpdateGames = createAsyncThunk(
    'kiosk/bulkUpdateGames',
    async (payload: { installedGames: string[]; row?: number; computerIds?: string[] }, { dispatch }) => {
        const res = await apiFetchJson<{ success: boolean; count: number }>(
            `${API_URL}/bookings/computers/bulk-games`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            }
        );
        await dispatch(fetchMachines());
        return res;
    }
);

export const seedMachines = createAsyncThunk(
    'kiosk/seedMachines',
    async (_, { dispatch }) => {
        const res = await apiFetchJson<{ success: boolean }>(`${API_URL}/bookings/computers/seed`, {
            method: 'POST',
        });
        await dispatch(fetchMachines());
        return res;
    }
);

export const fetchLogs = createAsyncThunk('kiosk/fetchLogs', async () => {
    const data = await apiFetchJson<Log[]>(`${API_URL}/admin/kiosk/logs`);
    return data;
});

const kioskSlice = createSlice({
    name: 'kiosk',
    initialState,
    reducers: {
        updateMachineStatus: (state, action: PayloadAction<{ id: string } & Partial<Computer>>) => {
            const { id, ...changes } = action.payload;
            const index = state.machines.findIndex(m => m.id === id || m.hostname === id);
            if (index !== -1) {
                state.machines[index] = { ...state.machines[index], ...changes };
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch
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
            // Create
            .addCase(createMachine.fulfilled, (state, action) => {
                state.machines.push(action.payload);
                state.machines.sort((a, b) => (a.row === b.row ? a.position - b.position : a.row - b.row));
            })
            // Update
            .addCase(updateMachine.fulfilled, (state, action) => {
                const index = state.machines.findIndex(m => m.id === action.payload.id);
                if (index !== -1) {
                    state.machines[index] = action.payload;
                    state.machines.sort((a, b) => (a.row === b.row ? a.position - b.position : a.row - b.row));
                }
            })
            // Delete
            .addCase(deleteMachine.fulfilled, (state, action) => {
                state.machines = state.machines.filter(m => m.id !== action.payload);
            })
            // Logs
            .addCase(fetchLogs.fulfilled, (state, action) => {
                state.logs = action.payload;
            });
    },
});

export const { updateMachineStatus } = kioskSlice.actions;
export default kioskSlice.reducer;
