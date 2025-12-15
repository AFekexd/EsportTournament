import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAppSelector } from '../../hooks/useRedux';


export function Layout() {
    const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <div
                className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'ml-0 md:ml-64' : 'ml-0 md:ml-20'
                    } w-full`}
            >
                <Navbar />
                <main className="px-4 py-8 md:px-8 ">
                    <div className="mx-auto max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
