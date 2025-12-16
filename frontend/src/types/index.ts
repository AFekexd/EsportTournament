export interface User {
    id: string;
    keycloakId: string;
    email: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    role: 'ADMIN' | 'ORGANIZER' | 'MODERATOR' | 'STUDENT';
    elo: number;
    createdAt: string;
    updatedAt: string;
    teamMemberships?: TeamMember[];
    ownedTeams?: Team[];
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    joinCode: string;
    ownerId: string;
    owner?: User;
    elo: number;
    createdAt: string;
    updatedAt: string;
    members?: TeamMember[];
    tournamentEntries?: TournamentEntry[];
    _count?: {
        tournamentEntries: number;
    };
}

export interface TeamMember {
    id: string;
    userId: string;
    user?: User;
    teamId: string;
    team?: Team;
    role: 'CAPTAIN' | 'MEMBER';
    joinedAt: string;
}

export interface Game {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    rules?: string;
    teamSize: number;
    createdAt: string;
    tournaments?: Tournament[];
    _count?: {
        tournaments: number;
        gameStats: number;
    };
}

export interface Tournament {
    id: string;
    name: string;
    description?: string;
    gameId: string;
    game?: Game;
    format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
    status: 'DRAFT' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    maxTeams: number;
    startDate: string;
    endDate?: string;
    registrationDeadline: string;
    notifyUsers?: boolean;
    notifyDiscord?: boolean;
    discordChannelId?: string;
    createdAt: string;
    updatedAt: string;
    entries?: TournamentEntry[];
    matches?: Match[];
    _count?: {
        entries: number;
        matches: number;
    };
}

export interface TournamentEntry {
    id: string;
    tournamentId: string;
    tournament?: Tournament;
    teamId?: string;  // Optional for solo tournaments
    team?: Team;
    userId?: string;  // For solo tournaments
    user?: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        elo?: number;
    };
    seed?: number;
    registeredAt: string;
}

export interface Match {
    id: string;
    tournamentId: string;
    tournament?: Tournament;
    round: number;
    position: number;
    bracketType?: 'UPPER' | 'LOWER' | 'GRAND_FINAL';
    // Team fields (for team tournaments)
    homeTeamId?: string;
    homeTeam?: Team;
    awayTeamId?: string;
    awayTeam?: Team;
    winnerId?: string;
    winner?: Team;
    // User fields (for solo/1v1 tournaments)
    homeUserId?: string;
    homeUser?: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        elo?: number;
    };
    awayUserId?: string;
    awayUser?: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        elo?: number;
    };
    winnerUserId?: string;
    winnerUser?: {
        id: string;
        username: string;
        displayName?: string;
    };
    // Scores and status
    homeScore?: number;
    awayScore?: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    scheduledAt?: string;
    playedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'TOURNAMENT_INVITE' | 'TEAM_INVITE' | 'MATCH_SCHEDULED' | 'MATCH_RESULT' | 'SYSTEM';
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code: string;
    };
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
