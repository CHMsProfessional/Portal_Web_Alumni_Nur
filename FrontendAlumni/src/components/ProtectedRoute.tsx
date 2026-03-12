import { Navigate } from "react-router-dom";
import { JSX } from "react";

import { Routes } from "../routes/CONSTANTS.ts";
import { AuthService } from "../services/alumni/AuthService";

interface ProtectedRouteProps {
    element: JSX.Element;
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    element,
    requireAdmin = false,
}) => {
    const isAuthenticated = AuthService.isAuthenticated();

    if (!isAuthenticated) {
        console.warn("Usuario no autenticado");
        return <Navigate to={Routes.AUTH.LOGIN} replace />;
    }

    const isAdmin = AuthService.isAdmin();

    if (requireAdmin && !isAdmin) {
        console.warn("Acceso denegado: se requiere ser administrador");
        return <Navigate to={Routes.HOME} replace />;
    }

    return element;
};

export default ProtectedRoute;