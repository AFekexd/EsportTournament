import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ApiError } from './errorHandler.js';
import prisma from '../lib/prisma.js';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://www.keycloak.pollak.info';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'master';

// JWKS client for Keycloak
const client = jwksClient({
    jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

export interface KeycloakTokenPayload {
    sub: string;
    email?: string;
    preferred_username?: string;
    name?: string;
    realm_access?: {
        roles: string[];
    };
    resource_access?: {
        [key: string]: {
            roles: string[];
        };
    };
}

export interface AuthenticatedRequest extends Request {
    user?: KeycloakTokenPayload;
}

// Helper function to get the highest role from Keycloak token
export const getHighestRole = (tokenPayload: KeycloakTokenPayload): 'ADMIN' | 'MODERATOR' | 'ORGANIZER' | 'STUDENT' => {
    const realmRoles = tokenPayload.realm_access?.roles || [];

    // Check for roles in priority order
    if (realmRoles.includes('ADMIN')) {
        return 'ADMIN';
    }
    if (realmRoles.includes('MODERATOR')) {
        return 'MODERATOR';
    }
    if (realmRoles.includes('ORGANIZER')) {
        return 'ORGANIZER';
    }

    return 'STUDENT';
};

export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError('Nem található token', 401, 'UNAUTHORIZED');
        }

        const token = authHeader.substring(7);

        const decoded = await new Promise<KeycloakTokenPayload>((resolve, reject) => {
            jwt.verify(
                token,
                getKey,
                {
                    algorithms: ['RS256'],
                    issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
                },
                (err, decoded) => {
                    if (err) {
                        reject(new ApiError('Érvénytelen token', 401, 'INVALID_TOKEN'));
                    } else {
                        resolve(decoded as KeycloakTokenPayload);
                    }
                }
            );
        });

        req.user = decoded;
        next();
    } catch (error) {
        next(error);
    }
};

// Role-based access control
export const requireRole = (...roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError('Nincs bejelentkezve', 401, 'UNAUTHORIZED'));
        }

        const userRoles = req.user.realm_access?.roles || [];
        // Allow if user has one of the required roles OR is an ADMIN
        const hasRole = roles.some((role) => userRoles.includes(role)) || userRoles.includes('ADMIN');

        if (!hasRole) {
            return next(new ApiError('Nincs jogosultsága', 403, 'FORBIDDEN'));
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);

        const decoded = await new Promise<KeycloakTokenPayload>((resolve, reject) => {
            jwt.verify(
                token,
                getKey,
                {
                    algorithms: ['RS256'],
                    issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
                },
                (err, decoded) => {
                    if (err) {
                        resolve({} as KeycloakTokenPayload);
                    } else {
                        resolve(decoded as KeycloakTokenPayload);
                    }
                }
            );
        });

        if (decoded.sub) {
            req.user = decoded;
        }
        next();
    } catch (error) {
        next();
    }
};
