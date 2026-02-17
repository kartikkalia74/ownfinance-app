import { NavLink } from "react-router-dom"
import { LayoutDashboard, ArrowRightLeft, Upload, Tags, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const mobileNavItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/transactions", label: "Txns", icon: ArrowRightLeft },
    { href: "/upload", label: "Add", icon: Upload }, // Central/Prominent action
    { href: "/categories", label: "Cats", icon: Tags },
    { href: "/borrow-lend", label: "Lending", icon: Users },
]

export default function MobileNav() {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe md:hidden">
            <div className="flex justify-around items-center h-16 px-2">
                {mobileNavItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive
                                    ? "text-blue-600"
                                    : "text-gray-500 hover:text-gray-900"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    className={cn(
                                        "w-6 h-6 transition-transform duration-200",
                                        isActive && "scale-110",
                                        item.label === "Add" && "w-7 h-7 mb-0.5" // Make upload slightly larger
                                    )}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    )
}
