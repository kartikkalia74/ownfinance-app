import { Outlet, Link } from "react-router-dom"
import Navbar from "./Navbar"

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-[#F8F9FC]">
            <Navbar />
            <main className="container mx-auto max-w-7xl p-6">
                <Outlet />
            </main>
            <footer className="py-6 text-center text-sm text-gray-400">
                <div className="flex justify-center gap-4">
                    <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
                    <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
                </div>
            </footer>
        </div>
    )
}
