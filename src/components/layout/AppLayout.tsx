import { Outlet } from "react-router-dom"
import Navbar from "./Navbar"

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-[#F8F9FC]">
            <Navbar />
            <main className="container mx-auto max-w-7xl p-6">
                <Outlet />
            </main>
        </div>
    )
}
