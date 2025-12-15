import { useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from './useRedux';
import { login, logout } from '../store/slices/authSlice';

export function useAuth() {
    const dispatch = useAppDispatch();
    const { user, keycloak, isAuthenticated, isLoading, error } = useAppSelector(
        (state) => state.auth
    );

    const handleLogin = useCallback(() => {
        dispatch(login());
    }, [dispatch]);

    const handleLogout = useCallback(() => {
        dispatch(logout());
    }, [dispatch]);

    const getToken = useCallback(async (): Promise<string | null> => {
        if (!keycloak) return null;

        try {
            // Refresh token if expired
            await keycloak.updateToken(30);
            return keycloak.token || null;
        } catch {
            return null;
        }
    }, [keycloak]);

    const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);
    const isOrganizer = useMemo(
        () => user?.role === 'ADMIN' || user?.role === 'ORGANIZER',
        [user]
    );
    const isModerator = useMemo(
        () => ['ADMIN', 'ORGANIZER', 'MODERATOR'].includes(user?.role || ''),
        [user]
    );

    return {
        user,
        keycloak,
        isAuthenticated,
        isLoading,
        error,
        login: handleLogin,
        logout: handleLogout,
        getToken,
        isAdmin,
        isOrganizer,
        isModerator,
    };
}
