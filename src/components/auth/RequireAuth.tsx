import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

export default function RequireAuth() {
    const token = useAuthStore((state) => state.token);
    console.log('RequireAuth: Token check', { token });

    if (!token) {
        console.log('RequireAuth: No token, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
