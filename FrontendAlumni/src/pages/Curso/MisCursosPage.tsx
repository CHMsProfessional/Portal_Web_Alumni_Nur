/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "animate.css";
import {
    FaArrowRight,
    FaBookOpen,
    FaCalendarAlt,
    FaChalkboardTeacher,
    FaClock,
    FaLayerGroup,
    FaRedo,
    FaSearch,
    FaUserGraduate,
} from "react-icons/fa";

import "./MisCursosPage.css";

import { CursoService } from "../../services/alumni/CursoService";
import UserAlumniService from "../../services/alumni/UserAlumniService";
import { Curso } from "../../models/Curso/Curso";
import { Routes } from "../../routes/CONSTANTS";
import { resolveMediaSrc } from "../../utils/media";

const placeholderImg = "/placeholder-comunidad.png";
const CONTENT_MEDIA_URL = import.meta.env.VITE_CONTENT_MEDIA_URL || "";

const formatearFecha = (fecha?: string | null): string => {
    if (!fecha) return "No definida";

    try {
        return new Date(fecha).toLocaleDateString("es-BO", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return fecha;
    }
};

const getEstadoTexto = (curso: Curso): string => {
    return curso.estado_display || curso.estado || "Sin estado";
};

const getModalidadTexto = (curso: Curso): string => {
    return curso.modalidad_display || curso.modalidad || "Modalidad no definida";
};

const normalizarEstadoClase = (curso: Curso): string => {
    const valor = getEstadoTexto(curso).toLowerCase();

    if (valor.includes("activo")) return "activo";
    if (valor.includes("final")) return "finalizado";
    if (valor.includes("cancel")) return "cancelado";
    if (valor.includes("inactivo")) return "inactivo";

    return "sin-estado";
};

const descripcionCorta = (texto?: string | null, max = 180): string => {
    if (!texto?.trim()) {
        return "Este curso aún no cuenta con una descripción ampliada.";
    }

    const limpio = texto.trim();
    if (limpio.length <= max) return limpio;

    return `${limpio.slice(0, max).trim()}...`;
};

const parseDateValue = (fecha?: string | null): number => {
    if (!fecha) return Number.MAX_SAFE_INTEGER;

    const time = new Date(fecha).getTime();
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const resolveDetalleRoute = (cursoId: number): string => {
    const routesAny = Routes as any;

    const candidateFns = [
        routesAny?.ALUMNI?.CURSOS?.DETALLE_PARAM,
        routesAny?.CURSOS?.DETALLE_PARAM,
        routesAny?.CURSO?.DETALLE_PARAM,
    ];

    const fn = candidateFns.find((item: unknown) => typeof item === "function") as
        | ((id: number) => string)
        | undefined;

    return fn ? fn(cursoId) : `/cursos/${cursoId}`;
};

const MisCursosPage = () => {
    const navigate = useNavigate();

    const [cursos, setCursos] = useState<Curso[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [search, setSearch] = useState<string>("");
    const [filtroEstado, setFiltroEstado] = useState<string>("");
    const [filtroModalidad, setFiltroModalidad] = useState<string>("");
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const cargarCursos = async (forceRefresh = false): Promise<void> => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const perfil = await UserAlumniService.loadPerfilCompleto(forceRefresh);
            const userId = perfil?.usuario?.id ?? null;
            const admin = Boolean(perfil?.usuario?.is_admin);

            setCurrentUserId(userId);
            setIsAdmin(admin);

            let cursosPerfil = Array.isArray(perfil?.cursos) ? perfil.cursos : [];

            if ((!cursosPerfil || cursosPerfil.length === 0) && userId) {
                const todosLosCursos = await CursoService.list();
                cursosPerfil = todosLosCursos.filter((curso) =>
                    CursoService.isUserInscrito(curso, userId)
                );
            }

            const ordenados = [...cursosPerfil].sort(
                (a, b) => parseDateValue(a.fecha_inicio) - parseDateValue(b.fecha_inicio)
            );

            setCursos(ordenados);
        } catch (loadError) {
            console.error("Error al cargar los cursos del usuario.", loadError);
            setError("No se pudieron cargar tus cursos.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void cargarCursos();
    }, []);

    const modalidadesDisponibles = useMemo(() => {
        const values = new Set<string>();

        cursos.forEach((curso) => {
            const modalidad = getModalidadTexto(curso).trim();
            if (modalidad) values.add(modalidad);
        });

        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }, [cursos]);

    const cursosFiltrados = useMemo(() => {
        const termino = search.trim().toLowerCase();

        return cursos.filter((curso) => {
            const matchTexto =
                !termino ||
                (curso.titulo || "").toLowerCase().includes(termino) ||
                (curso.descripcion || "").toLowerCase().includes(termino) ||
                (curso.responsable || "").toLowerCase().includes(termino);

            const matchEstado =
                !filtroEstado ||
                normalizarEstadoClase(curso) === filtroEstado ||
                getEstadoTexto(curso).toLowerCase() === filtroEstado.toLowerCase();

            const matchModalidad =
                !filtroModalidad ||
                getModalidadTexto(curso).toLowerCase() === filtroModalidad.toLowerCase();

            return matchTexto && matchEstado && matchModalidad;
        });
    }, [cursos, search, filtroEstado, filtroModalidad]);

    const resumen = useMemo(() => {
        const total = cursos.length;
        const activos = cursos.filter((curso) => normalizarEstadoClase(curso) === "activo").length;
        const finalizados = cursos.filter(
            (curso) => normalizarEstadoClase(curso) === "finalizado"
        ).length;
        const visibles = cursosFiltrados.length;

        return { total, activos, finalizados, visibles };
    }, [cursos, cursosFiltrados]);

    const limpiarFiltros = (): void => {
        setSearch("");
        setFiltroEstado("");
        setFiltroModalidad("");
    };

    if (loading) {
        return (
            <div className="mis-cursos-page animate__animated animate__fadeIn">
                <section className="mis-cursos-content">
                    <div className="container">
                        <div className="mis-cursos-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando tus cursos...</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="mis-cursos-page animate__animated animate__fadeIn">
            <section className="mis-cursos-hero">
                <div className="container">
                    <div className="mis-cursos-hero__content">
                        <div className="mis-cursos-hero__copy">
                            <span className="mis-cursos-hero__eyebrow">
                                <FaBookOpen />
                                Formación Alumni
                            </span>

                            <h1 className="mis-cursos-hero__title">Mis cursos</h1>

                            <p className="mis-cursos-hero__text">
                                Revisa los cursos en los que ya estás inscrito, consulta su estado,
                                fechas, modalidad y accede al detalle de cada experiencia formativa.
                            </p>
                        </div>

                        <div className="mis-cursos-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => void cargarCursos(true)}
                                disabled={refreshing}
                            >
                                <FaRedo />
                                <span>{refreshing ? "Actualizando..." : "Actualizar"}</span>
                            </button>
                        </div>
                    </div>

                    <div className="mis-cursos-stats">
                        <div className="mis-cursos-stat">
                            <span className="mis-cursos-stat__label">Total</span>
                            <strong className="mis-cursos-stat__value">{resumen.total}</strong>
                        </div>

                        <div className="mis-cursos-stat">
                            <span className="mis-cursos-stat__label">Activos</span>
                            <strong className="mis-cursos-stat__value">{resumen.activos}</strong>
                        </div>

                        <div className="mis-cursos-stat">
                            <span className="mis-cursos-stat__label">Finalizados</span>
                            <strong className="mis-cursos-stat__value">{resumen.finalizados}</strong>
                        </div>

                        <div className="mis-cursos-stat">
                            <span className="mis-cursos-stat__label">Visibles</span>
                            <strong className="mis-cursos-stat__value">{resumen.visibles}</strong>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="mis-cursos-admin-note">
                            Como administrador, aquí estás viendo tus cursos inscritos como usuario.
                            La gestión completa del catálogo se mantiene en el módulo administrativo.
                        </div>
                    )}
                </div>
            </section>

            <section className="mis-cursos-content">
                <div className="container">
                    <div className="mis-cursos-toolbar">
                        <div className="mis-cursos-toolbar__search">
                            <label htmlFor="mis-cursos-search">
                                <FaSearch />
                                <span>Buscar</span>
                            </label>
                            <input
                                id="mis-cursos-search"
                                type="text"
                                className="form-control"
                                placeholder="Título, descripción o responsable..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="mis-cursos-toolbar__filters">
                            <div className="mis-cursos-toolbar__filter">
                                <label htmlFor="mis-cursos-estado">Estado</label>
                                <select
                                    id="mis-cursos-estado"
                                    className="form-select"
                                    value={filtroEstado}
                                    onChange={(e) => setFiltroEstado(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="activo">Activo</option>
                                    <option value="finalizado">Finalizado</option>
                                    <option value="cancelado">Cancelado</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>

                            <div className="mis-cursos-toolbar__filter">
                                <label htmlFor="mis-cursos-modalidad">Modalidad</label>
                                <select
                                    id="mis-cursos-modalidad"
                                    className="form-select"
                                    value={filtroModalidad}
                                    onChange={(e) => setFiltroModalidad(e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    {modalidadesDisponibles.map((modalidad) => (
                                        <option key={modalidad} value={modalidad}>
                                            {modalidad}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mis-cursos-toolbar__actions">
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--ghost"
                                    onClick={limpiarFiltros}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    {error ? (
                        <div className="mis-cursos-alert">
                            {error}
                        </div>
                    ) : cursosFiltrados.length === 0 ? (
                        <div className="mis-cursos-empty">
                            <FaUserGraduate />
                            <h3>No hay cursos para mostrar</h3>
                            <p>
                                {cursos.length === 0
                                    ? "Aún no tienes cursos inscritos registrados en tu perfil."
                                    : "No hay coincidencias con los filtros aplicados."}
                            </p>

                            {(search || filtroEstado || filtroModalidad) && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={limpiarFiltros}
                                >
                                    Restablecer filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mis-cursos-grid">
                            {cursosFiltrados.map((curso) => {
                                const estadoClase = normalizarEstadoClase(curso);
                                const inscritos = curso.inscritos?.length ?? 0;

                                return (
                                    <article
                                        key={curso.id}
                                        className="mis-curso-card animate__animated animate__fadeInUp"
                                    >
                                        <div className="mis-curso-card__media">
                                            <img
                                                src={resolveMediaSrc(CONTENT_MEDIA_URL, curso.imagen_portada, placeholderImg)}
                                                alt={curso.titulo || "Curso"}
                                                className="mis-curso-card__image"
                                            />
                                            <div className="mis-curso-card__overlay" />

                                            <div className="mis-curso-card__badges">
                                                <span
                                                    className={`mis-curso-card__status mis-curso-card__status--${estadoClase}`}
                                                >
                                                    {getEstadoTexto(curso)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mis-curso-card__body">
                                            <div className="mis-curso-card__top">
                                                <h3 className="mis-curso-card__title">
                                                    {curso.titulo || "Curso sin título"}
                                                </h3>

                                                <span className="mis-curso-card__modalidad">
                                                    <FaLayerGroup />
                                                    <span>{getModalidadTexto(curso)}</span>
                                                </span>
                                            </div>

                                            <p className="mis-curso-card__description">
                                                {descripcionCorta(curso.descripcion)}
                                            </p>

                                            <div className="mis-curso-card__meta">
                                                <div className="mis-curso-card__metaItem">
                                                    <FaChalkboardTeacher />
                                                    <span>{curso.responsable || "Responsable no definido"}</span>
                                                </div>

                                                <div className="mis-curso-card__metaItem">
                                                    <FaCalendarAlt />
                                                    <span>Inicio: {formatearFecha(curso.fecha_inicio)}</span>
                                                </div>

                                                <div className="mis-curso-card__metaItem">
                                                    <FaClock />
                                                    <span>Fin: {formatearFecha(curso.fecha_fin)}</span>
                                                </div>

                                                <div className="mis-curso-card__metaItem">
                                                    <FaUserGraduate />
                                                    <span>{inscritos} inscrito{inscritos === 1 ? "" : "s"}</span>
                                                </div>
                                            </div>

                                            <div className="mis-curso-card__footer">
                                                <button
                                                    type="button"
                                                    className="nur-btn nur-btn--primary"
                                                    onClick={() => {
                                                        if (curso.id) {
                                                            navigate(resolveDetalleRoute(curso.id));
                                                        }
                                                    }}
                                                    disabled={!curso.id || !currentUserId}
                                                >
                                                    <span>Ver detalle</span>
                                                    <FaArrowRight />
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default MisCursosPage;