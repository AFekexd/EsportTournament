import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { updateTournament } from "../../store/slices/tournamentsSlice";
import { fetchGames } from "../../store/slices/gamesSlice";
import type { Tournament } from "../../types";
import { ImageUpload } from "../common/ImageUpload";

interface TournamentEditModalProps {
  tournament: Tournament;
  onClose: () => void;
}

export function TournamentEditModal({
  tournament,
  onClose,
}: TournamentEditModalProps) {
  const dispatch = useAppDispatch();
  const { updateLoading } = useAppSelector((state) => state.tournaments);
  const { games } = useAppSelector((state) => state.games);

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    name: tournament.name,
    description: tournament.description || "",
    imageUrl: tournament.imageUrl || "",
    status: tournament.status,
    format: tournament.format,
    maxTeams: tournament.maxTeams,
    startDate: formatDateForInput(tournament.startDate),
    endDate: tournament.endDate ? formatDateForInput(tournament.endDate) : "",
    registrationDeadline: formatDateForInput(tournament.registrationDeadline),
    hasQualifier: tournament.hasQualifier || false,
    qualifierMatches: tournament.qualifierMatches || 10,
    qualifierMinPoints: tournament.qualifierMinPoints || 50,
    seedingMethod: tournament.seedingMethod || "STANDARD",
    participationType:
      tournament.teamSize === 1 ||
        (!tournament.teamSize && tournament.game?.teamSize === 1)
        ? "INDIVIDUAL"
        : "TEAM",
    teamSize: tournament.teamSize || tournament.game?.teamSize || 5,
    requireRank:
      tournament.requireRank !== undefined ? tournament.requireRank : true,
    streamUrl: tournament.streamUrl || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (games.length === 0) {
      dispatch(fetchGames());
    }
  }, [dispatch, games.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.name || formData.name.length < 3) {
      newErrors.name =
        "A verseny nevének legalább 3 karakter hosszúnak kell lennie";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Add meg a kezdési dátumot";
    }
    if (!formData.registrationDeadline) {
      newErrors.registrationDeadline = "Add meg a jelentkezési határidőt";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await dispatch(
        updateTournament({
          id: tournament.id,
          data: {
            name: formData.name,
            description: formData.description || undefined,
            imageUrl: formData.imageUrl || undefined,
            status: formData.status,
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
            seedingMethod: formData.seedingMethod,
            teamSize:
              formData.participationType === "INDIVIDUAL"
                ? 1
                : formData.teamSize,
            requireRank: formData.requireRank,
            streamUrl: formData.streamUrl || undefined,
          },
        })
      ).unwrap();

      onClose();
    } catch (err) {
      console.error("Failed to update tournament:", err);
    }
  };

  const statusOptions = [
    { value: "DRAFT", label: "Piszkozat" },
    { value: "REGISTRATION", label: "Regisztráció nyitva" },
    { value: "IN_PROGRESS", label: "Folyamatban" },
    { value: "COMPLETED", label: "Befejezett" },
    { value: "CANCELLED", label: "Törölve" },
  ];

  const formatOptions = [
    { value: "SINGLE_ELIMINATION", label: "Egyenes kieséses" },
    { value: "DOUBLE_ELIMINATION", label: "Dupla kieséses" },
    { value: "ROUND_ROBIN", label: "Körmérkőzés" },
    { value: "SWISS", label: "Svájci rendszer" },
  ];

  const seedingOptions = [
    { value: "STANDARD", label: "Standard (ELO alapján)" },
    { value: "SEQUENTIAL", label: "Szekvenciális (1v2, 3v4)" },
    { value: "RANDOM", label: "Véletlenszerű (Shuffle)" },
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="tactical-card w-full max-w-3xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-foreground">
            Verseny szerkesztése
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
          {/* Name & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="edit-tournament-name"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Verseny neve <span className="text-destructive">*</span>
              </label>
              <input
                id="edit-tournament-name"
                type="text"
                className={`w-full px-4 py-2.5 bg-secondary/80 border ${errors.name ? "border-destructive" : "border-border"
                  } rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors`}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                maxLength={100}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.name ? (
                  <p className="text-destructive text-xs font-mono">{errors.name}</p>
                ) : <span></span>}
                <span className="text-xs font-mono text-muted-foreground">{formData.name.length}/100</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-tournament-status"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Státusz
              </label>
              <select
                id="edit-tournament-status"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as Tournament["status"],
                  })
                }
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                  htmlFor="edit-team-size"
                  className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Csapatméret <span className="text-destructive">*</span>
                </label>
                <select
                  id="edit-team-size"
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
              htmlFor="edit-tournament-description"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Leírás
            </label>
            <textarea
              id="edit-tournament-description"
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
              <span className="text-xs font-mono text-muted-foreground">{formData.description.length}/500</span>
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

          {/* Game & Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Játék
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-secondary/40 border border-border rounded text-muted-foreground font-mono text-sm cursor-not-allowed"
                value={tournament.game?.name || "Ismeretlen"}
                disabled
              />
              <p className="text-xs font-mono text-muted-foreground mt-1">
                A játék nem módosítható létrehozás után
              </p>
            </div>

            <div>
              <label
                htmlFor="edit-tournament-format"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Formátum
              </label>
              <select
                id="edit-tournament-format"
                className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                value={formData.format}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    format: e.target.value as Tournament["format"],
                  })
                }
              >
                {formatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seeding Method */}
          <div>
            <label
              htmlFor="edit-tournament-seeding"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Kiemelési módszer
            </label>
            <select
              id="edit-tournament-seeding"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              value={formData.seedingMethod}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  seedingMethod: e.target.value as
                    | "STANDARD"
                    | "SEQUENTIAL"
                    | "RANDOM",
                })
              }
            >
              {seedingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Standard: 1v8, 2v7. Szekvenciális: 1v2, 3v4. Véletlenszerű: Nincs
              kiemelés.
            </p>
          </div>

          <div>
            <label
              htmlFor="edit-tournament-streamUrl"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Stream URL (Twitch/TikTok/YouTube)
            </label>
            <input
              id="edit-tournament-streamUrl"
              type="text"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              value={formData.streamUrl}
              onChange={(e) =>
                setFormData({ ...formData, streamUrl: e.target.value })
              }
              placeholder="https://twitch.tv/..."
            />
          </div>

          {/* Max Teams */}
          <div>
            <label
              htmlFor="edit-tournament-maxTeams"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Max csapatok
            </label>
            <input
              id="edit-tournament-maxTeams"
              type="number"
              className="w-full px-4 py-2.5 bg-secondary/80 border border-border rounded text-foreground font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              value={formData.maxTeams}
              onChange={(e) =>
                setFormData({ ...formData, maxTeams: parseInt(e.target.value) })
              }
              min={2}
              max={128}
            />
          </div>

          {/* Registration Deadline & Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="edit-tournament-regDeadline"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Jelentkezési határidő <span className="text-destructive">*</span>
              </label>
              <input
                id="edit-tournament-regDeadline"
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
                htmlFor="edit-tournament-startDate"
                className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Kezdési dátum <span className="text-destructive">*</span>
              </label>
              <input
                id="edit-tournament-startDate"
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
                id="edit-has-qualifier"
                role="switch"
                aria-checked={formData.hasQualifier}
                onClick={() =>
                  setFormData({
                    ...formData,
                    hasQualifier: !formData.hasQualifier,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${formData.hasQualifier ? "bg-primary" : "bg-secondary"
                  }`}
              >
                <span
                  className={`${formData.hasQualifier ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
              <div>
                <label
                  htmlFor="edit-has-qualifier"
                  className="text-foreground text-sm font-semibold cursor-pointer select-none"
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
                    htmlFor="edit-qualifier-matches"
                    className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                  >
                    Kötelező meccsek száma
                  </label>
                  <input
                    id="edit-qualifier-matches"
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
                    htmlFor="edit-qualifier-points"
                    className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                  >
                    Minimum pontszám
                  </label>
                  <input
                    id="edit-qualifier-points"
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
                id="edit-require-rank"
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
                  htmlFor="edit-require-rank"
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
              htmlFor="edit-tournament-endDate"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Befejezési dátum (opcionális)
            </label>
            <input
              id="edit-tournament-endDate"
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
              disabled={updateLoading}
            >
              {updateLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Mentés
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
