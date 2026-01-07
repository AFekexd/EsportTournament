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
import { ImageUpload } from "../components/common/ImageUpload";

interface TeamFormData {
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
}

const STEPS = [
  { id: 1, title: "Alapadatok", icon: FileText, description: "Név és leírás" },
  {
    id: 2,
    title: "Megjelenés",
    icon: ImageIcon,
    description: "Logó és Borítókép",
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
    coverUrl: "",
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
          coverUrl: formData.coverUrl || undefined,
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
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-left mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                Kezdjük az alapokkal
              </h2>
              <p className="text-gray-400 text-lg">
                Add meg a csapatod nevét és egy rövid leírást.
              </p>
            </div>

            <div className="space-y-6">
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
                      className={`w-full bg-transparent text-white border-0 rounded-xl px-4 py-4 placeholder-gray-600 focus:ring-0 focus:outline-none transition-all ${errors.name ? "text-red-400" : ""
                        }`}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Pl: Thunder Esports"
                      maxLength={50}
                      autoFocus
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
                    className="relative w-full bg-[#1a1b26] text-white rounded-xl border-0 px-4 py-3 placeholder-gray-600 focus:ring-0 focus:outline-none transition-all min-h-[160px] resize-none"
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
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-left mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                Csapat megjelenése
              </h2>
              <p className="text-gray-400 text-lg">
                Tölts fel egy logót és egy borítóképet, hogy egyedi legyen a csapatod.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Upload */}
                <div>
                  <label className="block text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <ImageIcon size={20} className="text-primary" />
                    Csapat Logó
                  </label>
                  <ImageUpload
                    value={formData.logoUrl}
                    onChange={(val) => setFormData({ ...formData, logoUrl: val })}
                    label=""
                    placeholder="https://imgur.com/logo.png"
                    aspect="square"
                    className="w-full"
                  />
                </div>

                {/* Preview / Info */}
                <div className="flex flex-col justify-center space-y-4 text-gray-400 bg-white/5 p-6 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" />
                    Tipp
                  </h4>
                  <p className="text-sm">
                    A logó megjelenik a ranglistákon, meccseknél és a csapat profilján.
                    Használj <span className="text-white">500x500px</span> vagy nagyobb felbontású, négyzetes képet.
                    PNG formátum ajánlott az átlátszó háttér miatt.
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-8">
                <label className="block text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <ImageIcon size={20} className="text-purple-400" />
                  Borítókép (Opcionális)
                </label>
                <ImageUpload
                  value={formData.coverUrl}
                  onChange={(val) => setFormData({ ...formData, coverUrl: val })}
                  label=""
                  placeholder="https://imgur.com/cover.jpg"
                  aspect="video"
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-2">
                  A borítókép a csapat profiljának tetején jelenik meg. Ajánlott méret: <span className="text-gray-400">1920x1080px</span>.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-left mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                Minden rendben?
              </h2>
              <p className="text-gray-400 text-lg">
                Ellenőrizd az adatokat a létrehozás előtt.
              </p>
            </div>

            <div className="bg-[#1a1b26]/80 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm relative group hover:border-white/20 transition-colors">
              {/* Cover Image Banner */}
              <div className="h-40 w-full relative bg-black/40 overflow-hidden">
                {formData.coverUrl ? (
                  <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-gray-900 to-black opacity-50 flex items-center justify-center text-gray-600 text-sm">
                    Nincs borítókép
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b26] to-transparent" />
              </div>

              <div className="px-8 pb-8 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-6">
                <div className="relative group-logo">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-500" />
                  <div className="w-32 h-32 relative rounded-full bg-black border-4 border-[#1a1b26] overflow-hidden flex-shrink-0 shadow-2xl">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#0E0F15]">
                        <span className="text-4xl font-black text-white/10">
                          {formData.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center md:text-left flex-1 space-y-3">
                  <h3 className="text-3xl font-black text-white tracking-tight">
                    {formData.name}
                  </h3>
                  <div className="h-px w-20 bg-white/10 mx-auto md:mx-0" />
                  <p className="text-gray-400 leading-relaxed text-lg font-light">
                    {formData.description || "Nincs leírás megadva."}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4 text-red-400">
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-300">Hiba történt</h4>
                  <p className="text-sm font-medium mt-1 opacity-90">{error}</p>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#0A0A0B] rounded-sm">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px] mix-blend-screen" />
      </div>

      <div className="max-w-6xl mx-auto relative">
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

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Hozd létre a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-500">
              Csapatodat
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Alapítsd meg saját csapatodat, toborozz tagokat és indulj el a
            dicsőség felé vezető úton.
          </p>
        </div>

        {/* Main Card */}
        {/* Main Card */}
        <div className="bg-[#12131A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
          {/* Horizontal Stepper */}
          <div className="w-full bg-[#0E0F15] border-b border-white/5 p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="relative max-w-4xl mx-auto">
              {/* Progress Bar Background */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 rounded-full" />
              {/* Active Progress Bar */}
              <div
                className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                }}
              />

              <div className="relative z-10 flex justify-between">
                {STEPS.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <div
                      key={step.id}
                      className="group flex flex-col items-center gap-3 cursor-pointer"
                      onClick={() => isCompleted && setCurrentStep(step.id)}
                    >
                      <div
                        className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 border-2 relative
                                                ${isActive
                            ? "bg-[#1a1b26] border-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-110 z-20"
                            : isCompleted
                              ? "bg-primary border-primary text-white z-20"
                              : "bg-[#0E0F15] border-white/10 text-gray-500 z-10 group-hover:border-white/20"
                          }
                                            `}
                      >
                        {isCompleted ? (
                          <Check size={20} />
                        ) : (
                          <step.icon
                            size={20}
                            className={isActive ? "animate-pulse" : ""}
                          />
                        )}
                      </div>

                      <div className="text-center absolute -bottom-8 w-32">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isActive
                            ? "text-white"
                            : isCompleted
                              ? "text-gray-300"
                              : "text-gray-600"
                            }`}
                        >
                          {step.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-4" /> {/* Spacer for labels */}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col relative bg-gradient-to-br from-[#12131A] to-[#0A0A0B]">
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-start items-center">
              <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-500">
                {renderStepContent()}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="p-8 border-t border-white/5 bg-[#0E0F15]/50 flex items-center justify-between backdrop-blur-sm sticky bottom-0 z-20">
              <button
                onClick={handleBack}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${currentStep > 1
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
                 /* Any extra global styles if needed, though Tailwind covers most */
            `}</style>
    </div>
  );
}
