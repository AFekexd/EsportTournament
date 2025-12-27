import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Edit2,
  AlertCircle,
  Plus,
  Monitor,
  Clock,
  Trash2,
} from "lucide-react";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  createSchedule,
  deleteSchedule,
  fetchComputers,
} from "../../store/slices/bookingsSlice";
import { AdminBookingStats } from "./AdminBookingStats";
import { ComputerModal } from "../admin/ComputerModal";
import { authService } from "../../lib/auth-service";
import { API_URL } from "../../config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

export function BookingManagement() {
  const dispatch = useAppDispatch();
  const { schedules, computers } = useAppSelector((state) => state.bookings);

  const [bookingSubTab, setBookingSubTab] = useState<"management" | "stats">(
    "stats"
  );
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 5,
    startHour: 14,
    endHour: 18,
  });
  const [showComputerModal, setShowComputerModal] = useState(false);
  const [editingComputer, setEditingComputer] = useState<any>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info" | "primary";
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "primary",
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const handleDeleteComputer = (computerId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Gép törlése",
      message: "Biztosan törölni szeretnéd ezt a gépet?",
      variant: "danger",
      confirmLabel: "Törlés",
      onConfirm: async () => {
        try {
          const token = authService.keycloak?.token;
          if (!token) return;

          const response = await fetch(
            `${API_URL}/bookings/computers/${computerId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await response.json();
          if (data.success) {
            dispatch(fetchComputers());
          }
        } catch (error) {
          console.error("Failed to delete computer:", error);
          toast.error("Hiba történt a gép törlése során");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
            Gépfoglalás
          </h2>
          <p className="text-muted-foreground">
            Kezeld a gépeket és a nyitvatartási időket.
          </p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg">
          <Button
            variant={bookingSubTab === "stats" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBookingSubTab("stats")}
            className="gap-2"
          >
            <BarChart3 size={16} />
            Statisztika
          </Button>
          <Button
            variant={bookingSubTab === "management" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBookingSubTab("management")}
            className="gap-2"
          >
            <Edit2 size={16} />
            Kezelés
          </Button>
        </div>
      </div>

      {bookingSubTab === "stats" ? (
        <AdminBookingStats />
      ) : (
        <div className="space-y-8">
          {/* Computer Management Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-primary">
                <Monitor size={20} />
                Gépek kezelése
              </h3>
              <Button
                onClick={() => setShowComputerModal(true)}
                className="gap-2"
              >
                <Plus size={16} />
                Új gép
              </Button>
            </div>

            {computers.length === 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-semibold">
                    Nincs gép létrehozva
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adj hozzá új gépeket a rendszerhez.
                  </p>
                  <Button
                    onClick={() => setShowComputerModal(true)}
                    variant="outline"
                  >
                    Új gép hozzáadása
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {computers.map((computer) => (
                  <Card
                    key={computer.id}
                    className="bg-card/50 backdrop-blur-sm border-white/5 hover:border-primary/50 transition-colors group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg mb-1">
                            {computer.name}
                          </CardTitle>
                          <CardDescription>
                            Sor {computer.row + 1}, Hely {computer.position + 1}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            computer.isActive ? "secondary" : "destructive"
                          }
                          className={
                            computer.isActive
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : ""
                          }
                        >
                          {computer.isActive ? "Aktív" : "Inaktív"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {computer.specs && (
                          <div className="text-xs text-muted-foreground bg-black/20 p-2 rounded">
                            {typeof computer.specs === "string"
                              ? computer.specs
                              : "Specifikációk elérhetők"}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 gap-2 h-8"
                            onClick={() => {
                              setEditingComputer(computer);
                              setShowComputerModal(true);
                            }}
                          >
                            <Edit2 size={14} /> Szerkesztés
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8 p-0"
                            onClick={() => handleDeleteComputer(computer.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-primary" />
              <h3 className="text-xl font-semibold">Nyitvatartási idők</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">
                    Új időpont hozzáadása
                  </CardTitle>
                  <CardDescription>
                    Add meg mikor legyen nyitva a terem.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nap</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newSchedule.dayOfWeek}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          dayOfWeek: parseInt(e.target.value),
                        })
                      }
                    >
                      <option value={1}>Hétfő</option>
                      <option value={2}>Kedd</option>
                      <option value={3}>Szerda</option>
                      <option value={4}>Csütörtök</option>
                      <option value={5}>Péntek</option>
                      <option value={6}>Szombat</option>
                      <option value={0}>Vasárnap</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Kezdés (óra)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={newSchedule.startHour}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            startHour: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vége (óra)</label>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={newSchedule.endHour}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            endHour: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full mt-2 gap-2"
                    onClick={() => dispatch(createSchedule(newSchedule))}
                  >
                    <Plus size={16} /> Hozzáadás
                  </Button>
                </CardContent>
              </Card>

              {/* List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Jelenlegi nyitvatartás
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schedules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>Még nincs nyitvatartás beállítva.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {schedules.map((schedule) => {
                        const dayNames = [
                          "Vasárnap",
                          "Hétfő",
                          "Kedd",
                          "Szerda",
                          "Csütörtök",
                          "Péntek",
                          "Szombat",
                        ];
                        return (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {dayNames[schedule.dayOfWeek].substring(0, 2)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {dayNames[schedule.dayOfWeek]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {schedule.startHour}:00 - {schedule.endHour}
                                  :00
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              onClick={() =>
                                dispatch(deleteSchedule(schedule.id))
                              }
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Computer Modal */}
      {showComputerModal && (
        <ComputerModal
          computer={editingComputer}
          onClose={() => {
            setShowComputerModal(false);
            setEditingComputer(null);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
