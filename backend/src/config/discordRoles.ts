import { Role } from '../generated/prisma/enums.js';

export const DISCORD_ROLE_MAP: Record<Role, string> = {
    [Role.ADMIN]: 'Admin',
    [Role.ORGANIZER]: 'Szervező',
    [Role.MODERATOR]: 'Moderátor',
    [Role.TEACHER]: 'Tanár',
    [Role.STUDENT]: 'Diák',
};

// Optional: Roles that verified users should ALWAYS have
export const BASE_VERIFIED_ROLES = ['Verified', 'Tag'];

// Roles to remove when verifying (e.g. Guest)
export const GUEST_ROLES = ['Vendég', 'Unverified'];
