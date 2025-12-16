import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config';
import type { ApiResponse } from '../../types';
import { authService } from '../../lib/auth-service';

export interface Notification {
    id: string;
    userId: string;
    type: 'TOURNAMENT_INVITE' | 'TEAM_INVITE' | 'MATCH_SCHEDULED' | 'MATCH_RESULT' | 'SYSTEM';
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

interface NotificationsState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    } | null;
}

const initialState: NotificationsState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    pagination: null,
};

const getToken = () => authService.keycloak?.token;

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
        const token = getToken();

        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/notifications?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data: ApiResponse<Notification[]> = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to fetch notifications');
        }

        return { notifications: data.data!, pagination: data.pagination! };
    }
);

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async () => {
    const token = getToken();

    if (!token) return 0;

    const response = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data: ApiResponse<{ count: number }> = await response.json();

    if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch unread count');
    }

    return data.data!.count;
});

export const markAsRead = createAsyncThunk('notifications/markAsRead', async (id: string) => {
    const token = getToken();

    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
    });

    const data: ApiResponse<any> = await response.json();

    if (!data.success) {
        throw new Error(data.error?.message || 'Failed to mark as read');
    }

    return id;
});

export const markAllAsRead = createAsyncThunk('notifications/markAllAsRead', async () => {
    const token = getToken();

    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
    });

    const data: ApiResponse<any> = await response.json();

    if (!data.success) {
        throw new Error(data.error?.message || 'Failed to mark all as read');
    }
});

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        decrementUnreadCount: (state) => {
            if (state.unreadCount > 0) {
                state.unreadCount--;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch notifications
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoading = false;
                state.notifications = action.payload.notifications;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch notifications';
            })
            // Fetch unread count
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload;
            })
            // Mark as read
            .addCase(markAsRead.fulfilled, (state, action) => {
                const notification = state.notifications.find((n) => n.id === action.payload);
                if (notification && !notification.read) {
                    notification.read = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            // Mark all as read
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.notifications.forEach((n) => {
                    n.read = true;
                });
                state.unreadCount = 0;
            });
    },
});

export const { decrementUnreadCount } = notificationsSlice.actions;
export default notificationsSlice.reducer;
