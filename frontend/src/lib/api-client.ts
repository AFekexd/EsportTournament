import { authService } from './auth-service';
import { toast } from 'sonner';

/**
 * Enhanced fetch wrapper that handles token refresh and error notifications
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Get fresh token (will refresh if needed)
    const token = await authService.getToken();

    // If we couldn't get a token and auth is required, throw error
    if (!token && !options.headers) {
        // This is likely a public endpoint, proceed without token
    }

    // Prepare headers
    const headers = new Headers(options.headers);
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Make the request
    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle authentication errors
    if (response.status === 401) {
        toast.error('A munkamenet lejárt. Kérjük, jelentkezz be újra.', {
            duration: 5000,
        });
        
        // Try to logout and redirect
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout failed after 401:', error);
        }
        
        throw new Error('Unauthorized - Token expired');
    }

    // Handle forbidden errors
    if (response.status === 403) {
        toast.error('Nincs jogosultságod ehhez a művelethez.', {
            duration: 4000,
        });
        throw new Error('Forbidden - Insufficient permissions');
    }

    return response;
}

/**
 * Type-safe API fetch with JSON response parsing
 */
export async function apiFetchJson<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await apiFetch(url, options);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}
