import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAppSelector } from '../../hooks/useRedux';
import './Layout.css';

export function Layout() {
    const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

    return (
        <div className={`layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
            <Sidebar />
            <div className="main-wrapper">
                <Navbar />
                <main className="main-content">
                    <div className="container">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
