/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "animate.css";
import "./CursosListPage.css";

import { CursoService } from "../../services/alumni/CursoService";
import { Curso } from "../../models/Curso/Curso";
import { Routes } from "../../routes/CONSTANTS";

import {
    FaBook,
    FaCalendarAlt,
    FaChalkboardTeacher,
    FaEdit,
    FaEye,
    FaLayerGroup,
    FaPlusCircle,
    FaRedo,
    FaSearch,
    FaTrash,
    FaUserGraduate,
} from "react-icons/fa";

const placeholderImg = "/placeholder-comunidad.png";

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

const descripcionCorta = (texto?: string | null, max = 170): string => {
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

const resolveCursosCreateRoute = (): string => {
    const routesAny = Routes as any;

    return (
        routesAny?.ADMIN?.CURSOS?.CREATE ||
        routesAny?.CURSOS?.CREATE ||
        routesAny?.CURSO?.CREATE ||
        "/admin/cursos/create"
    );
};

const resolveCursosEditRoute = (cursoId: number): string => {
    const routesAny = Routes as any;

    const fn =
        routesAny?.ADMIN?.CURSOS?.EDIT_PARAM ||
        routesAny?.CURSOS?.EDIT_PARAM ||
        routesAny?.CURSO?.EDIT_PARAM;

    return typeof fn === "function" ? fn(cursoId) : `/admin/cursos/${cursoId}/edit`;
};

const resolveCursosDetalleRoute = (cursoId: number): string => {
    const routesAny = Routes as any;

    const fn =
        routesAny?.ALUMNI?.CURSOS?.DETALLE_PARAM ||
        routesAny?.CURSOS?.DETALLE_PARAM ||
        routesAny?.CURSO?.DETALLE_PARAM;

    return typeof fn === "function" ? fn(cursoId) : `/cursos/detalle/${cursoId}`;
};

const CursosListPage = () => {
    const navigate = useNavigate();

    const [cursos, setCursos] = useState<Curso[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string>("");

    const [search, setSearch] = useState<string>("");
    const [filtroEstado, setFiltroEstado] = useState<string>("");
    const [filtroModalidad, setFiltroModalidad] = useState<string>("");

    const cargarCursos = async (silent = false): Promise<void> => {
        try {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");
            const data = await CursoService.list();

            const ordenados = [...(data ?? [])].sort(
                (a, b) => parseDateValue(a.fecha_inicio) - parseDateValue(b.fecha_inicio)
            );

            setCursos(ordenados);
        } catch (loadError) {
            console.error("Error al cargar cursos.", loadError);
            setError("No se pudo cargar el listado de cursos.");
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
        return {
            total: cursos.length,
            visibles: cursosFiltrados.length,
            activos: cursos.filter((curso) => normalizarEstadoClase(curso) === "activo").length,
            finalizados: cursos.filter((curso) => normalizarEstadoClase(curso) === "finalizado").length,
        };
    }, [cursos, cursosFiltrados]);

    const limpiarFiltros = (): void => {
        setSearch("");
        setFiltroEstado("");
        setFiltroModalidad("");
    };

    const eliminarCurso = async (curso?: Curso): Promise<void> => {
        if (!curso?.id) return;

        const confirmado = window.confirm(
            `¿Estás seguro de que deseas eliminar el curso "${curso.titulo || "sin título"}"?`
        );

        if (!confirmado) return;

        try {
            setDeletingId(curso.id);
            await CursoService.delete(curso.id);
            setCursos((prev) => prev.filter((item) => item.id !== curso.id));
        } catch (deleteError) {
            console.error("Error al eliminar curso.", deleteError);
            setError("No se pudo eliminar el curso.");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="cursos-list-page animate__animated animate__fadeIn">
                <section className="cursos-list-content">
                    <div className="container">
                        <div className="cursos-list-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando cursos...</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="cursos-list-page animate__animated animate__fadeIn">
            <section className="cursos-list-hero">
                <div className="container">
                    <div className="cursos-list-hero__content">
                        <div className="cursos-list-hero__copy">
                            <span className="cursos-list-hero__eyebrow">
                                <FaBook />
                                Administración académica
                            </span>

                            <h1 className="cursos-list-hero__title">Gestión de cursos</h1>

                            <p className="cursos-list-hero__text">
                                Administra el catálogo de cursos del portal Alumni, revisa estado,
                                modalidad, fechas, responsable y accede a edición o visualización detallada.
                            </p>
                        </div>

                        <div className="cursos-list-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => void cargarCursos(true)}
                                disabled={refreshing}
                            >
                                <FaRedo />
                                <span>{refreshing ? "Actualizando..." : "Actualizar"}</span>
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={() => navigate(resolveCursosCreateRoute())}
                            >
                                <FaPlusCircle />
                                <span>Nuevo curso</span>
                            </button>
                        </div>
                    </div>

                    <div className="cursos-list-stats">
                        <div className="cursos-list-stat">
                            <span className="cursos-list-stat__label">Total</span>
                            <strong className="cursos-list-stat__value">{resumen.total}</strong>
                        </div>

                        <div className="cursos-list-stat">
                            <span className="cursos-list-stat__label">Activos</span>
                            <strong className="cursos-list-stat__value">{resumen.activos}</strong>
                        </div>

                        <div className="cursos-list-stat">
                            <span className="cursos-list-stat__label">Finalizados</span>
                            <strong className="cursos-list-stat__value">{resumen.finalizados}</strong>
                        </div>

                        <div className="cursos-list-stat">
                            <span className="cursos-list-stat__label">Visibles</span>
                            <strong className="cursos-list-stat__value">{resumen.visibles}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="cursos-list-content">
                <div className="container">
                    <div className="cursos-list-toolbar">
                        <div className="cursos-list-toolbar__search">
                            <label htmlFor="cursos-list-search">
                                <FaSearch />
                                <span>Buscar</span>
                            </label>
                            <input
                                id="cursos-list-search"
                                type="text"
                                className="form-control"
                                placeholder="Título, responsable o descripción..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="cursos-list-toolbar__filters">
                            <div className="cursos-list-toolbar__filter">
                                <label htmlFor="cursos-list-estado">Estado</label>
                                <select
                                    id="cursos-list-estado"
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

                            <div className="cursos-list-toolbar__filter">
                                <label htmlFor="cursos-list-modalidad">Modalidad</label>
                                <select
                                    id="cursos-list-modalidad"
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

                            <div className="cursos-list-toolbar__actions">
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
                        <div className="cursos-list-alert">{error}</div>
                    ) : cursosFiltrados.length === 0 ? (
                        <div className="cursos-list-empty">
                            <FaUserGraduate />
                            <h3>No hay cursos para mostrar</h3>
                            <p>
                                {cursos.length === 0
                                    ? "Aún no existen cursos registrados en el sistema."
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
                        <div className="cursos-list-grid">
                            {cursosFiltrados.map((curso) => {
                                const estadoClase = normalizarEstadoClase(curso);
                                const inscritos = curso.inscritos?.length ?? 0;

                                return (
                                    <article
                                        key={curso.id}
                                        className="curso-list-card animate__animated animate__fadeInUp"
                                    >
                                        <div className="curso-list-card__media">
                                            <img
                                                src={curso.imagen_portada || placeholderImg}
                                                alt={curso.titulo || "Curso"}
                                                className="curso-list-card__image"
                                            />
                                            <div className="curso-list-card__overlay" />

                                            <div className="curso-list-card__badges">
                                                <span
                                                    className={`curso-list-card__status curso-list-card__status--${estadoClase}`}
                                                >
                                                    {getEstadoTexto(curso)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="curso-list-card__body">
                                            <div className="curso-list-card__top">
                                                <h3 className="curso-list-card__title">
                                                    {curso.titulo || "Curso sin título"}
                                                </h3>

                                                <span className="curso-list-card__modalidad">
                                                    <FaLayerGroup />
                                                    <span>{getModalidadTexto(curso)}</span>
                                                </span>
                                            </div>

                                            <p className="curso-list-card__description">
                                                {descripcionCorta(curso.descripcion)}
                                            </p>

                                            <div className="curso-list-card__meta">
                                                <div className="curso-list-card__metaItem">
                                                    <FaChalkboardTeacher />
                                                    <span>{curso.responsable || "Responsable no definido"}</span>
                                                </div>

                                                <div className="curso-list-card__metaItem">
                                                    <FaCalendarAlt />
                                                    <span>Inicio: {formatearFecha(curso.fecha_inicio)}</span>
                                                </div>

                                                <div className="curso-list-card__metaItem">
                                                    <FaCalendarAlt />
                                                    <span>Fin: {formatearFecha(curso.fecha_fin)}</span>
                                                </div>

                                                <div className="curso-list-card__metaItem">
                                                    <FaUserGraduate />
                                                    <span>{inscritos} inscrito{inscritos === 1 ? "" : "s"}</span>
                                                </div>
                                            </div>

                                            <div className="curso-list-card__actions">
                                                <button
                                                    type="button"
                                                    className="nur-btn nur-btn--ghost"
                                                    onClick={() => curso.id && navigate(resolveCursosDetalleRoute(curso.id))}
                                                    disabled={!curso.id}
                                                >
                                                    <FaEye />
                                                    <span>Ver</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="nur-btn nur-btn--ghost"
                                                    onClick={() => curso.id && navigate(resolveCursosEditRoute(curso.id))}
                                                    disabled={!curso.id}
                                                >
                                                    <FaEdit />
                                                    <span>Editar</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="nur-btn nur-btn--ghost-danger"
                                                    onClick={() => void eliminarCurso(curso)}
                                                    disabled={!curso.id || deletingId === curso.id}
                                                >
                                                    <FaTrash />
                                                    <span>
                                                        {deletingId === curso.id ? "Eliminando..." : "Eliminar"}
                                                    </span>
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

export default CursosListPage;