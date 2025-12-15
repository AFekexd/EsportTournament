import { UserMinus, Crown } from 'lucide-react';
import type { TeamMember } from '../../types';
import './MemberCard.css';

interface MemberCardProps {
    member: TeamMember;
    isOwner: boolean;
    currentUserId?: string;
    onRemove: () => void;
}

export function MemberCard({ member, isOwner, currentUserId, onRemove }: MemberCardProps) {
    const isCaptain = member.role === 'CAPTAIN';
    const isCurrentUser = member.userId === currentUserId;

    return (
        <div className="member-card card">
            <div className="member-avatar">
                {member.user?.avatarUrl ? (
                    <img src={member.user.avatarUrl} alt={member.user.displayName || member.user.username} />
                ) : (
                    <span>{(member.user?.displayName || member.user?.username || 'U').charAt(0).toUpperCase()}</span>
                )}
                {isCaptain && (
                    <div className="captain-badge" title="Csapatvezető">
                        <Crown size={14} />
                    </div>
                )}
            </div>

            <div className="member-info">
                <h3 className="member-name">{member.user?.displayName || member.user?.username}</h3>
                <p className="member-username">@{member.user?.username}</p>
                {member.user?.elo !== undefined && (
                    <p className="member-elo">{member.user.elo} ELO</p>
                )}
            </div>

            <div className="member-actions">
                <span className={`badge badge-${member.role.toLowerCase()}`}>
                    {member.role === 'CAPTAIN' ? 'Vezető' : 'Tag'}
                </span>

                {isOwner && !isCaptain && !isCurrentUser && (
                    <button
                        className="btn btn-sm btn-ghost remove-btn"
                        onClick={onRemove}
                        title="Eltávolítás"
                    >
                        <UserMinus size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
