import { NavLink } from "react-router-dom"
import { Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/categories", label: "Categories" },
    { href: "/upload", label: "Import" },
    { href: "/borrow-lend", label: "Borrow / Lend" },
]

export default function Navbar() {
    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="container mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        OF
                    </span>
                    <span className="text-xl font-bold text-gray-900 tracking-tight">OwnFinance Tracker</span>
                </div>

                {/* Center Nav Links */}
                <div className="flex items-center gap-8">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    "text-sm font-medium transition-colors hover:text-blue-600",
                                    isActive ? "text-blue-600" : "text-gray-500"
                                )
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
                        <User className="w-5 h-5 text-amber-600" />
                    </div>
                </div>
            </div>
        </nav>
    )
}
