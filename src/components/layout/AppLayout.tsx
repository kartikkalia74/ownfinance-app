import { Outlet, Link } from "react-router-dom"
import Navbar from "./Navbar"
import MobileNav from "./MobileNav"

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-[#F8F9FC] pb-16 md:pb-0">
            <Navbar />
            <main className="container mx-auto max-w-7xl p-6">
                <Outlet />
            </main>
            <MobileNav />
            <footer className="py-6 text-center text-sm text-gray-400 hidden md:block">
                <div className="flex justify-center gap-4">
                    <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
                    <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
                </div>
            </footer>
        </div>
    )
}
