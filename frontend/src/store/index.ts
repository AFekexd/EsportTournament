import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import teamsReducer from './slices/teamsSlice';
import tournamentsReducer from './slices/tournamentsSlice';
import gamesReducer from './slices/gamesSlice';
import uiReducer from './slices/uiSlice';
import statsReducer from './slices/statsSlice';
import notificationsReducer from './slices/notificationsSlice';
import usersReducer from './slices/usersSlice';
import bookingsReducer from './slices/bookingsSlice';
import kioskReducer from './slices/kioskSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        teams: teamsReducer,
        tournaments: tournamentsReducer,
        games: gamesReducer,
        ui: uiReducer,
        stats: statsReducer,
        notifications: notificationsReducer,
        users: usersReducer,
        bookings: bookingsReducer,
        kiosk: kioskReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
