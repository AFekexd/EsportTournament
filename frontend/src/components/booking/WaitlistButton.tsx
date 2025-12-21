import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { addToWaitlist, removeFromWaitlist } from '../../store/slices/bookingsSlice';

interface WaitlistButtonProps {
    computerId: string;
    date: string;
    startHour: number;
    endHour: number;
}

export function WaitlistButton({ computerId, date, startHour, endHour }: WaitlistButtonProps) {
    const dispatch = useAppDispatch();
    const { myWaitlist } = useAppSelector((state) => state.bookings);
    const [isLoading, setIsLoading] = useState(false);

    // Check if user is already on waitlist for this slot
    // Matches if same computer, date, and overlapping time range
    const existingEntry = myWaitlist.find(
        (entry) =>
            entry.computerId === computerId &&
            new Date(entry.date).toISOString().split('T')[0] === date &&
            entry.startHour === startHour // Simplified match for exact slot
    );

    const handleToggleWaitlist = async () => {
        setIsLoading(true);
        try {
            if (existingEntry) {
                await dispatch(removeFromWaitlist(existingEntry.id)).unwrap();
            } else {
                await dispatch(addToWaitlist({
                    computerId,
                    date,
                    startHour,
                    endHour
                })).unwrap();
            }
        } catch (error) {
            console.error('Waitlist action failed:', error);
            toast.error('Hiba történt a várólista művelet során.');
        } finally {
            setIsLoading(false);
        }
    };

    if (existingEntry) {
        return (
            <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-primary bg-primary/15 text-primary text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-destructive/15 hover:border-destructive hover:text-destructive disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleToggleWaitlist}
                disabled={isLoading}
                title="Leiratkozás az értesítésről"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <BellOff size={16} />}
                <span>Értesítés törlése</span>
            </button>
        );
    }

    return (
        <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-primary bg-transparent text-primary text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleToggleWaitlist}
            disabled={isLoading}
            title="Értesítés kérése üresedés esetén"
        >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            <span>Értesítés</span>
        </button>
    );
}
