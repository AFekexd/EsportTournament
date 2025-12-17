import { useEffect } from 'react';
import { BarChart3, Users, Monitor, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { fetchBookingStats } from '../../store/slices/bookingsSlice';
import './AdminBookingStats.css';

export function AdminBookingStats() {
    const dispatch = useAppDispatch();
    const { stats, isLoading } = useAppSelector((state) => state.bookings);

    useEffect(() => {
        dispatch(fetchBookingStats());
    }, [dispatch]);

    if (isLoading) {
        return <div className="stats-loading"><span className="spinner" /> Betöltés...</div>;
    }

    if (!stats) {
        return <div className="stats-empty">Nincs elérhető statisztika.</div>;
    }

    const maxDayValue = Math.max(...stats.byDayOfWeek, 1);
    const dayNames = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo']; // 0 = Sunday

    // Prepare hourly data (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const maxHourValue = Math.max(...Object.values(stats.byHour), 1);

    return (
        <div className="admin-stats">
            <h3 className="stats-main-title">
                <BarChart3 size={24} />
                Foglalási Statisztikák (Elmúlt 30 nap)
            </h3>

            <div className="stats-overview-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrapper blue">
                        <Calendar size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Összes foglalás</span>
                        <span className="stat-value">{stats.totalBookings}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-wrapper green">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Aktív felhasználók</span>
                        <span className="stat-value">{stats.topUsers.length}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-wrapper purple">
                        <Monitor size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Átlagos géphasználat</span>
                        <span className="stat-value">
                            {Math.round(stats.computerUtilization.reduce((acc, curr) => acc + curr.bookings, 0) / (stats.computerUtilization.length || 1))}
                        </span>
                    </div>
                </div>
            </div>

            <div className="stats-charts-grid">
                {/* Daily Distribution */}
                <div className="chart-card">
                    <h4>Napi eloszlás</h4>
                    <div className="bar-chart">
                        {stats.byDayOfWeek.map((count, index) => (
                            <div key={index} className="bar-column">
                                <div
                                    className="bar"
                                    style={{ height: `${(count / maxDayValue) * 100}%` }}
                                    title={`${count} foglalás`}
                                >
                                    <span className="bar-tooltip">{count}</span>
                                </div>
                                <span className="bar-label">{dayNames[index]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hourly Distribution */}
                <div className="chart-card">
                    <h4>Óránkénti eloszlás</h4>
                    <div className="bar-chart hourly">
                        {hours.map((hour) => {
                            const count = stats.byHour[hour] || 0;
                            return (
                                <div key={hour} className="bar-column">
                                    <div
                                        className="bar"
                                        style={{ height: `${(count / maxHourValue) * 100}%` }}
                                        title={`${hour}:00 - ${count} foglalás`}
                                    ></div>
                                    {hour % 3 === 0 && <span className="bar-label">{hour}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="stats-details-grid">
                {/* Top Users */}
                <div className="detail-card">
                    <h4>
                        <Users size={18} />
                        Top Felhasználók
                    </h4>
                    <div className="top-list">
                        {stats.topUsers.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="list-item">
                                <div className="rank">{idx + 1}.</div>
                                <div className="user-info">
                                    <span className="username">{item.user?.displayName || item.user?.username || 'Ismeretlen'}</span>
                                </div>
                                <span className="count-badge">{item.count} foglalás</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Computer Utilization */}
                <div className="detail-card">
                    <h4>
                        <Monitor size={18} />
                        Gép kihasználtság
                    </h4>
                    <div className="utilization-list">
                        {stats.computerUtilization
                            .slice()
                            .sort((a, b) => b.bookings - a.bookings)
                            .slice(0, 5)
                            .map((item) => (
                                <div key={item.computer.id} className="utilization-item">
                                    <div className="util-header">
                                        <span className="comp-name">{item.computer.name}</span>
                                        <span className="util-count">{item.bookings} foglalás</span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${(item.bookings / (stats.totalBookings || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
