import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Shield,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { createTeam } from "../store/slices/teamsSlice";

interface TeamFormData {
  name: string;
  description: string;
  logoUrl: string;
}

const STEPS = [
  { id: 1, title: "Alapadatok", icon: FileText, description: "Név és leírás" },
  {
    id: 2,
    title: "Megjelenés",
    icon: ImageIcon,
    description: "Logó és stílus",
  },
  { id: 3, title: "Összegzés", icon: Check, description: "Ellenőrzés" },
];

export function TeamCreatePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { createLoading, error } = useAppSelector((state) => state.teams);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    logoUrl: "",
  });
  const [errors, setErrors] = useState<Partial<TeamFormData>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<TeamFormData> = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.name || formData.name.length < 3) {
        newErrors.name =
          "A csapat nevének legalább 3 karakter hosszúnak kell lennie";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      const result = await dispatch(
        createTeam({
          name: formData.name,
          description: formData.description || undefined,
          logoUrl: formData.logoUrl || undefined,
        })
      ).unwrap();

      navigate(`/teams/${result.id}`);
    } catch (err) {
      console.error("Failed to create team:", err);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Kezdjük az alapokkal
              </h2>
              <p className="text-gray-400">
                Add meg a csapatod nevét és egy rövid leírást.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-300 ml-1"
                >
                  Csapat neve <span className="text-primary">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                  <div className="relative bg-[#1a1b26] rounded-xl flex items-center">
                    <div className="pl-4 text-gray-500 mr-2">
                      <Shield size={20} />
                    </div>
                    <input
                      id="name"
                      type="text"
                      className={`w-full bg-transparent text-white border-0 rounded-xl px-4 py-3.5 placeholder-gray-600 focus:ring-0 focus:outline-none transition-all ${
                        errors.name ? "text-red-400" : ""
                      }`}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Pl: Thunder Esports"
                      maxLength={50}
                    />
                  </div>
                </div>
                {errors.name ? (
                  <p className="text-sm text-red-400 mt-1 ml-1">
                    {errors.name}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 text-right">
                    {formData.name.length}/50
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-300 ml-1"
                >
                  Leírás
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                  <textarea
                    id="description"
                    className="relative w-full bg-[#1a1b26] text-white rounded-xl border-0 px-4 py-3 placeholder-gray-600 focus:ring-0 focus:outline-none transition-all min-h-[120px] resize-none"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Írj pár szót a csapatról, célokról..."
                    maxLength={500}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right">
                  {formData.description.length}/500
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Csapat megjelenése
              </h2>
              <p className="text-gray-400">
                Adj hozzá logót, hogy kitűnjetek a tömegből.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="logoUrl"
                  className="text-sm font-medium text-gray-300 ml-1"
                >
                  Logó URL (opcionális)
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                  <div className="relative bg-[#1a1b26] rounded-xl flex items-center">
                    <div className="pl-4 text-gray-500 mr-2">
                      <ImageIcon size={20} />
                    </div>
                    <input
                      id="logoUrl"
                      type="url"
                      className="w-full bg-transparent text-white border-0 rounded-xl px-4 py-3.5 placeholder-gray-600 focus:ring-0 focus:outline-none transition-all"
                      value={formData.logoUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, logoUrl: e.target.value })
                      }
                      placeholder="https://imgur.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary to-purple-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-40 h-40 rounded-full bg-[#1a1b26] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-colors">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-600">
                        <ImageIcon className="w-10 h-10" />
                        <span className="text-xs">Nincs logó</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Minden rendben?
              </h2>
              <p className="text-gray-400">
                Ellenőrizd az adatokat a létrehozás előtt.
              </p>
            </div>

            <div className="bg-[#1a1b26]/80 rounded-2xl border border-white/10 p-6 space-y-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />

              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-24 h-24 rounded-full bg-black/40 border border-white/10 overflow-hidden flex-shrink-0 shadow-xl">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white/20">
                        {formData.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {formData.name}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {formData.description || "Nincs leírás megadva."}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen relative py-8 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#0A0A0B] rounded-sm">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[100px] mix-blend-screen" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => navigate("/teams")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:-translate-x-1"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Vissza</span>
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Sparkles size={12} className="text-primary" />
            Új Csapat
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-2xl">
            Hozd létre a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-500">
              Csapatodat
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light">
            Alapítsd meg saját csapatodat, toborozz tagokat és indulj el a
            dicsőség felé vezető úton.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#12131A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          {/* Sidebar Steps - improved contrast and styling */}
          <div className="w-full md:w-80 bg-[#0E0F15] border-b md:border-b-0 md:border-r border-white/5 p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            <div className="relative space-y-8">
              {STEPS.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div
                    key={step.id}
                    className="relative group cursor-pointer"
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                  >
                    {/* Connecting Line */}
                    {index < STEPS.length - 1 && (
                      <div
                        className={`absolute left-5 top-14 bottom-0 w-0.5 h-16 transition-colors duration-500 ${
                          isCompleted ? "bg-primary" : "bg-white/5"
                        }`}
                      />
                    )}

                    <div
                      className={`flex items-start gap-4 transition-all duration-300 ${
                        isActive ? "translate-x-2" : ""
                      }`}
                    >
                      <div
                        className={`
                                                w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 border
                                                ${
                                                  isActive
                                                    ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-110"
                                                    : isCompleted
                                                    ? "bg-[#1a1b26] text-primary border-primary/50"
                                                    : "bg-[#1a1b26] text-gray-600 border-white/5 group-hover:border-white/20"
                                                }
                                            `}
                      >
                        {isCompleted ? (
                          <Check size={18} />
                        ) : (
                          <step.icon
                            size={18}
                            className={isActive ? "animate-bounce-subtle" : ""}
                          />
                        )}
                      </div>
                      <div className="pt-1">
                        <h3
                          className={`font-bold text-sm tracking-wide uppercase mb-1 transition-colors ${
                            isActive
                              ? "text-white"
                              : isCompleted
                              ? "text-gray-300"
                              : "text-gray-600"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={`text-xs transition-colors ${
                            isActive ? "text-primary/80" : "text-gray-600"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col relative bg-gradient-to-br from-[#12131A] to-[#0A0A0B]">
            <div className="flex-1 p-8 md:p-12 flex items-center justify-center">
              <div className="w-full max-w-lg">{renderStepContent()}</div>
            </div>

            {/* Navigation Footer */}
            <div className="p-8 border-t border-white/5 bg-[#0E0F15]/50 flex items-center justify-between backdrop-blur-sm">
              <button
                onClick={handleBack}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentStep > 1
                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <ArrowLeft size={18} />
                Vissza
              </button>

              {currentStep < STEPS.length ? (
                <button
                  onClick={handleNext}
                  className="group flex items-center gap-2 px-8 py-3.5 bg-white text-black rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Következő
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={createLoading}
                  className="group flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {createLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Csapat létrehozása
                      <Sparkles size={18} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(5%); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
            `}</style>
    </div>
  );
}
