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
  Users,
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
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Kezdjük az alapokkal
              </h2>
              <p className="text-muted-foreground text-lg">
                Add meg a csapatod nevét és egy rövid leírást.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Csapat neve <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <div className="relative bg-secondary/80 border border-border focus-within:border-primary rounded flex items-center transition-colors">
                    <div className="pl-4 text-muted-foreground mr-2">
                      <Shield size={18} />
                    </div>
                    <input
                      id="name"
                      type="text"
                      className={`w-full bg-transparent text-foreground border-0 rounded px-4 py-3.5 font-mono text-sm placeholder-muted-foreground focus:ring-0 focus:outline-none transition-all ${errors.name ? "text-red-400" : ""
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
                  <p className="text-xs font-mono text-red-400 mt-1 ml-1">
                    {errors.name}
                  </p>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground text-right">
                    {formData.name.length}/50
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Leírás
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    className="relative w-full bg-secondary/80 text-foreground rounded border border-border focus:border-primary px-4 py-3 font-mono text-sm placeholder-muted-foreground focus:ring-0 focus:outline-none transition-all min-h-[160px] resize-none"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Írj pár szót a csapatról, célokról..."
                    maxLength={500}
                  />
                </div>
                <p className="text-xs font-mono text-muted-foreground text-right">
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
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Csapat megjelenése
              </h2>
              <p className="text-muted-foreground text-lg">
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
                <div className="flex flex-col justify-center space-y-4 text-muted-foreground bg-secondary p-6 rounded-2xl border border-border">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" />
                    Tipp
                  </h4>
                  <p className="text-sm">
                    A logó megjelenik a ranglistákon, meccseknél és a csapat profilján.
                    Használj <span className="text-foreground">500x500px</span> vagy nagyobb felbontású, négyzetes képet.
                    PNG formátum ajánlott az átlátszó háttér miatt.
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <label className="block text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <ImageIcon size={20} className="text-primary" />
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
                <p className="text-sm text-muted-foreground mt-2">
                  A borítókép a csapat profiljának tetején jelenik meg. Ajánlott méret: <span className="text-muted-foreground">1920x1080px</span>.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-left mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Minden rendben?
              </h2>
              <p className="text-muted-foreground text-lg">
                Ellenőrizd az adatokat a létrehozás előtt.
              </p>
            </div>

            <div className="tactical-card rounded-lg border border-border overflow-hidden relative group transition-colors">
              {/* Cover Image Banner */}
              <div className="h-40 w-full relative bg-secondary overflow-hidden">
                {formData.coverUrl ? (
                  <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground font-mono text-xs">
                    Nincs borítókép
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              </div>

              <div className="px-8 pb-8 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-6">
                <div className="relative group-logo">
                  <div className="w-28 h-28 relative rounded-lg bg-card border-2 border-border overflow-hidden flex-shrink-0 shadow-2xl">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary font-mono">
                        <span className="text-3xl font-bold text-muted-foreground">
                          {formData.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center md:text-left flex-1 space-y-2">
                  <h3 className="text-2xl font-display font-bold uppercase tracking-wider text-foreground">
                    {formData.name}
                  </h3>
                  <p className="text-muted-foreground font-mono text-sm leading-relaxed">
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
    <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden rounded-sm">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px] mix-blend-screen" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => navigate("/teams")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all hover:-translate-x-1"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Vissza</span>
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-[#121824] border border-border/80 font-mono text-xs font-bold text-primary uppercase tracking-wider">
            <Users size={12} className="text-primary" />
            // ÚJ ALAKULAT
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-foreground mb-3">
            Új Csapat Alapítása
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            Alapítsd meg saját esport csapatodat, szabd testre a logót és hívd meg a tagokat a versenyekre.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#121824] border border-border/80 rounded-lg shadow-xl overflow-hidden flex flex-col min-h-[560px]">
          {/* Horizontal Stepper */}
          <div className="w-full bg-[#0B0F17] border-b border-border/80 p-6 relative overflow-hidden">
            <div className="relative max-w-3xl mx-auto">
              {/* Progress Bar Background */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -translate-y-1/2" />
              {/* Active Progress Bar */}
              <div
                className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-300"
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
                      className="group flex flex-col items-center gap-2 cursor-pointer"
                      onClick={() => isCompleted && setCurrentStep(step.id)}
                    >
                      <div
                        className={`
                          w-10 h-10 rounded border flex items-center justify-center transition-all duration-200 relative
                          ${isActive
                            ? "bg-[#121824] border-primary text-primary font-bold z-20"
                            : isCompleted
                              ? "bg-primary border-primary text-foreground z-20"
                              : "bg-[#0B0F17] border-border text-muted-foreground z-10 group-hover:border-border"
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
                            ? "text-foreground"
                            : isCompleted
                              ? "text-gray-300"
                              : "text-muted-foreground"
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
          <div className="flex-1 flex flex-col relative bg-gradient-to-br from-card to-background">
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-start items-center">
              <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-500">
                {renderStepContent()}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="p-6 md:p-8 border-t border-border bg-card/95 flex items-center justify-between backdrop-blur-sm sticky bottom-0 z-20">
              <button
                onClick={handleBack}
                className={`flex items-center gap-2 px-5 py-2.5 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all ${currentStep > 1
                  ? "text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
                  : "opacity-0 pointer-events-none"
                  }`}
              >
                <ArrowLeft size={16} />
                Vissza
              </button>

              {currentStep < STEPS.length ? (
                <button
                  onClick={handleNext}
                  className="group flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono text-xs uppercase tracking-wider font-bold shadow-md shadow-primary/20 transition-all"
                >
                  Következő
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={createLoading}
                  className="group flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono text-xs uppercase tracking-wider font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {createLoading ? (
                    <div className="w-4 h-4 border-2 border-border border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Csapat létrehozása
                      <Sparkles size={16} />
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
