import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import {
    fetchAdminBookings,
    deleteBooking,
    bulkDeleteBookings,
    type Booking,
} from "../../store/slices/bookingsSlice";
import {
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
    const { adminBookings, pagination, isLoading } = useAppSelector(
        (state) => state.bookings
    );

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [includeExpired, setIncludeExpired] = useState(false);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
        dispatch(fetchAdminBookings({ page, limit, search: debouncedSearch, includeExpired }));
    }, [dispatch, page, limit, debouncedSearch, includeExpired]);

    // Reset selection on page change or filter change
    useEffect(() => {
        setSelectedBookingIds([]);
    }, [page, limit, debouncedSearch, includeExpired]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= (pagination?.pages || 1)) {
            setPage(newPage);
        }
    };

    const toggleSelectAll = () => {
        if (selectedBookingIds.length === adminBookings.length) {
            setSelectedBookingIds([]);
        } else {
            setSelectedBookingIds(adminBookings.map((b) => b.id));
        }
    };

    const toggleSelectBooking = (id: string) => {
        if (selectedBookingIds.includes(id)) {
            setSelectedBookingIds(selectedBookingIds.filter((existingId) => existingId !== id));
        } else {
            setSelectedBookingIds([...selectedBookingIds, id]);
        }
    };

    const handleBulkDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: "Tömeges törlés",
            message: `Biztosan törölni szeretnéd a kijelölt ${selectedBookingIds.length} foglalást?`,
            variant: "danger",
            confirmLabel: "Törlés",
            onConfirm: async () => {
                try {
                    await dispatch(bulkDeleteBookings(selectedBookingIds)).unwrap();
                    toast.success(`${selectedBookingIds.length} foglalás törölve`);
                    setSelectedBookingIds([]);
                    // Refresh
                    dispatch(fetchAdminBookings({ page, limit, search: debouncedSearch, includeExpired }));
                } catch (error) {
                    console.error("Failed to bulk delete:", error);
                    toast.error("Nem sikerült törölni a foglalásokat");
                }
            },
        });
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
                    dispatch(fetchAdminBookings({ page, limit, search: debouncedSearch, includeExpired }));
                } catch (error) {
                    console.error("Failed to delete booking:", error);
                    toast.error("Nem sikerült törölni a foglalást");
                }
            },
        });
    };



    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/30 p-4 rounded-lg border border-white/5">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w" />
                        <Input
                            placeholder="Keresés (Név, Gép)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>

                    {/* Expired toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none border border-white/10 rounded-md px-3 py-1.5 hover:bg-white/5 transition-colors">
                        <input
                            type="checkbox"
                            checked={includeExpired}
                            onChange={(e) => setIncludeExpired(e.target.checked)}
                            className="rounded border-gray-600 bg-transparent text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="text-sm font-medium">Lejártak mutatása</span>
                    </label>

                    {/* Bulk Delete Button */}
                    {selectedBookingIds.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white animate-in fade-in"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 size={14} className="mr-2" />
                            Kijelöltek törlése ({selectedBookingIds.length})
                        </Button>
                    )}


                </div>
            </div>

            <Card className="border-white/5 bg-card/50">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Betöltés...</div>
                    ) : adminBookings.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center text-muted-foreground">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p>Nincs a feltételeknek megfelelő foglalás</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider bg-white/5">
                                        <th className="p-4 w-[40px]">
                                            <input
                                                type="checkbox"
                                                checked={adminBookings.length > 0 && selectedBookingIds.length === adminBookings.length}
                                                onChange={toggleSelectAll}
                                                className="rounded border-gray-600 bg-transparent text-primary focus:ring-primary h-4 w-4"
                                            />
                                        </th>
                                        <th className="p-4 font-semibold">Időpont</th>
                                        <th className="p-4 font-semibold">Felhasználó</th>
                                        <th className="p-4 font-semibold">Gép</th>
                                        <th className="p-4 font-semibold">Check-in</th>
                                        <th className="p-4 font-semibold text-right">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {adminBookings.map((booking) => {
                                        const startDate = new Date(booking.startTime);
                                        const endDate = new Date(booking.endTime);
                                        const isPast = endDate < new Date();
                                        const isLive = startDate <= new Date() && endDate >= new Date();

                                        return (
                                            <tr key={booking.id} className={`group hover:bg-white/5 transition-colors ${selectedBookingIds.includes(booking.id) ? "bg-primary/5" : ""}`}>
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBookingIds.includes(booking.id)}
                                                        onChange={() => toggleSelectBooking(booking.id)}
                                                        className="rounded border-gray-600 bg-transparent text-primary focus:ring-primary h-4 w-4"
                                                    />
                                                </td>
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
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="sm" onClick={() => setEditingBooking(booking)} title="Szerkesztés">
                                                            <Edit2 size={16} className="text-blue-400" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBooking(booking)} title="Törlés">
                                                            <Trash2 size={16} className="text-red-400" />
                                                        </Button>
                                                    </div>
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


            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex justify-evenly items-center sticky bottom-0 pb-3  backdrop-blur w-full z-50">
                    <div className="flex justify-center gap-2 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => handlePageChange(page - 1)}
                        >
                            Előző
                        </Button>
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                            {page} / {pagination.pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.pages}
                            onClick={() => handlePageChange(page + 1)}
                        >
                            Következő
                        </Button>

                    </div>
                    {/* Limit selector */}
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1); // Reset to first page
                        }}
                        className="!w-[40%] mt-4"
                    >
                        <option value={10}>10 / oldal</option>
                        <option value={20}>20 / oldal</option>
                        <option value={50}>50 / oldal</option>
                    </select>
                </div>
            )}

            {editingBooking && (
                <BookingEditModal
                    booking={editingBooking}
                    isOpen={!!editingBooking}
                    onClose={() => {
                        setEditingBooking(null);
                        // Refresh
                        dispatch(fetchAdminBookings({ page, limit, search: debouncedSearch, includeExpired }));
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
