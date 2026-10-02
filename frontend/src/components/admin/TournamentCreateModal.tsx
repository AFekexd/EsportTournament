import { useState, useEffect } from "react";
import { X, Trophy, Search, Globe, Loader2, Gamepad2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { createTournament } from "../../store/slices/tournamentsSlice";
import { fetchGames, searchGlobalGames, selectGlobalGame, type GlobalGame } from "../../store/slices/gamesSlice";
import { ImageUpload } from "../common/ImageUpload";
import { toast } from "sonner";

interface TournamentCreateModalProps {
  onClose: () => void;
}

export function TournamentCreateModal({ onClose }: TournamentCreateModalProps) {
  const dispatch = useAppDispatch();
  const { createLoading } = useAppSelector((state) => state.tournaments);
  const { games, globalGames, globalLoading } = useAppSelector((state) => state.games);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showGlobalPicker, setShowGlobalPicker] = useState(false);
  const [selectingGlobal, setSelectingGlobal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    gameId: "",
    format: "SINGLE_ELIMINATION",
    maxTeams: 16,
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    hasQualifier: false,
    qualifierMatches: 10,
    qualifierMinPoints: 50,
    participationType: "TEAM", // 'INDIVIDUAL' or 'TEAM'
    teamSize: 5,
    requireRank: true,
    streamUrl: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    dispatch(fetchGames());
  }, [dispatch]);

  const handleSearchGlobal = (query: string) => {
    setGlobalSearchQuery(query);
    dispatch(searchGlobalGames(query));
  };

  const handleOpenGlobalPicker = () => {
    setShowGlobalPicker(true);
    if (!globalGames.length) {
      dispatch(searchGlobalGames(""));
    }
  };

  const handleSelectGlobalGame = async (g: GlobalGame) => {
    setSelectingGlobal(true);
    try {
      const savedGame = await dispatch(selectGlobalGame({
        name: g.name,
        imageUrl: g.backgroundImage,
        description: g.genres?.join(", ") || undefined,
        teamSize: g.teamSize || 1,
      })).unwrap();

      setFormData(prev => ({
        ...prev,
        gameId: savedGame.id,
        imageUrl: prev.imageUrl || savedGame.imageUrl || "",
        teamSize: savedGame.teamSize || prev.teamSize,
        participationType: (savedGame.teamSize === 1) ? "INDIVIDUAL" : "TEAM"
      }));
      setShowGlobalPicker(false);
      toast.success(`Játék kiválasztva: ${savedGame.name}`);
    } catch (err: any) {
      console.error("Failed to select global game:", err);
      toast.error(err?.message || "Nem sikerült kiválasztani a globális játékot");
    } finally {
      setSelectingGlobal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.name || formData.name.length < 3) {
      newErrors.name =
        "A verseny nevének legalább 3 karakter hosszúnak kell lennie";
    }
    if (!formData.gameId) {
      newErrors.gameId = "Válassz egy játékot";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Add meg a kezdési dátumot";
    }
    if (!formData.registrationDeadline) {
      newErrors.registrationDeadline = "Add meg a jelentkezési határidőt";
    }
    if (formData.maxTeams < 2) {
      newErrors.maxTeams = "Legalább 2 résztvevő szükséges";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await dispatch(
        createTournament({
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          gameId: formData.gameId,
          format: formData.format,
          maxTeams: formData.maxTeams,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          registrationDeadline: formData.registrationDeadline,
          hasQualifier: formData.hasQualifier,
          qualifierMatches: formData.hasQualifier
            ? formData.qualifierMatches
            : 0,
          qualifierMinPoints: formData.hasQualifier
            ? formData.qualifierMinPoints
            : 0,
          teamSize:
            formData.participationType === "INDIVIDUAL" ? 1 : formData.teamSize,
          requireRank: formData.requireRank,
          streamUrl: formData.streamUrl || undefined,
        }),
      ).unwrap();

      onClose();
    } catch (err) {
      console.error("Failed to create tournament:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="tactical-card w-full max-w-3xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground">
            Új verseny létrehozása
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name & Game */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="tournament-name"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Verseny neve <span className="text-destructive">*</span>
              </label>
              <input
                id="tournament-name"
                type="text"
                className={`w-full px-4 py-2.5 bg-secondary/80 border ${errors.name ? "border-destructive" : "border-border"
                  } rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors`}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Pl: Tavaszi CS2 Kupa"
                maxLength={100}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.name ? (
                  <p className="text-destructive text-xs font-mono">{errors.name}</p>
                ) : (
                  <span></span>
                )}
                <span className="text-xs font-mono text-muted-foreground">
                  {formData.name.length}/100
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="tournament-game"
                  className="block text-xs font-mono uppercase tracking-wider text-muted-foreground"
                >
                  Játék <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleOpenGlobalPicker}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-mono transition-colors"
                >
                  <Globe size={14} />
                  Keresés a RAWG API-ban
                </button>
              </div>

              <select
                id="tournament-game"
                className={`w-full px-4 py-2.5 bg-secondary/80 border ${errors.gameId ? "border-destructive" : "border-border"
                  } rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors`}
                value={formData.gameId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = games.find(g => g.id === selectedId);
                  setFormData({
                    ...formData,
                    gameId: selectedId,
                    ...(found?.imageUrl && !formData.imageUrl ? { imageUrl: found.imageUrl } : {}),
                    ...(found?.teamSize ? {
                      teamSize: found.teamSize,
                      participationType: found.teamSize === 1 ? "INDIVIDUAL" : "TEAM"
                    } : {})
                  });
                }}
              >
                <option value="">Válassz játékot...</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>

              {/* RAWG Global Game Picker Modal / Panel */}
              {showGlobalPicker && (
                <div className="mt-3 p-4 bg-[#0B1015] border border-primary/30 rounded-xl space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Globe size={16} />
                      <span>Globális Játék Kereső (RAWG API)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGlobalPicker(false)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Bezárás ✕
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={globalSearchQuery}
                      onChange={(e) => handleSearchGlobal(e.target.value)}
                      placeholder="Keress játékra (pl. Counter-Strike, Valorant, Rocket League)..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-secondary/80 border border-border rounded font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  {globalLoading || selectingGlobal ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-muted-foreground">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span>{selectingGlobal ? "Játék importálása a versenyhez..." : "Keresés a RAWG API-ban..."}</span>
                    </div>
                  ) : globalGames.length === 0 ? (
                    <div className="text-center py-4 text-xs font-mono text-muted-foreground">
                      Nincs találat erre a keresésre.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {globalGames.map((g) => (
                        <button
                          key={String(g.id)}
                          type="button"
                          disabled={selectingGlobal}
                          onClick={() => handleSelectGlobalGame(g)}
                          className="flex items-center gap-3 p-2 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded text-left transition-all group"
                        >
                          {g.backgroundImage ? (
                            <img
                              src={g.backgroundImage}
                              alt={g.name}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                              <Gamepad2 size={20} className="text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                              {g.name}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">
                              {g.genres?.slice(0, 2).join(", ") || (g.teamSize ? `${g.teamSize}v${g.teamSize}` : "Esport")}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {errors.gameId && (
                <p className="text-destructive text-xs font-mono mt-1">{errors.gameId}</p>
              )}
            </div>
          </div>

          {/* Participation Type & Team Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Típus <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      participationType: "INDIVIDUAL",
                    })
                  }
                  className={`px-4 py-2.5 rounded border font-mono text-xs uppercase tracking-wider font-semibold transition-all ${formData.participationType === "INDIVIDUAL"
                      ? "bg-primary/20 border-primary text-primary shadow-sm"
                      : "bg-secondary/60 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                >
                  Egyéni (1v1)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, participationType: "TEAM" })
                  }
                  className={`px-4 py-2.5 rounded border font-mono text-xs uppercase tracking-wider font-semibold transition-all ${formData.participationType === "TEAM"
                      ? "bg-primary/20 border-primary text-primary shadow-sm"
                      : "bg-secondary/60 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                >
                  Csapat
                </button>
              </div>
            </div>

            {formData.participationType === "TEAM" && (
              <div>
                <label
                  htmlFor="team-size"
                  className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Csapatméret <span className="text-destructive">*</span>
                </label>
                <select
                  id="team-size"
                  className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                  value={formData.teamSize}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      teamSize: parseInt(e.target.value),
                    })
                  }
                >
                  <option value={2}>2v2</option>
                  <option value={3}>3v3</option>
                  <option value={4}>4v4</option>
                  <option value={5}>5v5</option>
                  <option value={6}>6v6</option>
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="tournament-description"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Leírás
            </label>
            <textarea
              id="tournament-description"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Rövid leírás a versenyről..."
              rows={3}
              maxLength={500}
            />
            <div className="text-right mt-1">
              <span className="text-xs font-mono text-muted-foreground">
                {formData.description.length}/500
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <ImageUpload
            value={formData.imageUrl}
            onChange={(value) => setFormData({ ...formData, imageUrl: value })}
            label="Verseny képe"
            placeholder="https://example.com/image.jpg"
            maxSizeMB={15}
          />

          {/* Format & Max Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="tournament-format"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Formátum
              </label>
              <select
                id="tournament-format"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                value={formData.format}
                onChange={(e) =>
                  setFormData({ ...formData, format: e.target.value })
                }
              >
                <option value="SINGLE_ELIMINATION">Egyenes kieséses</option>
                <option value="DOUBLE_ELIMINATION">Dupla kieséses</option>
                <option value="ROUND_ROBIN">Körmérkőzés</option>
                <option value="SWISS">Svájci</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="tournament-streamUrl"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Stream URL (Twitch/TikTok/YouTube)
              </label>
              <input
                id="tournament-streamUrl"
                type="text"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                value={formData.streamUrl}
                onChange={(e) =>
                  setFormData({ ...formData, streamUrl: e.target.value })
                }
                placeholder="https://twitch.tv/..."
              />
            </div>

            <div>
              <label
                htmlFor="tournament-maxTeams"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Max{" "}
                {formData.participationType === "INDIVIDUAL"
                  ? "indulók"
                  : "csapatok"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                id="tournament-maxTeams"
                type="number"
                className={`w-full px-4 py-2.5 bg-secondary/80 border ${errors.maxTeams ? "border-destructive" : "border-border"
                  } rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors`}
                value={formData.maxTeams}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxTeams: parseInt(e.target.value),
                  })
                }
                min={2}
                max={500}
              />
              {errors.maxTeams && (
                <p className="text-destructive text-xs font-mono mt-1">{errors.maxTeams}</p>
              )}
            </div>
          </div>

          {/* Registration Deadline & Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="tournament-regDeadline"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Jelentkezési határidő <span className="text-destructive">*</span>
              </label>
              <input
                id="tournament-regDeadline"
                type="datetime-local"
                className={`w-full px-4 py-2.5 bg-secondary/80 border ${errors.registrationDeadline
                    ? "border-destructive"
                    : "border-border"
                  } rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors`}
                value={formData.registrationDeadline}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registrationDeadline: e.target.value,
                  })
                }
                onClick={(e) => e.currentTarget.showPicker()}
              />
              {errors.registrationDeadline && (
                <p className="text-destructive text-xs font-mono mt-1">
                  {errors.registrationDeadline}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="tournament-startDate"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Kezdési dátum <span className="text-destructive">*</span>
              </label>
              <input
                id="tournament-startDate"
                type="datetime-local"
                className={`w-full px-4 py-2.5 bg-secondary/80 border ${errors.startDate ? "border-destructive" : "border-border"
                  } rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors`}
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                onClick={(e) => e.currentTarget.showPicker()}
              />
              {errors.startDate && (
                <p className="text-destructive text-xs font-mono mt-1">{errors.startDate}</p>
              )}
            </div>
          </div>

          {/* Qualifier Settings */}
          <div className="bg-secondary/40 rounded border border-border/80 p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="has-qualifier"
                role="switch"
                aria-checked={formData.hasQualifier}
                onClick={() =>
                  setFormData({
                    ...formData,
                    hasQualifier: !formData.hasQualifier,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0f1015] ${formData.hasQualifier ? "bg-primary" : "bg-gray-700"
                  }`}
              >
                <span
                  className={`${formData.hasQualifier ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
              <div>
                <label
                  htmlFor="has-qualifier"
                  className="text-foreground font-medium cursor-pointer select-none"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      hasQualifier: !formData.hasQualifier,
                    })
                  }
                >
                  Selejtező kör engedélyezése
                </label>
              </div>
            </div>

            {formData.hasQualifier && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8 border-l-2 border-primary/40 mt-4">
                <div>
                  <label
                    htmlFor="qualifier-matches"
                    className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                  >
                    Kötelező meccsek száma
                  </label>
                  <input
                    id="qualifier-matches"
                    type="number"
                    className="w-full px-4 py-2 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                    value={formData.qualifierMatches}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        qualifierMatches: parseInt(e.target.value),
                      })
                    }
                    min={1}
                  />
                </div>
                <div>
                  <label
                    htmlFor="qualifier-points"
                    className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                  >
                    Minimum pontszám
                  </label>
                  <input
                    id="qualifier-points"
                    type="number"
                    className="w-full px-4 py-2 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                    value={formData.qualifierMinPoints}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        qualifierMinPoints: parseInt(e.target.value),
                      })
                    }
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rank Requirement */}
          <div className="bg-secondary/40 rounded border border-border/80 p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="require-rank"
                role="switch"
                aria-checked={formData.requireRank}
                onClick={() =>
                  setFormData({
                    ...formData,
                    requireRank: !formData.requireRank,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${formData.requireRank ? "bg-primary" : "bg-secondary"
                  }`}
              >
                <span
                  className={`${formData.requireRank ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
              <div>
                <label
                  htmlFor="require-rank"
                  className="text-foreground text-sm font-semibold cursor-pointer select-none block"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      requireRank: !formData.requireRank,
                    })
                  }
                >
                  Rang követelmény
                </label>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  Ha be van kapcsolva, a jelentkezőknek rendelkezniük kell
                  ranggal a választott játékban.
                </p>
              </div>
            </div>
          </div>

          {/* End Date */}
          <div>
            <label
              htmlFor="tournament-endDate"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Befejezési dátum (opcionális)
            </label>
            <input
              id="tournament-endDate"
              type="datetime-local"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              onClick={(e) => e.currentTarget.showPicker()}
            />
          </div>

          {/* Footer */}
          <div className="flex gap-4 pt-6 border-t border-border">
            <button
              type="button"
              className="flex-1 px-5 py-2.5 bg-secondary/80 hover:bg-secondary border border-border text-foreground rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all"
              onClick={onClose}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createLoading}
            >
              {createLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Létrehozás...
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  Verseny létrehozása
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
