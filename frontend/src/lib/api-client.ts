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
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        // Try to parse error details from response
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch {
            // If JSON parsing fails, use the default error message
        }
        
        throw new Error(errorMessage);
    }
    
    return response.json();
}
