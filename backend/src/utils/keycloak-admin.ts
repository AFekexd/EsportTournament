import "dotenv/config";
import { ApiError } from '../middleware/errorHandler.js';

const KEYCLOAK_URL = process.env.VITE_KEYCLOAK_URL || process.env.KEYCLOAK_URL || 'https://keycloak.pollak.info';
const KEYCLOAK_REALM = process.env.VITE_KEYCLOAK_REALM || process.env.KEYCLOAK_REALM || 'master';

// These must be set in .env for admin operations
const CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'esport-backend';
const CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface KeycloakRole {
    id: string;
    name: string;
    description?: string;
    composite?: boolean;
    clientRole?: boolean;
    containerId?: string;
}

/**
 * Get Admin Access Token using Client Credentials Grant
 */
async function getAdminToken(): Promise<string> {
    if (!CLIENT_SECRET) {
        console.warn('KEYCLOAK_ADMIN_CLIENT_SECRET not set. Skipping Keycloak sync.');
        return '';
    }

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');

    try {
        const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Failed to get Keycloak admin token:', error);
            throw new Error('Keycloak authentication failed');
        }

        const data = await response.json() as TokenResponse;
        return data.access_token;
    } catch (error) {
        console.error('Keycloak token error:', error);
        return '';
    }
}

/**
 * Sync user role to Keycloak
 * Matches the single-role model of the app to Keycloak Realm Roles
 */
export async function syncUserRole(keycloakUserId: string, newRole: string) {
    // 1. Get Admin Token
    const token = await getAdminToken();
    if (!token) return; // Skip if no token (dev mode or missing config)

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const baseUrl = `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}`;

    try {
        // 2. Get Available Realm Roles to map names to IDs
        // We only care about the roles we manage
        const managedRoles = ['ADMIN', 'ORGANIZER', 'MODERATOR', 'TEACHER'];

        // Fetch only roles we might need (optimization: could cache this)
        // Keycloak API: GET /roles
        const rolesResponse = await fetch(`${baseUrl}/roles`, { headers });
        if (!rolesResponse.ok) throw new Error('Failed to fetch roles');

        const allRoles = await rolesResponse.json() as KeycloakRole[];
        const roleMap = new Map<string, KeycloakRole>();

        allRoles.forEach(r => {
            if (managedRoles.includes(r.name)) {
                roleMap.set(r.name, r);
            }
        });

        // 3. Get User's Current Roles
        const userRolesResponse = await fetch(`${baseUrl}/users/${keycloakUserId}/role-mappings/realm`, { headers });
        if (!userRolesResponse.ok) {
            // If user not found (404), maybe it's a fresh user or invalid ID. 
            console.warn(`Could not fetch roles for user ${keycloakUserId}`);
            return;
        }
        const currentUserRoles = await userRolesResponse.json() as KeycloakRole[];

        // 4. Determine Roles to Remove (any managed role that is NOT the new role)
        const rolesToRemove: KeycloakRole[] = currentUserRoles.filter(r =>
            managedRoles.includes(r.name) && r.name !== newRole
        );

        // 5. Determine Role to Add
        // Only if newRole is in our managed list (e.g. STUDENT is not a role we need to add, it's default)
        const roleToAddName = managedRoles.includes(newRole) ? newRole : null;
        const roleToAdd = roleToAddName ? roleMap.get(roleToAddName) : null;

        // Skip if role to add exists but we couldn't find it in Keycloak (maybe not created yet?)
        if (roleToAddName && !roleToAdd) {
            console.warn(`Role ${roleToAddName} not found in Keycloak realm ${KEYCLOAK_REALM}`);
        }

        // 6. Execute Updates

        // Remove old roles
        if (rolesToRemove.length > 0) {
            await fetch(`${baseUrl}/users/${keycloakUserId}/role-mappings/realm`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify(rolesToRemove),
            });
            console.log(`Removed Keycloak roles [${rolesToRemove.map(r => r.name).join(', ')}] from user ${keycloakUserId}`);
        }

        // Add new role
        // Check if user already has it to avoid error (though POST is usually idempotent-ish or safe)
        const alreadyHasRole = currentUserRoles.some(r => r.name === roleToAddName);

        if (roleToAdd && !alreadyHasRole) {
            await fetch(`${baseUrl}/users/${keycloakUserId}/role-mappings/realm`, {
                method: 'POST',
                headers,
                body: JSON.stringify([roleToAdd]),
            });
            console.log(`Added Keycloak role ${roleToAddName} to user ${keycloakUserId}`);
        }

    } catch (error) {
        console.error('Failed to sync role to Keycloak:', error);
        // Don't throw, just log. App state is primary, Keycloak is secondary sync here.
    }
}

/**
 * Get federated identities for a user
 */
export async function getFederatedIdentities(keycloakUserId: string): Promise<Array<{ identityProvider: string; userId: string; userName: string }>> {
    const token = await getAdminToken();
    if (!token) return [];

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const baseUrl = `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}`;

    try {
        const response = await fetch(`${baseUrl}/users/${keycloakUserId}/federated-identity`, { headers });
        if (!response.ok) {
            console.error(`Failed to fetch federated identities for ${keycloakUserId}: ${response.statusText}`);
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to get federated identities:', error);
        return [];
    }
}
