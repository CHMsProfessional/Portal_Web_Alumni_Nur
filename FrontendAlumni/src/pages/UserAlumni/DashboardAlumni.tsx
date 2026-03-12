import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowRight,
    FaBook,
    FaCalendarCheck,
    FaEnvelope,
    FaFolderOpen,
    FaGraduationCap,
    FaHandshakeAngle,
    FaIdBadge,
    // FaNewspaper,
    FaPenToSquare,
    FaPeopleGroup,
    FaShieldHalved,
    FaUserLarge,
    FaUsers,
    FaUsersGear,
} from "react-icons/fa6";

import "./DashboardAlumni.css";
import { UserAlumniService } from "../../services/alumni/UserAlumniService";
import { UsuarioPerfil } from "../../models/Usuario/UsuarioPerfil";
import { Routes } from "../../routes/CONSTANTS";

const DashboardAlumni = () => {
    const navigate = useNavigate();

    const [data, setData] = useState<UsuarioPerfil | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const loadDashboard = async (): Promise<void> => {
            setError("");

            const cachedPerfil = UserAlumniService.getCachedPerfilCompleto();
            if (cachedPerfil) {
                setData({
                    usuario: cachedPerfil?.usuario ?? null,
                    comunidades: cachedPerfil?.comunidades ?? [],
                    cursos: cachedPerfil?.cursos ?? [],
                    eventos: cachedPerfil?.eventos ?? [],
                });
                setLoading(false);
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            try {
                const perfilCompleto = await UserAlumniService.loadPerfilCompleto(!cachedPerfil);

                setData({
                    usuario: perfilCompleto?.usuario ?? null,
                    comunidades: perfilCompleto?.comunidades ?? [],
                    cursos: perfilCompleto?.cursos ?? [],
                    eventos: perfilCompleto?.eventos ?? [],
                });
            } catch (err) {
                console.error("Error al cargar el dashboard del alumni:", err);

                if (!cachedPerfil) {
                    setError("No se pudo cargar la información de tu perfil.");
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        };

        void loadDashboard();
    }, []);

    const usuario = data?.usuario ?? null;
    const comunidades = data?.comunidades ?? [];
    const cursos = data?.cursos ?? [];
    const eventos = data?.eventos ?? [];

    const nombreCompleto = useMemo(() => {
        if (!usuario?.user) return "";
        return `${usuario.user.first_name ?? ""} ${usuario.user.last_name ?? ""}`.trim();
    }, [usuario]);

    const nombreVisible = nombreCompleto || usuario?.user?.username || "Usuario Alumni";
    const carreraVisible =
        usuario?.carrera_nombre || usuario?.carrera_codigo || "Sin carrera asignada";
    const correoVisible = usuario?.user?.email || "No definido";
    const usernameVisible = usuario?.user?.username || "No definido";
    const esAdmin = Boolean(usuario?.is_admin);

    const quickLinks = [
        {
            title: "Comunidad",
            description: "Participa en redes de egresados y accede a tus comunidades.",
            icon: <FaPeopleGroup />,
            actionLabel: "Ir a comunidad",
            onClick: () => navigate(Routes.COMUNIDAD.HOME),
        },
        {
            title: "Cursos",
            description: "Consulta tus cursos y explora la oferta académica disponible.",
            icon: <FaBook />,
            actionLabel: "Ver cursos",
            onClick: () => navigate(Routes.CURSOS.ME),
        },
        {
            title: "Eventos",
            description: "Mantente al día con actividades, convocatorias y encuentros.",
            icon: <FaCalendarCheck />,
            actionLabel: "Ver eventos",
            onClick: () => navigate(Routes.EVENTOS),
        },
        {
            title: "Repositorio",
            description: "Accede a documentos, tesis, informes y material institucional.",
            icon: <FaFolderOpen />,
            actionLabel: "Abrir repositorio",
            onClick: () => navigate(Routes.REPOSITORIO),
        },
        {
            title: "Servicios",
            description: "Explora servicios institucionales y recursos para egresados.",
            icon: <FaHandshakeAngle />,
            actionLabel: "Ver servicios",
            onClick: () => navigate(Routes.SERVICIOS),
        },
    ];

    if (esAdmin) {
        quickLinks.unshift({
            title: "Administración",
            description: "Accede al panel de gestión de usuarios y operación institucional.",
            icon: <FaUsersGear />,
            actionLabel: "Abrir panel admin",
            onClick: () => navigate(Routes.ADMIN.USUARIOS.LIST),
        });
    }

    if (loading) {
        return (
            <section className="dashboard-alumni-page">
                <div className="container py-5">
                    <div className="dashboard-alumni-feedback dashboard-alumni-feedback--loading">
                        <h3>Cargando dashboard</h3>
                        <p>Estamos preparando tu información personal y tu actividad institucional.</p>
                    </div>
                </div>
            </section>
        );
    }

    if (error || !usuario) {
        return (
            <section className="dashboard-alumni-page">
                <div className="container py-5">
                    <div className="dashboard-alumni-feedback dashboard-alumni-feedback--error">
                        <h3>No se pudo mostrar tu dashboard</h3>
                        <p>{error || "Tu perfil no está disponible en este momento."}</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <div className="dashboard-alumni-page">
            <section className="dashboard-alumni-hero">
                <div className="dashboard-alumni-hero__bg"></div>

                <div className="container dashboard-alumni-hero__container">
                    <div className="row g-4 align-items-stretch">
                        <div className="col-xl-8">
                            <div className="dashboard-alumni-hero__content animate__animated animate__fadeInLeft">
                                <span className="dashboard-alumni-hero__eyebrow">
                                    <FaGraduationCap />
                                    Portal Alumni NUR
                                </span>

                                <h1 className="dashboard-alumni-hero__title">
                                    Bienvenido nuevamente, {nombreVisible}
                                </h1>

                                <p className="dashboard-alumni-hero__text">
                                    Este es tu espacio principal para revisar tu información, acceder
                                    rápidamente a módulos del portal y mantener tu vínculo con la
                                    Universidad NUR.
                                </p>

                                <div className="dashboard-alumni-hero__actions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--primary"
                                        onClick={() => navigate(Routes.USER.EDIT)}
                                    >
                                        <FaPenToSquare />
                                        <span>Editar mi perfil</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={() => navigate(Routes.CURSOS.LIST)}
                                    >
                                        <FaBook />
                                        <span>Explorar oferta académica</span>
                                    </button>
                                </div>

                                <div className="dashboard-alumni-stats">
                                    <article className="dashboard-alumni-stat-card">
                                        <span className="dashboard-alumni-stat-card__icon">
                                            <FaUsers />
                                        </span>
                                        <div>
                                            <strong>{comunidades.length}</strong>
                                            <p>Comunidades</p>
                                        </div>
                                    </article>

                                    <article className="dashboard-alumni-stat-card">
                                        <span className="dashboard-alumni-stat-card__icon">
                                            <FaBook />
                                        </span>
                                        <div>
                                            <strong>{cursos.length}</strong>
                                            <p>Cursos</p>
                                        </div>
                                    </article>

                                    <article className="dashboard-alumni-stat-card">
                                        <span className="dashboard-alumni-stat-card__icon">
                                            <FaCalendarCheck />
                                        </span>
                                        <div>
                                            <strong>{eventos.length}</strong>
                                            <p>Eventos</p>
                                        </div>
                                    </article>
                                </div>

                                {refreshing && (
                                    <div className="dashboard-alumni-refresh-badge">
                                        Actualizando información...
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-xl-4">
                            <aside className="dashboard-profile-card animate__animated animate__fadeInRight">
                                <div className="dashboard-profile-card__avatar">
                                    <FaUserLarge />
                                </div>

                                <div className="dashboard-profile-card__body">
                                    <div className="dashboard-profile-card__headline">
                                        <h2>{nombreVisible}</h2>

                                        {esAdmin ? (
                                            <span className="dashboard-profile-card__admin-badge">
                                                <FaShieldHalved />
                                                Administrador
                                            </span>
                                        ) : (
                                            <span className="dashboard-profile-card__role">
                                                Graduado / Alumni NUR
                                            </span>
                                        )}
                                    </div>

                                    <ul className="dashboard-profile-card__meta">
                                        <li>
                                            <span className="dashboard-profile-card__meta-icon">
                                                <FaGraduationCap />
                                            </span>
                                            <div>
                                                <strong>Carrera</strong>
                                                <span>{carreraVisible}</span>
                                            </div>
                                        </li>

                                        <li>
                                            <span className="dashboard-profile-card__meta-icon">
                                                <FaEnvelope />
                                            </span>
                                            <div>
                                                <strong>Correo</strong>
                                                <span>{correoVisible}</span>
                                            </div>
                                        </li>

                                        <li>
                                            <span className="dashboard-profile-card__meta-icon">
                                                <FaIdBadge />
                                            </span>
                                            <div>
                                                <strong>Usuario</strong>
                                                <span>{usernameVisible}</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container dashboard-alumni-main">
                <section className="dashboard-section animate__animated animate__fadeInUp">
                    <div className="dashboard-section__header">
                        <div>
                            <span className="dashboard-section__eyebrow">Accesos rápidos</span>
                            <h3 className="dashboard-section__title">Tu hub institucional</h3>
                        </div>
                    </div>

                    <div className="dashboard-quick-grid">
                        {quickLinks.map((item) => (
                            <article key={item.title} className="dashboard-quick-card">
                                <div className="dashboard-quick-card__icon">{item.icon}</div>

                                <div className="dashboard-quick-card__body">
                                    <h4>{item.title}</h4>
                                    <p>{item.description}</p>
                                </div>

                                <button
                                    type="button"
                                    className="dashboard-quick-card__action"
                                    onClick={item.onClick}
                                >
                                    <span>{item.actionLabel}</span>
                                    <FaArrowRight />
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="dashboard-section animate__animated animate__fadeInUp">
                    <div className="dashboard-section__header">
                        <div>
                            <span className="dashboard-section__eyebrow">Actividad resumida</span>
                            <h3 className="dashboard-section__title">Resumen de participación</h3>
                        </div>
                    </div>

                    <div className="dashboard-summary-grid">
                        <article className="dashboard-summary-card">
                            <div className="dashboard-summary-card__head">
                                <span className="dashboard-summary-card__icon">
                                    <FaPeopleGroup />
                                </span>
                                <div>
                                    <h4>Mis comunidades</h4>
                                    <p>{comunidades.length} registradas</p>
                                </div>
                            </div>

                            {comunidades.length > 0 ? (
                                <ul className="dashboard-summary-card__list">
                                    {comunidades.slice(0, 4).map((comunidad) => (
                                        <li key={comunidad.id}>
                                            <span>{comunidad.nombre || "Comunidad sin nombre"}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="dashboard-summary-card__empty">
                                    Aún no perteneces a ninguna comunidad.
                                </div>
                            )}

                            <button
                                type="button"
                                className="dashboard-summary-card__link"
                                onClick={() => navigate(Routes.COMUNIDAD.HOME)}
                            >
                                Ir a comunidad <FaArrowRight />
                            </button>
                        </article>

                        <article className="dashboard-summary-card">
                            <div className="dashboard-summary-card__head">
                                <span className="dashboard-summary-card__icon">
                                    <FaBook />
                                </span>
                                <div>
                                    <h4>Mis cursos</h4>
                                    <p>{cursos.length} registrados</p>
                                </div>
                            </div>

                            {cursos.length > 0 ? (
                                <ul className="dashboard-summary-card__list">
                                    {cursos.slice(0, 4).map((curso) => (
                                        <li key={curso.id}>
                                            <span>{curso.titulo || "Curso sin título"}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="dashboard-summary-card__empty">
                                    Todavía no tienes cursos asociados.
                                </div>
                            )}

                            <button
                                type="button"
                                className="dashboard-summary-card__link"
                                onClick={() => navigate(Routes.CURSOS.ME)}
                            >
                                Ver mis cursos <FaArrowRight />
                            </button>
                        </article>

                        <article className="dashboard-summary-card">
                            <div className="dashboard-summary-card__head">
                                <span className="dashboard-summary-card__icon">
                                    <FaCalendarCheck />
                                </span>
                                <div>
                                    <h4>Mis eventos</h4>
                                    <p>{eventos.length} vinculados</p>
                                </div>
                            </div>

                            {eventos.length > 0 ? (
                                <ul className="dashboard-summary-card__list">
                                    {eventos.slice(0, 4).map((evento) => (
                                        <li key={evento.id}>
                                            <span>{evento.titulo || "Evento sin título"}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="dashboard-summary-card__empty">
                                    No tienes eventos vinculados por ahora.
                                </div>
                            )}

                            <button
                                type="button"
                                className="dashboard-summary-card__link"
                                onClick={() => navigate(Routes.EVENTOS)}
                            >
                                Ver eventos <FaArrowRight />
                            </button>
                        </article>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DashboardAlumni;