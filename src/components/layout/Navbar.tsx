import { useState } from "react"
import { NavLink } from "react-router-dom"
import { Settings, User, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/categories", label: "Categories" },
    { href: "/upload", label: "Import" },
    { href: "/borrow-lend", label: "Borrow / Lend" },
]

export default function Navbar() {
    const { user, logout } = useAuthStore()
    const [imgError, setImgError] = useState(false)

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="container mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <img src="/logos/logo.gif" alt="OwnFinance Tracker" className="w-8 h-8" />
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
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center border border-white shadow-sm overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                                {user?.picture && !imgError ? (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <span className="text-sm font-bold text-amber-700">
                                        {user?.name?.charAt(0).toUpperCase() || <User className="w-5 h-5 text-amber-600" />}
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="end">
                            <div className="flex flex-col space-y-3">
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-medium text-gray-900 leading-none">{user?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500 mt-1 leading-none truncate">{user?.email || 'user@example.com'}</p>
                                </div>
                                <div className="h-px bg-gray-100" />
                                <button
                                    onClick={logout}
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </nav>
    )
}
