import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import teamsReducer from './slices/teamsSlice';
import tournamentsReducer from './slices/tournamentsSlice';
import gamesReducer from './slices/gamesSlice';
import uiReducer from './slices/uiSlice';
import statsReducer from './slices/statsSlice';
import notificationsReducer from './slices/notificationsSlice';
import bookingsReducer from './slices/bookingsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        teams: teamsReducer,
        tournaments: tournamentsReducer,
        games: gamesReducer,
        ui: uiReducer,
        stats: statsReducer,
        notifications: notificationsReducer,
        bookings: bookingsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
