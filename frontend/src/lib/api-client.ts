import { authService } from './auth-service';
import { toast } from 'sonner';

/**
 * Enhanced fetch wrapper that handles token refresh and error notifications
 * 
 * Automatically adds Authorization header with fresh token.
 * Note: Content-Type and other headers should still be set by the caller as needed.
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Get fresh token (will refresh if needed)
    const token = await authService.getToken();

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
    
    // Try to parse JSON response
    try {
        const data = await response.json();
        
        // Check if response was successful
        if (!response.ok) {
            const errorMessage = data.message || data.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        // If JSON parsing failed and response was not ok, provide generic error
        if (!response.ok) {
            // Check if this is a known handled error (401/403 already handled in apiFetch)
            if (response.status !== 401 && response.status !== 403) {
                // Show toast for 500s or other errors
                if (response.status >= 500) {
                     toast.error('Szerver hiba történt. Kérjük próbáld újra később.', { duration: 5000 });
                } else {
                     toast.error(`Hiba történt: ${response.status}`, { duration: 4000 });
                }
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Network errors or JSON parsing errors
        const msg = error instanceof Error ? error.message : 'Ismeretlen hiba történt';
        if (msg !== 'Unauthorized - Token expired' && msg !== 'Forbidden - Insufficient permissions') {
             // Avoid double toasting handled errors
             // Also check for network errors specifically?
             if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
                 toast.error('Hálózati hiba. Ellenőrizd az internet kapcsolatod.', { duration: 5000 });
             }
        }
        
        // Re-throw other errors (like JSON parsing errors for successful responses)
        throw error;
    }
}
