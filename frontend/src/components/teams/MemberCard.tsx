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
    <div className="group relative flex items-center gap-4 p-4 bg-gradient-to-br from-[#1a1b26] to-[#0f1015] border border-white/5 rounded-xl hover:border-primary/30 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

      <Link
        to={`/profile/${member.userId}`}
        className="relative w-16 h-16 shrink-0 block"
      >
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#2a2b36] to-[#1a1b26] p-0.5 shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
          <div className="w-full h-full rounded-[14px] overflow-hidden bg-[#0f1015] flex items-center justify-center relative">
            {member.user?.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt={member.user.displayName || member.user.username}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <span className="text-xl font-bold text-gray-400 group-hover:text-white transition-colors">
                {(member.user?.displayName || member.user?.username || "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}

            {/* Captain Crown Overlay */}
            {isCaptain && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                <Crown size={12} className="text-yellow-400 drop-shadow-md" />
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="flex-1 min-w-0 z-10">
        <Link
          to={`/profile/${member.userId}`}
          className="block group-hover:translate-x-1 transition-transform duration-300"
        >
          <h3 className="text-lg font-bold text-white mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-primary transition-colors">
            {member.user?.displayName || member.user?.username}
          </h3>
          <p className="text-xs font-medium text-gray-500 mb-2 font-mono">
            @{member.user?.username}
          </p>
        </Link>

        <div className="flex items-center gap-3">
          {member.user?.elo !== undefined && (
            <div className="text-xs font-bold text-gray-300 bg-white/5 px-2 py-0.5 rounded border border-white/5 group-hover:border-primary/20 transition-colors">
              {member.user.elo} ELO
            </div>
          )}

          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${member.role === "CAPTAIN"
                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
              }`}
          >
            {member.role === "CAPTAIN" ? "Kapitány" : "Tag"}
          </span>
        </div>
      </div>

      {isOwner && !isCaptain && !isCurrentUser && (
        <button
          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 z-20"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          title="Eltávolítás"
        >
          <UserMinus size={16} />
        </button>
      )}
    </div>
  );
}
