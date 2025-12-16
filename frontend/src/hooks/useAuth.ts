import { useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from './useRedux';
import { login, logout } from '../store/slices/authSlice';
import { authService } from '../lib/auth-service';

export function useAuth() {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isLoading, error } = useAppSelector(
        (state) => state.auth
    );

    const handleLogin = useCallback(() => {
        dispatch(login());
    }, [dispatch]);

    const handleLogout = useCallback(() => {
        dispatch(logout());
    }, [dispatch]);

    const getToken = useCallback(async (): Promise<string | null> => {
        const keycloak = authService.keycloak;
        if (!keycloak) return null;

        try {
            // Refresh token if expired
            await keycloak.updateToken(30);
            return keycloak.token || null;
        } catch {
            return null;
        }
    }, []);

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
        keycloak: authService.keycloak,
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
