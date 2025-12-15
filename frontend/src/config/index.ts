const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.pollak.info';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'master';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'esportadmin';

export const keycloakConfig = {
    url: KEYCLOAK_URL,
    realm: KEYCLOAK_REALM,
    clientId: KEYCLOAK_CLIENT_ID,
};

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
