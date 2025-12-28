import { Megaphone, Users, Gamepad2, Mic, Rocket } from "lucide-react";

export function TVRecruitmentPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050505] font-sans selection:bg-purple-500/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1a1025] via-[#050505] to-[#0f0f15]" />
      <div className="absolute top-[20%] right-[10%] h-[60%] w-[60%] rounded-full bg-purple-900/10 blur-[150px] animate-pulse" />
      <div className="absolute bottom-[20%] left-[10%] h-[60%] w-[60%] rounded-full bg-pink-900/10 blur-[150px] animate-pulse delay-1000" />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-1000">
        {/* Header Icon */}
        <div className="mb-6 flex h-40 w-40 items-center justify-center rounded-xl p-2 bg-gradient-to-br from-purple-500 to-pink-600 shadow-[0_0_80px_rgba(168,85,247,0.4)] animate-bounce-slow">
          <Megaphone className="h-20 w-20 text-white" />
        </div>

        {/* Main Title */}
        <h1 className="mb-6 text-8xl font-black uppercase tracking-tight text-white drop-shadow-xl">
          Csatlakozz a Csapathoz!
        </h1>

        <p className="mb-16 max-w-5xl text-4xl font-light text-gray-300 leading-relaxed">
          Szeretnéd alakítani az iskolai esport jövőjét? <br />
          <span className="text-purple-400 font-bold">
            Jelentkezz a csapatba!
          </span>
        </p>

        {/* Roles Grid */}
        <div className="grid grid-cols-4 gap-12 mb-20 w-full max-w-7xl px-12">
          <RoleCard
            icon={Users}
            title="Szervező"
            desc="Bajnokságok lebonyolítása"
            color="text-blue-400"
          />
          <RoleCard
            icon={Gamepad2}
            title="Moderátor"
            desc="Fair play felügyelete"
            color="text-green-400"
          />
          <RoleCard
            icon={Rocket}
            title="Marketing"
            desc="Social Media & Design"
            color="text-purple-400"
          />
          <RoleCard
            icon={Mic}
            title="Kommentátor"
            desc="Meccsek közvetítése"
            color="text-pink-400"
          />
        </div>

        {/* Contact Info Footer */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-10 backdrop-blur-md max-w-4xl w-full">
          <h3 className="text-3xl font-bold text-white mb-4 uppercase tracking-widest">
            Jelentkezés és Információ
          </h3>
          <div className="flex flex-col gap-2 text-2xl text-gray-300">
            <p>
              Keressétek a{" "}
              <span className="text-white font-black bg-primary/20 px-3 py-1 rounded">
                DÖK-ös
              </span>{" "}
              diáktársaitokat
            </p>
            <p className="text-sm uppercase tracking-widest opacity-50 my-2">
              - VAGY -
            </p>
            <p>
              <span className="text-white font-black bg-primary/20 px-3 py-1 rounded">
                Feke András
              </span>{" "}
              tanár urat{" "}
              <span className="text-white font-black  py-1 rounded">
                - Info VI.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 right-12 text-right">
        <h4 className="text-xl font-bold text-white tracking-wider">
          POLLÁK ESPORT
        </h4>
        <p className="text-sm text-gray-400">
          További infó: esport.pollak.info
        </p>
      </div>

      <style>{`
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(-5%); }
          50% { transform: translateY(5%); }
        }
      `}</style>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: any;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center bg-[#1a1b26]/50 p-8 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl hover:bg-[#1a1b26] transition-all transform hover:scale-105 group">
      <Icon
        className={`h-16 w-16 mb-6 ${color} group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all`}
      />
      <h3 className="text-3xl font-bold text-white mb-2 uppercase">{title}</h3>
      <p className="text-gray-400 text-lg">{desc}</p>
    </div>
  );
}
