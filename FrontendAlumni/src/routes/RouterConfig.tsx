/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from "react-router-dom";
import { Routes } from "./CONSTANTS";
import { Suspense, lazy, useEffect, useState } from "react";
import "./Style_global.css";
import ChatBotFloating from "../components/Chatbot/ChatBotFloating.tsx";

// region Imports de componentes y páginas

// Auth
const LoginForm = lazy(() => import("../pages/auth/LoginForm.tsx"));

// Home
const HomePage = lazy(() => import("../pages/HomePage"));

// Documentos
const DocumentosPage = lazy(() => import("../pages/Documentos/DocumentosPage.tsx"));
const DocumentosFormPage = lazy(() => import("../pages/Documentos/DocumentosFormPage.tsx"));
const DocumentosListPage = lazy(() => import("../pages/Documentos/DocumentosListPage.tsx"));

// Comunidad
const ComunidadesHome = lazy(() => import("../pages/Comunidad/ComunidadesHome.tsx"));
const ComunidadesChat = lazy(() => import("../pages/Comunidad/ComunidadesChatPage.tsx"));
const ComunidadesForm = lazy(() => import("../pages/Comunidad/ComunidadForm.tsx"));
const ComunidadesList = lazy(() => import("../pages/Comunidad/ComunidadListPage.tsx"));
const ComunidadHubPage = lazy(() => import("../pages/Comunidad/ComunidadHubPage.tsx"));
const ComunidadConversacionesPage = lazy(() => import("../pages/Comunidad/ComunidadConversacionesPage.tsx"));
const ComunidadConversacionPage = lazy(() => import("../pages/Comunidad/ComunidadConversacionPage.tsx"));

// Cursos
const MisCursosPage = lazy(() => import("../pages/Curso/MisCursosPage.tsx"));
const CursosDisponiblesPage = lazy(() => import("../pages/Curso/CursosDisponiblesPage.tsx"));
const CursosDetailPage = lazy(() => import("../pages/Curso/CursosDetallePage.tsx"));
const CursosListPage = lazy(() => import("../pages/Curso/CursosListPage.tsx"));
const CursosFormPage = lazy(() => import("../pages/Curso/CursoFormPage.tsx"));

// Usuario
const PerfilUsuarioList = lazy(() => import("../pages/UserAlumni/UserAlumniList.tsx"));
const PerfilUsuarioForm = lazy(() => import("../pages/UserAlumni/UserAlumniForm.tsx"));
const PerfilUsuarioDashboard = lazy(() => import("../pages/UserAlumni/DashboardAlumni.tsx"));

// Servicios Alumni
const ServiciosAlumniPage = lazy(() => import("../pages/ServicioAlumni/ServiciosAlumniPage.tsx"));
const ServiciosAlumniList = lazy(() => import("../pages/ServicioAlumni/ServiciosAlumniList.tsx"));
const ServiciosAlumniForm = lazy(() => import("../pages/ServicioAlumni/ServiciosAlumniForm.tsx"));

// Eventos
const EventosHomePage = lazy(() => import("../pages/Eventos/EventoHomePage.tsx"));
const EventoListPage = lazy(() => import("../pages/Eventos/EventoListPage.tsx"));
const EventoForm = lazy(() => import("../pages/Eventos/EventoForm.tsx"));

// Noticias
const NoticiasHome = lazy(() => import("../pages/Noticias/NoticiasHome.tsx"));
const NoticiasList = lazy(() => import("../pages/Noticias/NoticiasList.tsx"));
const NoticiasForm = lazy(() => import("../pages/Noticias/NoticiaForm.tsx"));
const NoticiasDetallePage = lazy(() => import("../pages/Noticias/NoticiasDetallePage.tsx"));

// Menus
const MenuNoAuth = lazy(() => import("../components/Menu/MenuNoAuth.tsx"));
const Menu = lazy(() => import("../components/Menu/Menu.tsx"));
const Footer = lazy(() => import("../components/Footer/Footer.tsx"));
const FooterNoAuth = lazy(() => import("../components/Footer/FooterNoAuth.tsx"));

// Protected Route
import ProtectedRoute from "../components/ProtectedRoute.tsx";
import AuthService, { AUTH_STATE_EVENT } from '../services/alumni/AuthService';

// endregion

const useAuthLayoutState = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
        AuthService.isAuthenticated()
    );

    useEffect(() => {
        const syncAuthState = () => {
            setIsAuthenticated(AuthService.isAuthenticated());
        };

        window.addEventListener(AUTH_STATE_EVENT, syncAuthState);
        window.addEventListener("storage", syncAuthState);

        return () => {
            window.removeEventListener(AUTH_STATE_EVENT, syncAuthState);
            window.removeEventListener("storage", syncAuthState);
        };
    }, []);

    return isAuthenticated;
};

type RouteShellProps = {
    Component: React.ComponentType;
    requireAdmin?: boolean;
};

const ProtectedRouteShell = ({ Component, requireAdmin = false }: RouteShellProps) => (
    <div className="main-wrapper">
        <Menu />
        <div className="main-content">
            <Suspense fallback={<div className="text-light text-center">Cargando...</div>}>
                <ProtectedRoute element={<Component />} requireAdmin={requireAdmin} />
            </Suspense>
        </div>
        <Footer />
        <ChatBotFloating />
    </div>
);

const UnprotectedRouteShell = ({ Component }: RouteShellProps) => (
    <div className="main-wrapper">
        <MenuNoAuth />
        <div className="main-content">
            <Suspense fallback={<div className="text-light text-center">Cargando...</div>}>
                <Component />
            </Suspense>
        </div>
        <FooterNoAuth />
    </div>
);

const PublicHomeRouteShell = ({ Component }: RouteShellProps) => {
    const isAuthenticated = useAuthLayoutState();

    return (
        <div className="main-wrapper">
            {isAuthenticated ? <Menu /> : <MenuNoAuth />}
            <div className="main-content">
                <Suspense fallback={<div className="text-light text-center">Cargando...</div>}>
                    <Component />
                </Suspense>
            </div>
            {isAuthenticated ? <Footer /> : <FooterNoAuth />}
            {isAuthenticated ? <ChatBotFloating /> : null}
        </div>
    );
};

export const routerConfig = createBrowserRouter([
    // Homepage
    { path: Routes.HOME, element: <PublicHomeRouteShell Component={HomePage} /> },

    // Rutas de autenticación
    { path: Routes.AUTH.LOGIN, element: <UnprotectedRouteShell Component={LoginForm} /> },

    // Rutas de documentos
    { path: Routes.REPOSITORIO, element: <ProtectedRouteShell Component={DocumentosPage} /> },

    // Rutas de comunidad legacy
    { path: Routes.COMUNIDAD.HOME, element: <ProtectedRouteShell Component={ComunidadesHome} /> },
    { path: Routes.COMUNIDAD.CHAT, element: <ProtectedRouteShell Component={ComunidadesChat} /> },

    // Rutas puente del nuevo dominio comunidad/hub
    { path: Routes.COMUNIDAD.DETAIL, element: <ProtectedRouteShell Component={ComunidadHubPage} /> },
    { path: Routes.COMUNIDAD.HUB, element: <ProtectedRouteShell Component={ComunidadHubPage} /> },
    { path: Routes.COMUNIDAD.CONVERSACIONES, element: <ProtectedRouteShell Component={ComunidadConversacionesPage} /> },
    { path: Routes.COMUNIDAD.CONVERSACION, element: <ProtectedRouteShell Component={ComunidadConversacionPage} /> },

    // Rutas de cursos
    { path: Routes.CURSOS.ME, element: <ProtectedRouteShell Component={MisCursosPage} /> },
    { path: Routes.CURSOS.LIST, element: <ProtectedRouteShell Component={CursosDisponiblesPage} /> },
    { path: Routes.CURSOS.DETAIL, element: <ProtectedRouteShell Component={CursosDetailPage} /> },
    { path: Routes.CURSOS.DETAIL_LEGACY, element: <ProtectedRouteShell Component={CursosDetailPage} /> },

    // Rutas de eventos
    { path: Routes.EVENTOS, element: <ProtectedRouteShell Component={EventosHomePage} /> },

    // Rutas de noticias
    { path: Routes.NOTICIAS, element: <ProtectedRouteShell Component={NoticiasHome} /> },
    { path: Routes.NOTICIAS_DETALLE, element: <ProtectedRouteShell Component={NoticiasDetallePage} /> },

    // Rutas de servicios Alumni
    { path: Routes.SERVICIOS, element: <ProtectedRouteShell Component={ServiciosAlumniPage} /> },

    // Rutas de noticias Admin
    { path: Routes.ADMIN.NOTICIAS.LIST, element: <ProtectedRouteShell Component={NoticiasList} requireAdmin={true} /> },
    { path: Routes.ADMIN.NOTICIAS.CREATE, element: <ProtectedRouteShell Component={NoticiasForm} requireAdmin={true} /> },
    { path: Routes.ADMIN.NOTICIAS.EDIT, element: <ProtectedRouteShell Component={NoticiasForm} requireAdmin={true} /> },

    // Rutas de usuario Admin
    { path: Routes.ADMIN.USUARIOS.LIST, element: <ProtectedRouteShell Component={PerfilUsuarioList} requireAdmin={true} /> },
    { path: Routes.ADMIN.USUARIOS.EDIT, element: <ProtectedRouteShell Component={PerfilUsuarioForm} requireAdmin={true} /> },
    { path: Routes.ADMIN.USUARIOS.CREATE, element: <ProtectedRouteShell Component={PerfilUsuarioForm} requireAdmin={true} /> },

    // Rutas de servicios Admin
    { path: Routes.ADMIN.SERVICIOS.LIST, element: <ProtectedRouteShell Component={ServiciosAlumniList} requireAdmin={true} /> },
    { path: Routes.ADMIN.SERVICIOS.CREATE, element: <ProtectedRouteShell Component={ServiciosAlumniForm} requireAdmin={true} /> },
    { path: Routes.ADMIN.SERVICIOS.EDIT, element: <ProtectedRouteShell Component={ServiciosAlumniForm} requireAdmin={true} /> },

    // Rutas de documentos Admin
    { path: Routes.ADMIN.DOCUMENTOS.LIST, element: <ProtectedRouteShell Component={DocumentosListPage} requireAdmin={true} /> },
    { path: Routes.ADMIN.DOCUMENTOS.CREATE, element: <ProtectedRouteShell Component={DocumentosFormPage} requireAdmin={true} /> },
    { path: Routes.ADMIN.DOCUMENTOS.EDIT, element: <ProtectedRouteShell Component={DocumentosFormPage} requireAdmin={true} /> },

    // Rutas de cursos Admin
    { path: Routes.ADMIN.CURSOS.LIST, element: <ProtectedRouteShell Component={CursosListPage} requireAdmin={true} /> },
    { path: Routes.ADMIN.CURSOS.CREATE, element: <ProtectedRouteShell Component={CursosFormPage} requireAdmin={true} /> },
    { path: Routes.ADMIN.CURSOS.EDIT, element: <ProtectedRouteShell Component={CursosFormPage} requireAdmin={true} /> },

    // Rutas de eventos Admin
    { path: Routes.ADMIN.EVENTOS.LIST, element: <ProtectedRouteShell Component={EventoListPage} requireAdmin={true} /> },
    { path: Routes.ADMIN.EVENTOS.CREATE, element: <ProtectedRouteShell Component={EventoForm} requireAdmin={true} /> },
    { path: Routes.ADMIN.EVENTOS.EDIT, element: <ProtectedRouteShell Component={EventoForm} requireAdmin={true} /> },

    // Rutas de comunidades Admin
    { path: Routes.ADMIN.COMUNIDADES.LIST, element: <ProtectedRouteShell Component={ComunidadesList} requireAdmin={true} /> },
    { path: Routes.ADMIN.COMUNIDADES.CREATE, element: <ProtectedRouteShell Component={ComunidadesForm} requireAdmin={true} /> },
    { path: Routes.ADMIN.COMUNIDADES.EDIT, element: <ProtectedRouteShell Component={ComunidadesForm} requireAdmin={true} /> },

    // Rutas nuevas admin de comunidad/conversación/noticias
    { path: Routes.ADMIN.COMUNIDADES.DETAIL, element: <ProtectedRouteShell Component={ComunidadesList} requireAdmin={true} /> },
    { path: Routes.ADMIN.COMUNIDADES.CONVERSACIONES, element: <ProtectedRouteShell Component={ComunidadesList} requireAdmin={true} /> },
    { path: Routes.ADMIN.COMUNIDADES.CONVERSACION_CREATE, element: <ProtectedRouteShell Component={ComunidadesForm} requireAdmin={true} /> },
    { path: Routes.ADMIN.COMUNIDADES.CONVERSACION_EDIT, element: <ProtectedRouteShell Component={ComunidadesForm} requireAdmin={true} /> },
    { path: Routes.ADMIN.NOTICIAS.COMUNIDAD_LIST, element: <ProtectedRouteShell Component={NoticiasList} requireAdmin={true} /> },
    { path: Routes.ADMIN.NOTICIAS.COMUNIDAD_CREATE, element: <ProtectedRouteShell Component={NoticiasForm} requireAdmin={true} /> },

    // Rutas de usuario
    { path: Routes.USER.EDIT, element: <ProtectedRouteShell Component={PerfilUsuarioForm} /> },
    { path: Routes.USER.PROFILE(), element: <ProtectedRouteShell Component={PerfilUsuarioDashboard} /> },
]);