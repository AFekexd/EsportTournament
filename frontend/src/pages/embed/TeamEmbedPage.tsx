import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { fetchTeam } from "../../store/slices/teamsSlice";
import { Users } from "lucide-react";
import { LazyImage } from "../../components/common/LazyImage";

export function TeamEmbedPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentTeam, isLoading } = useAppSelector((state) => state.teams);

  useEffect(() => {
    if (id) {
      dispatch(fetchTeam(id));
    }
  }, [id, dispatch]);

  if (isLoading || !currentTeam) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1015]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0f1015] overflow-hidden flex flex-col relative group">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        {currentTeam.coverUrl ? (
          <LazyImage
            src={currentTeam.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500 scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-purple-900/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015] via-[#0f1015]/80 to-transparent" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 justify-center items-center text-center">
        {/* Logo */}
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-[#1a1b26] p-1.5 border border-white/10 shadow-2xl mb-4 transform group-hover:scale-105 transition-transform duration-300">
          <LazyImage
            src={currentTeam.logoUrl || ""}
            alt={currentTeam.name}
            fallbackText={currentTeam.name.charAt(0).toUpperCase()}
            className="w-full h-full rounded-xl"
          />
        </div>

        {/* Team Name */}
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">
          {currentTeam.name}
        </h1>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm font-medium bg-white/5 backdrop-blur-sm border border-white/5 rounded-full px-4 py-2 mb-6">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Users size={14} />
            <span className="text-white font-bold">
              {currentTeam.members?.length || 0}
            </span>{" "}
            Tag
          </div>
        </div>

        {/* Members Preview */}
        {currentTeam.members && currentTeam.members.length > 0 && (
          <div className="flex -space-x-3 mb-6">
            {currentTeam.members.slice(0, 5).map((member) => (
              <div
                key={member.id}
                className="w-10 h-10 rounded-full border-2 border-[#0f1015] relative group/member"
              >
                <LazyImage
                  src={member.user?.avatarUrl || ""}
                  alt={member.user?.username || ""}
                  fallbackText={member.user?.username?.charAt(0).toUpperCase()}
                  className="w-full h-full rounded-full bg-[#1a1b26]"
                />
              </div>
            ))}
            {currentTeam.members.length > 5 && (
              <div className="w-10 h-10 rounded-full border-2 border-[#0f1015] bg-[#1a1b26] flex items-center justify-center text-xs font-bold text-white">
                +{currentTeam.members.length - 5}
              </div>
            )}
          </div>
        )}

        <a
          href={`${window.location.origin}/teams/${currentTeam.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
        >
          Csapat megtekintése
        </a>
      </div>

      {/* Powered by Footer */}
      <div className="relative z-10 p-3 text-center">
        <a
          href="/"
          target="_blank"
          className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"
        >
          Powered by Esport Tournament
        </a>
      </div>
    </div>
  );
}
