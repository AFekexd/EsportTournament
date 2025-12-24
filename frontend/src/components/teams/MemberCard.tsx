import { UserMinus, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import type { TeamMember } from "../../types";

interface MemberCardProps {
  member: TeamMember;
  isOwner: boolean;
  currentUserId?: string;
  onRemove: () => void;
}

export function MemberCard({
  member,
  isOwner,
  currentUserId,
  onRemove,
}: MemberCardProps) {
  const isCaptain = member.role === "CAPTAIN";
  const isCurrentUser = member.userId === currentUserId;

  return (
    <div className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-xl border border-border transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_hsla(var(--primary),0.2)]">
      <Link
        to={`/profile/${member.userId}`}
        className="relative w-14 h-14 shrink-0 block"
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-[hsl(320,100%,65%)] flex items-center justify-center text-white font-bold text-xl overflow-hidden hover:opacity-80 transition-opacity">
          {member.user?.avatarUrl ? (
            <img
              src={member.user.avatarUrl}
              alt={member.user.displayName || member.user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>
              {(member.user?.displayName || member.user?.username || "U")
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>
        {isCaptain && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white border-2 border-card z-10 shadow-sm"
            title="Csapatvezető"
          >
            <Crown size={14} />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/profile/${member.userId}`}
          className="hover:text-primary transition-colors"
        >
          <h3 className="text-base font-semibold text-foreground mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {member.user?.displayName || member.user?.username}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-1">
          @{member.user?.username}
        </p>
        {member.user?.elo !== undefined && (
          <p className="text-xs text-primary font-semibold">
            {member.user.elo} ELO
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
            member.role === "CAPTAIN"
              ? "bg-gradient-to-br from-accent/20 to-primary/20 text-primary border border-primary/30"
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          {member.role === "CAPTAIN" ? "Vezető" : "Tag"}
        </span>

        {isOwner && !isCaptain && !isCurrentUser && (
          <button
            className="inline-flex items-center justify-center gap-2 px-2 py-2 text-sm font-medium rounded-md transition-colors hover:bg-destructive/10 text-destructive"
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
