import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { authService } from '../lib/auth-service';
import { UserTimeModal } from '../components/admin/UserTimeModal';
import { API_URL } from '../config';

interface User {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
    timeBalanceSeconds: number;
}

export function TeacherTimePage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeModalUser, setTimeModalUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = authService.keycloak?.token;
            if (!token) return;

            const response = await fetch(`${API_URL}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                // Determine if we should only show STUDENTs? 
                // The prompt implied generic "users", but usually teachers manage students.
                // For now, I'll filter for STUDENT role to keep it focused, or maybe allow all but highlight roles.
                // Let's filtered for STUDENT by default but maybe allow searching all if needed?
                // Actually, let's show everyone but maybe sort students first or just rely on search.
                // Simple approach: Show all, but since it's "Teacher" page, maybe they mostly care about Students.
                setUsers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        if (!seconds && seconds !== 0) return '-';

        const isNegative = seconds < 0;
        const absSeconds = Math.abs(seconds);

        const hours = Math.floor(absSeconds / 3600);
        const mins = Math.floor((absSeconds % 3600) / 60);

        const sign = isNegative ? '-' : '';

        if (hours > 0) {
            return `${sign}${hours}ó ${mins}p`;
        }
        return `${sign}${mins}p`;
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

        // Optional: Filter only students? 
        // const isStudent = user.role === 'STUDENT';
        // return matchesSearch && isStudent;
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Időkeret Kezelés</h1>
                    <p className="text-gray-400">Diákok időegyenlegének gyors módosítása</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Keress név, email vagy felhasználónév alapján..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                        autoFocus
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUsers.map((user) => (
                    <div
                        key={user.id}
                        className="bg-[#0f1015] border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all group cursor-pointer"
                        onClick={() => setTimeModalUser(user)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                    ${user.role === 'TEACHER' ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-white group-hover:text-primary transition-colors">
                                        {user.displayName || user.username}
                                    </div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/5">
                                {user.role}
                            </div>
                            <div className={`text-xl font-mono font-bold ${user.timeBalanceSeconds < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {['ADMIN', 'TEACHER'].includes(user.role) ? '∞' : formatTime(user.timeBalanceSeconds || 0)}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        Nincs találat a keresési feltétekre.
                    </div>
                )}
            </div>

            {timeModalUser && (
                <UserTimeModal
                    user={timeModalUser}
                    onClose={() => setTimeModalUser(null)}
                    onSuccess={() => {
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}
