import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import teamsReducer from './slices/teamsSlice';
import tournamentsReducer from './slices/tournamentsSlice';
import gamesReducer from './slices/gamesSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        teams: teamsReducer,
        tournaments: tournamentsReducer,
        games: gamesReducer,
        ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['auth/setKeycloak'],
                ignoredPaths: ['auth.keycloak'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
