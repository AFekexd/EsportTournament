import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config';
import type { RootState } from '../index';

// Types
export type ComputerStatus = 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_ORDER';

export interface ComputerSpecs {
    cpu?: string;
    gpu?: string;
    ram?: string;
    monitor?: string;
    storage?: string;
}

export interface Computer {
    id: string;
    name: string;
    row: number;
    position: number;
    isActive: boolean;
    status: ComputerStatus;
    specs?: ComputerSpecs;
    installedGames: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Booking {
    id: string;
    computerId: string;
    computer: Computer;
    userId: string;
    user: { id: string; username: string; displayName: string | null };
    date: string;
    startTime: string;
    endTime: string;
    checkInCode?: string;
    checkedInAt?: string;
    reminderSent: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BookingSchedule {
    id: string;
    dayOfWeek: number;
    startHour: number;
    endHour: number;
    isActive: boolean;
}

export interface WaitlistEntry {
    id: string;
    computerId: string;
    computer: Computer;
    userId: string;
    date: string;
    startHour: number;
    endHour: number;
    notified: boolean;
    createdAt: string;
}

export interface BookingStats {
    totalBookings: number;
    byDayOfWeek: number[];
    byHour: Record<number, number>;
    topUsers: { user: { id: string; username: string; displayName: string | null }; count: number }[];
    computerUtilization: { computer: Computer; bookings: number }[];
    period: { start: string; end: string };
}

interface BookingsState {
    computers: Computer[];
    bookings: Booking[];
    weeklyBookings: Booking[];
    schedules: BookingSchedule[];
    myBookings: Booking[];
    myWaitlist: WaitlistEntry[];
    stats: BookingStats | null;
    selectedDate: string;
    selectedWeekStart: string;
    viewMode: 'daily' | 'weekly';
    isLoading: boolean;
    error: string | null;
}

const getMonday = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
};

const initialState: BookingsState = {
    computers: [],
    bookings: [],
    weeklyBookings: [],
    schedules: [],
    myBookings: [],
    myWaitlist: [],
    stats: null,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedWeekStart: getMonday(new Date()),
    viewMode: 'daily',
    isLoading: false,
    error: null,
};

const getToken = (state: RootState) => state.auth.token;

// Async thunks
export const fetchComputers = createAsyncThunk('bookings/fetchComputers', async () => {
    const response = await fetch(`${API_URL}/bookings/computers`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to fetch computers');
    return data.data as Computer[];
});

export const seedComputers = createAsyncThunk('bookings/seedComputers', async (_, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/bookings/computers/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to seed computers');
    return data.data as Computer[];
});

export const fetchSchedules = createAsyncThunk('bookings/fetchSchedules', async () => {
    const response = await fetch(`${API_URL}/bookings/schedules`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to fetch schedules');
    return data.data as BookingSchedule[];
});

export const createSchedule = createAsyncThunk(
    'bookings/createSchedule',
    async (scheduleData: { dayOfWeek: number; startHour: number; endHour: number }, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/schedules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(scheduleData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to create schedule');
        return data.data as BookingSchedule;
    }
);

export const deleteSchedule = createAsyncThunk(
    'bookings/deleteSchedule',
    async (id: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/schedules/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to delete schedule');
        return id;
    }
);

export const fetchBookingsForDate = createAsyncThunk(
    'bookings/fetchBookingsForDate',
    async (date: string) => {
        const response = await fetch(`${API_URL}/bookings/date/${date}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to fetch bookings');
        return data.data as Booking[];
    }
);

export const fetchMyBookings = createAsyncThunk('bookings/fetchMyBookings', async (_, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to fetch my bookings');
    return data.data as Booking[];
});

export const createBooking = createAsyncThunk(
    'bookings/createBooking',
    async (
        bookingData: { computerId: string; date: string; startTime: string; endTime: string },
        { getState }
    ) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bookingData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to create booking');
        return data.data as Booking;
    }
);

export const deleteBooking = createAsyncThunk(
    'bookings/deleteBooking',
    async (id: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to delete booking');
        return id;
    }
);

// New async thunks for enhanced booking features

export const fetchWeeklyBookings = createAsyncThunk(
    'bookings/fetchWeeklyBookings',
    async (startDate: string) => {
        const response = await fetch(`${API_URL}/bookings/week/${startDate}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to fetch weekly bookings');
        return data.data as Booking[];
    }
);

export const updateBooking = createAsyncThunk(
    'bookings/updateBooking',
    async (
        { id, ...updateData }: { id: string; computerId?: string; startTime?: string; endTime?: string },
        { getState }
    ) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to update booking');
        return data.data as Booking;
    }
);

export const checkInByCode = createAsyncThunk(
    'bookings/checkInByCode',
    async (checkInCode: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ checkInCode }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to check in');
        return data.data as Booking;
    }
);

export const checkInBooking = createAsyncThunk(
    'bookings/checkInBooking',
    async ({ id, checkInCode }: { id: string; checkInCode: string }) => {
        const response = await fetch(`${API_URL}/bookings/${id}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkInCode }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to check in');
        return data.data as Booking;
    }
);

export const addToWaitlist = createAsyncThunk(
    'bookings/addToWaitlist',
    async (
        waitlistData: { computerId: string; date: string; startHour: number; endHour: number },
        { getState }
    ) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/waitlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(waitlistData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to add to waitlist');
        return data.data as WaitlistEntry;
    }
);

export const removeFromWaitlist = createAsyncThunk(
    'bookings/removeFromWaitlist',
    async (id: string, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/waitlist/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to remove from waitlist');
        return id;
    }
);

export const fetchMyWaitlist = createAsyncThunk(
    'bookings/fetchMyWaitlist',
    async (_, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/waitlist/my`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to fetch waitlist');
        return data.data as WaitlistEntry[];
    }
);

export const fetchBookingStats = createAsyncThunk(
    'bookings/fetchBookingStats',
    async (_, { getState }) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/stats`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to fetch stats');
        return data.data as BookingStats;
    }
);

export const updateComputer = createAsyncThunk(
    'bookings/updateComputer',
    async (
        { id, ...updateData }: { id: string; specs?: ComputerSpecs; installedGames?: string[]; status?: ComputerStatus; isActive?: boolean },
        { getState }
    ) => {
        const state = getState() as RootState;
        const token = getToken(state);
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/bookings/computers/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to update computer');
        return data.data as Computer;
    }
);

const bookingsSlice = createSlice({
    name: 'bookings',
    initialState,
    reducers: {
        setSelectedDate: (state, action) => {
            state.selectedDate = action.payload;
        },
        setSelectedWeekStart: (state, action) => {
            state.selectedWeekStart = action.payload;
        },
        setViewMode: (state, action) => {
            state.viewMode = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Computers
            .addCase(fetchComputers.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchComputers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.computers = action.payload;
            })
            .addCase(fetchComputers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch computers';
            })
            .addCase(seedComputers.fulfilled, (state, action) => {
                state.computers = action.payload;
            })
            .addCase(updateComputer.fulfilled, (state, action) => {
                const index = state.computers.findIndex((c) => c.id === action.payload.id);
                if (index !== -1) state.computers[index] = action.payload;
            })
            // Schedules
            .addCase(fetchSchedules.fulfilled, (state, action) => {
                state.schedules = action.payload;
            })
            .addCase(createSchedule.fulfilled, (state, action) => {
                state.schedules.push(action.payload);
            })
            .addCase(deleteSchedule.fulfilled, (state, action) => {
                state.schedules = state.schedules.filter((s) => s.id !== action.payload);
            })
            // Bookings
            .addCase(fetchBookingsForDate.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchBookingsForDate.fulfilled, (state, action) => {
                state.isLoading = false;
                state.bookings = action.payload;
            })
            .addCase(fetchBookingsForDate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch bookings';
            })
            .addCase(fetchMyBookings.fulfilled, (state, action) => {
                state.myBookings = action.payload;
            })
            .addCase(createBooking.fulfilled, (state, action) => {
                state.bookings.push(action.payload);
                state.myBookings.push(action.payload);
            })
            .addCase(deleteBooking.fulfilled, (state, action) => {
                state.bookings = state.bookings.filter((b) => b.id !== action.payload);
                state.myBookings = state.myBookings.filter((b) => b.id !== action.payload);
            })
            // Weekly bookings
            .addCase(fetchWeeklyBookings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchWeeklyBookings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.weeklyBookings = action.payload;
            })
            .addCase(fetchWeeklyBookings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch weekly bookings';
            })
            // Update booking
            .addCase(updateBooking.fulfilled, (state, action) => {
                const bookingIndex = state.bookings.findIndex((b) => b.id === action.payload.id);
                if (bookingIndex !== -1) state.bookings[bookingIndex] = action.payload;
                const myBookingIndex = state.myBookings.findIndex((b) => b.id === action.payload.id);
                if (myBookingIndex !== -1) state.myBookings[myBookingIndex] = action.payload;
            })
            // Check-in
            .addCase(checkInBooking.fulfilled, (state, action) => {
                const bookingIndex = state.bookings.findIndex((b) => b.id === action.payload.id);
                if (bookingIndex !== -1) state.bookings[bookingIndex] = action.payload;
                const myBookingIndex = state.myBookings.findIndex((b) => b.id === action.payload.id);
                if (myBookingIndex !== -1) state.myBookings[myBookingIndex] = action.payload;
            })
            // Waitlist
            .addCase(fetchMyWaitlist.fulfilled, (state, action) => {
                state.myWaitlist = action.payload;
            })
            .addCase(addToWaitlist.fulfilled, (state, action) => {
                state.myWaitlist.push(action.payload);
            })
            .addCase(removeFromWaitlist.fulfilled, (state, action) => {
                state.myWaitlist = state.myWaitlist.filter((w) => w.id !== action.payload);
            })
            // Stats
            .addCase(fetchBookingStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            });
    },
});

export const { setSelectedDate, setSelectedWeekStart, setViewMode, clearError } = bookingsSlice.actions;
export default bookingsSlice.reducer;
