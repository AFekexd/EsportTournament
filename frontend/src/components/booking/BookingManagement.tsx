import { useState, useEffect } from "react";

import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  BarChart3,
  Edit2,
} from "lucide-react";
import { AdminBookingList } from "./AdminBookingList";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
  fetchSchedules,
  fetchComputers,
} from "../../store/slices/bookingsSlice";
import { AdminBookingStats } from "./AdminBookingStats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function BookingManagement() {
  const dispatch = useAppDispatch();
  const { schedules } = useAppSelector((state) => state.bookings);

  const [bookingSubTab, setBookingSubTab] = useState<"management" | "stats" | "bookings">(
    "stats"
  );

  useEffect(() => {
    dispatch(fetchSchedules());
    dispatch(fetchComputers());
  }, [dispatch]);

  const [newScheduleType, setNewScheduleType] = useState<"recurring" | "specific">("recurring");
  const [newSchedule, setNewSchedule] = useState<{
    dayOfWeek?: number;
    specificDate?: string;
    startHour: number;
    endHour: number;
    isOpenForBooking: boolean;
  }>({
    dayOfWeek: 5,
    specificDate: "",
    startHour: 14,
    endHour: 18,
    isOpenForBooking: true,
  });
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
    onConfirm: () => { },
    variant: "primary",
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
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
          <Button
            variant={bookingSubTab === "bookings" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBookingSubTab("bookings")}
            className="gap-2"
          >
            <Calendar size={16} />
            Foglalások
          </Button>
        </div>
      </div>

      {bookingSubTab === "stats" ? (
        <AdminBookingStats />
      ) : bookingSubTab === "bookings" ? (
        <div className="animate-fade-in">
          <AdminBookingList />
        </div>
      ) : (
        <div className="space-y-8">
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
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="scheduleType"
                          checked={newScheduleType === "recurring"}
                          onChange={() => setNewScheduleType("recurring")}
                          className="text-primary focus:ring-primary"
                        />
                        Heti ismétlődő
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="scheduleType"
                          checked={newScheduleType === "specific"}
                          onChange={() => setNewScheduleType("specific")}
                          className="text-primary focus:ring-primary"
                        />
                        Eseti dátum
                      </label>
                    </div>

                    {newScheduleType === "recurring" ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nap</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dátum</label>
                        <Input
                          type="date"
                          value={newSchedule.specificDate}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              specificDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
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

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isOpenForBooking"
                      checked={newSchedule.isOpenForBooking}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          isOpenForBooking: e.target.checked
                        })
                      }
                      className="w-4 h-4 text-primary rounded border-gray-600 focus:ring-primary focus:ring-offset-background"
                    />
                    <label htmlFor="isOpenForBooking" className="text-sm text-foreground">
                      Engedélyezem a gépek azonnali foglalását (Máskülönben csak ügyelet választható)
                    </label>
                  </div>

                  <Button
                    className="w-full mt-2 gap-2"
                    onClick={() => {
                      const payload = {
                        ...newSchedule,
                        dayOfWeek: newScheduleType === "recurring" ? newSchedule.dayOfWeek : undefined,
                        specificDate: newScheduleType === "specific" ? newSchedule.specificDate : undefined,
                      };
                      dispatch(createSchedule(payload as any));
                    }}
                  >
                    <Plus size={16} /> Hozzáadás
                  </Button>
                </CardContent>
              </Card>

              {/* List */}
              <Card className="lg:col-span-2 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">
                    Jelenlegi nyitvatartás
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schedules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-primary/10">
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
                              {schedule.specificDate ? (
                                <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm" title="Eseti dátum">
                                  {new Date(schedule.specificDate).getDate()}
                                </div>
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                  {dayNames[schedule.dayOfWeek ?? 0]?.substring(0, 2)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm flex items-center gap-2">
                                  {schedule.specificDate ? (
                                    <span>{new Date(schedule.specificDate).toLocaleDateString("hu-HU")}</span>
                                  ) : (
                                    <span>{dayNames[schedule.dayOfWeek ?? 0]}</span>
                                  )}
                                  {!schedule.isOpenForBooking && (
                                    <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                      Csak Ügyelet
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {schedule.startHour}:00 - {schedule.endHour}
                                  :00
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={schedule.isOpenForBooking ? "text-green-500 hover:text-green-600 hover:bg-green-500/10" : "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"}
                                onClick={() => dispatch(updateSchedule({ id: schedule.id, isOpenForBooking: !schedule.isOpenForBooking }))}
                                title={schedule.isOpenForBooking ? "Zárás foglalások elől (Csak ügyelet)" : "Megnyitás foglalásoknak"}
                              >
                                {schedule.isOpenForBooking ? "Nyitva" : "Zárva"}
                              </Button>
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
