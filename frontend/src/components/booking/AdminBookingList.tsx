import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
    fetchWeeklyBookings,
    deleteBooking,
    type Booking,
} from "../../store/slices/bookingsSlice";
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Trash2,
    Edit2,
    Search,
    User,
    Monitor,
    Clock,
} from "lucide-react";
import { BookingEditModal } from "./BookingEditModal";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { toast } from "sonner";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function AdminBookingList() {
    const dispatch = useAppDispatch();
    const { weeklyBookings, isLoading } = useAppSelector(
        (state) => state.bookings
    );

    // Start week from Monday
    const getMonday = (d: Date) => {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
    const [searchTerm, setSearchTerm] = useState("");
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
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

    useEffect(() => {
        const dateStr = currentWeekStart.toISOString().split("T")[0];
        dispatch(fetchWeeklyBookings(dateStr));
    }, [dispatch, currentWeekStart]);

    const changeWeek = (weeks: number) => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + weeks * 7);
        setCurrentWeekStart(newDate);
    };

    const closeConfirmModal = () =>
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    const handleDeleteBooking = (booking: Booking) => {
        setConfirmModal({
            isOpen: true,
            title: "Foglalás törlése",
            message: `Biztosan törölni szeretnéd ${booking.user.displayName || booking.user.username} foglalását?`,
            variant: "danger",
            confirmLabel: "Törlés",
            onConfirm: async () => {
                try {
                    await dispatch(deleteBooking(booking.id)).unwrap();
                    toast.success("Foglalás törölve");
                    // Refresh list
                    const dateStr = currentWeekStart.toISOString().split("T")[0];
                    dispatch(fetchWeeklyBookings(dateStr));
                } catch (error) {
                    console.error("Failed to delete booking:", error);
                    toast.error("Nem sikerült törölni a foglalást");
                }
            },
        });
    };

    const filteredBookings = weeklyBookings.filter((b) => {
        const term = searchTerm.toLowerCase();
        return (
            b.user.username.toLowerCase().includes(term) ||
            (b.user.displayName && b.user.displayName.toLowerCase().includes(term)) ||
            b.computer.name.toLowerCase().includes(term)
        );
    });

    // Sort by date/time
    const sortedBookings = [...filteredBookings].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Date Navigation */}
                <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg border border-white/5">
                    <Button variant="ghost" size="icon" onClick={() => changeWeek(-1)}>
                        <ChevronLeft size={20} />
                    </Button>
                    <div className="flex items-center gap-2 font-medium min-w-[200px] justify-center">
                        <Calendar size={18} className="text-primary" />
                        <span>
                            {currentWeekStart.toLocaleDateString("hu-HU", { month: 'short', day: 'numeric' })} -
                            {new Date(new Date(currentWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("hu-HU", { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => changeWeek(1)}>
                        <ChevronRight size={20} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(getMonday(new Date()))} className="ml-2 text-xs">
                        Ma
                    </Button>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Keresés (Név, Gép)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <Card className="border-white/5 bg-card/50">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Betöltés...</div>
                    ) : sortedBookings.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center text-muted-foreground">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p>Nincs foglalás erre a hétre</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider bg-white/5">
                                        <th className="p-4 font-semibold">Időpont</th>
                                        <th className="p-4 font-semibold">Felhasználó</th>
                                        <th className="p-4 font-semibold">Gép</th>
                                        <th className="p-4 font-semibold">Check-in</th>
                                        <th className="p-4 font-semibold text-right">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sortedBookings.map((booking) => {
                                        const startDate = new Date(booking.startTime);
                                        const endDate = new Date(booking.endTime);
                                        const isPast = endDate < new Date();
                                        const isLive = startDate <= new Date() && endDate >= new Date();

                                        return (
                                            <tr key={booking.id} className="group hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-white flex items-center gap-2">
                                                            {startDate.toLocaleDateString("hu-HU", { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                                            <Clock size={12} />
                                                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isLive && <span className="mt-1 text-[10px] font-bold text-green-500 uppercase tracking-wider">Élő</span>}
                                                        {isPast && <span className="mt-1 text-[10px] font-medium text-gray-600 uppercase tracking-wider">Vége</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                            <User size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-white">{booking.user.displayName || booking.user.username}</div>
                                                            <div className="text-xs text-muted-foreground">@{booking.user.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                                        <Monitor size={16} className="text-gray-500" />
                                                        {booking.computer.name}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {booking.checkedInAt ? (
                                                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                                                            {new Date(booking.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {!isPast && (
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="sm" onClick={() => setEditingBooking(booking)} title="Szerkesztés">
                                                                <Edit2 size={16} className="text-blue-400" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteBooking(booking)} title="Törlés">
                                                                <Trash2 size={16} className="text-red-400" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>


            {editingBooking && (
                <BookingEditModal
                    booking={editingBooking}
                    isOpen={!!editingBooking}
                    onClose={() => {
                        setEditingBooking(null);
                        // Refresh
                        const dateStr = currentWeekStart.toISOString().split("T")[0];
                        dispatch(fetchWeeklyBookings(dateStr));
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
