import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaBookOpen,
    FaCalendarDays,
    FaCircleUser,
    FaFolderOpen,
    FaGraduationCap,
    FaHandshakeAngle,
    FaNewspaper,
    FaPeopleGroup,
    FaRightFromBracket,
    FaUserPen,
    FaUsers,
    FaChalkboardUser,
    FaCalendarPlus,
    FaFileCirclePlus,
    FaSquarePlus,
    FaHandHoldingMedical,
    FaUsersGear,
    FaList,
    FaPlus,
} from "react-icons/fa6";

import { Routes } from "../../routes/CONSTANTS";
import { AuthService } from "../../services/alumni/AuthService";
import { UserAlumniService } from "../../services/alumni/UserAlumniService";
import { Usuario } from "../../models/Usuario/Usuario";

import "./menu_css.css";

const Menu = () => {
    const navigate = useNavigate();

    const isAuthenticated = AuthService.isAuthenticated();
    const isAdmin = AuthService.isAdmin();

    const [usuario, setUsuario] = useState<Usuario | null>(() => {
        const perfil = UserAlumniService.getCachedPerfilCompleto();
        return perfil?.usuario ?? null;
    });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate(Routes.AUTH.LOGIN);
            return;
        }

        let mounted = true;

        const hydratePerfil = async (): Promise<void> => {
            try {
                const perfil = await UserAlumniService.loadPerfilCompleto(false);
                if (!mounted) return;
                setUsuario(perfil?.usuario ?? null);
            } catch (error) {
                console.warn("No se pudo cargar el perfil para el menú.", error);
            }
        };

        if (!usuario?.id) {
            void hydratePerfil();
        }

        return () => {
            mounted = false;
        };
    }, [isAuthenticated, navigate, usuario?.id]);

    const displayName = useMemo(() => {
        const firstName = usuario?.user?.first_name?.trim();
        const username = usuario?.user?.username?.trim();

        if (firstName) return firstName;
        if (username) return username;

        return "Mi cuenta";
    }, [usuario]);

    const handleLogout = (): void => {
        AuthService.clearSession();
        UserAlumniService.clearCachedPerfilCompleto();
        window.dispatchEvent(new Event('alumni-logout'));
        navigate(Routes.AUTH.LOGIN);
    };

    return (
        <nav className="navbar navbar-expand-xl navbar-dark nur-navbar shadow-sm">
            <div className="container nur-navbar__container">
                <Link to={Routes.HOME} className="navbar-brand nur-navbar__brand">
                    <span className="nur-navbar__brandMark">
                        <FaGraduationCap />
                    </span>
                    <span className="nur-navbar__brandText">
                        <span className="nur-navbar__brandTitle">Alumni NUR</span>
                        <span className="nur-navbar__brandSubtitle">Portal institucional</span>
                    </span>
                </Link>

                <button
                    className="navbar-toggler nur-navbar__toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse nur-navbar__collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto align-items-xl-center nur-navbar__nav">
                        <li className="nav-item dropdown">
                            <a
                                className="nav-link dropdown-toggle nur-navbar__accountTrigger"
                                href="#"
                                role="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                <FaCircleUser />
                                <span>{displayName}</span>
                            </a>

                            <ul className="dropdown-menu dropdown-menu-end nur-navbar__dropdown">
                                <li>
                                    <Link to={Routes.USER.PROFILE()} className="dropdown-item nur-navbar__dropdownItem">
                                        <FaUserPen />
                                        <span>Mi Perfil</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to={Routes.CURSOS.ME} className="dropdown-item nur-navbar__dropdownItem">
                                        <FaChalkboardUser />
                                        <span>Mis Cursos</span>
                                    </Link>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <button onClick={handleLogout} className="dropdown-item nur-navbar__dropdownItem nur-navbar__dropdownItem--danger">
                                        <FaRightFromBracket />
                                        <span>Cerrar sesión</span>
                                    </button>
                                </li>
                            </ul>
                        </li>

                        <li className="nav-item">
                            <Link to={Routes.COMUNIDAD.HOME} className="nav-link nur-navbar__link">
                                <FaPeopleGroup />
                                <span>Comunidad</span>
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link to={Routes.REPOSITORIO} className="nav-link nur-navbar__link">
                                <FaFolderOpen />
                                <span>Repositorio</span>
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link to={Routes.CURSOS.LIST} className="nav-link nur-navbar__link">
                                <FaBookOpen />
                                <span>Cursos</span>
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link to={Routes.SERVICIOS} className="nav-link nur-navbar__link">
                                <FaHandshakeAngle />
                                <span>Servicios</span>
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link to={Routes.EVENTOS} className="nav-link nur-navbar__link">
                                <FaCalendarDays />
                                <span>Eventos</span>
                            </Link>
                        </li>


                        {isAdmin && (
                            <>
                                <li className="nav-item dropdown">
                                    <a
                                        className="nav-link dropdown-toggle nur-navbar__link nur-navbar__link--admin"
                                        href="#"
                                        role="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <FaList />
                                        <span>Ver Listas</span>
                                    </a>

                                    <ul className="dropdown-menu nur-navbar__dropdown">
                                        <li>
                                            <Link to={Routes.ADMIN.USUARIOS.LIST} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaUsers />
                                                <span>Usuarios</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.EVENTOS.LIST} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaCalendarDays />
                                                <span>Eventos</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.DOCUMENTOS.LIST} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaFolderOpen />
                                                <span>Repositorio</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.CURSOS.LIST} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaBookOpen />
                                                <span>Cursos</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.NOTICIAS.LIST} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaNewspaper />
                                                <span>Noticias</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.SERVICIOS.LIST} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaHandshakeAngle />
                                                <span>Servicios</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.COMUNIDADES.LIST} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaUsersGear />
                                                <span>Comunidades</span>
                                            </Link>
                                        </li>
                                    </ul>
                                </li>

                                <li className="nav-item dropdown">
                                    <a
                                        className="nav-link dropdown-toggle nur-navbar__link nur-navbar__link--accent"
                                        href="#"
                                        role="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <FaPlus />
                                        <span>Crear</span>
                                    </a>

                                    <ul className="dropdown-menu dropdown-menu-end nur-navbar__dropdown">
                                        <li>
                                            <Link to={Routes.ADMIN.USUARIOS.CREATE} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaUsers />
                                                <span>Crear Usuario</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.EVENTOS.CREATE} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaCalendarPlus />
                                                <span>Crear Evento</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.DOCUMENTOS.CREATE} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaFileCirclePlus />
                                                <span>Crear Documento</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.CURSOS.CREATE} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaChalkboardUser />
                                                <span>Crear Curso</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.NOTICIAS.CREATE} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaSquarePlus />
                                                <span>Crear Noticia</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.SERVICIOS.CREATE} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaHandHoldingMedical />
                                                <span>Crear Servicio</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={Routes.ADMIN.COMUNIDADES.CREATE} className="dropdown-item nur-navbar__dropdownItem">
                                                <FaUsersGear />
                                                <span>Crear Comunidad</span>
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Menu;