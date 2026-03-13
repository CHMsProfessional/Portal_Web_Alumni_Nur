/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal } from "react-bootstrap";
import "animate.css";
import {
    FaArrowRight,
    FaBookOpen,
    FaCalendarAlt,
    FaCheckCircle,
    FaChalkboardTeacher,
    FaClock,
    FaLayerGroup,
    FaRedo,
    FaSearch,
    FaSignInAlt,
    FaUserGraduate,
    FaUsers,
} from "react-icons/fa";

import "./CursosDisponiblesPage.css";

import { CursoService } from "../../services/alumni/CursoService";
import UserAlumniService from "../../services/alumni/UserAlumniService";
import { Curso } from "../../models/Curso/Curso";
import { Routes } from "../../routes/CONSTANTS";

const placeholderImg = "/placeholder-comunidad.png";

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

    return fn ? fn(cursoId) : `/cursos/detalle/${cursoId}`;
};

const getErrorMessage = (error: unknown): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object"
    ) {
        const response = (error as { response?: { data?: unknown } }).response;
        const data = response?.data;

        if (typeof data === "string") return data;

        if (typeof data === "object" && data !== null) {
            if ("error" in data && typeof (data as { error?: unknown }).error === "string") {
                return (data as { error: string }).error;
            }

            if ("detail" in data && typeof (data as { detail?: unknown }).detail === "string") {
                return (data as { detail: string }).detail;
            }

            if ("message" in data && typeof (data as { message?: unknown }).message === "string") {
                return (data as { message: string }).message;
            }
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado.";
};

const CursosDisponiblesPage = () => {
    const navigate = useNavigate();

    const [cursos, setCursos] = useState<Curso[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [processing, setProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const [search, setSearch] = useState<string>("");
    const [filtroEstado, setFiltroEstado] = useState<string>("activo");
    const [filtroModalidad, setFiltroModalidad] = useState<string>("");

    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
    const [showModalInscribir, setShowModalInscribir] = useState<boolean>(false);

    const cargarCursos = async (forceRefresh = false): Promise<void> => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const [perfil, cursosData] = await Promise.all([
                UserAlumniService.loadPerfilCompleto(forceRefresh),
                CursoService.list(),
            ]);

            const userId = perfil?.usuario?.id ?? null;
            const admin = Boolean(perfil?.usuario?.is_admin);

            setCurrentUserId(userId);
            setIsAdmin(admin);

            const disponibles = (cursosData ?? [])
                .filter((curso) => {
                    if (!userId) return true;
                    return !CursoService.isUserInscrito(curso, userId);
                })
                .sort((a, b) => parseDateValue(a.fecha_inicio) - parseDateValue(b.fecha_inicio));

            setCursos(disponibles);
        } catch (loadError) {
            console.error("Error al cargar cursos disponibles.", loadError);
            setError("No se pudieron cargar los cursos disponibles.");
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
        setFiltroEstado("activo");
        setFiltroModalidad("");
    };

    const abrirModalInscripcion = (curso: Curso): void => {
        setSelectedCurso(curso);
        setShowModalInscribir(true);
    };

    const cerrarModalInscripcion = (): void => {
        if (processing) return;
        setShowModalInscribir(false);
        setSelectedCurso(null);
    };

    const confirmarInscripcion = async (): Promise<void> => {
        if (!selectedCurso?.id) {
            setError("No se pudo identificar el curso seleccionado.");
            cerrarModalInscripcion();
            return;
        }

        if (!currentUserId) {
            setError("Debes iniciar sesión para inscribirte a un curso.");
            cerrarModalInscripcion();
            return;
        }

        try {
            setProcessing(true);
            setError("");

            await CursoService.inscribirUsuario(selectedCurso.id, currentUserId);
            await UserAlumniService.loadPerfilCompleto(true);

            setCursos((prev) => prev.filter((curso) => curso.id !== selectedCurso.id));
            cerrarModalInscripcion();
        } catch (actionError) {
            console.error("Error al inscribirse al curso.", actionError);
            setError(getErrorMessage(actionError));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="cursos-disponibles-page animate__animated animate__fadeIn">
                <section className="cursos-disponibles-content">
                    <div className="container">
                        <div className="cursos-disponibles-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando cursos disponibles...</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="cursos-disponibles-page animate__animated animate__fadeIn">
            <section className="cursos-disponibles-hero">
                <div className="container">
                    <div className="cursos-disponibles-hero__content">
                        <div className="cursos-disponibles-hero__copy">
                            <span className="cursos-disponibles-hero__eyebrow">
                                <FaBookOpen />
                                Catálogo Alumni
                            </span>

                            <h1 className="cursos-disponibles-hero__title">
                                Cursos disponibles
                            </h1>

                            <p className="cursos-disponibles-hero__text">
                                Explora la oferta formativa disponible para ti, revisa su modalidad,
                                estado, responsable y fechas clave antes de inscribirte.
                            </p>
                        </div>

                        <div className="cursos-disponibles-hero__actions">
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

                    <div className="cursos-disponibles-stats">
                        <div className="cursos-disponibles-stat">
                            <span className="cursos-disponibles-stat__label">Total disponibles</span>
                            <strong className="cursos-disponibles-stat__value">{resumen.total}</strong>
                        </div>

                        <div className="cursos-disponibles-stat">
                            <span className="cursos-disponibles-stat__label">Activos</span>
                            <strong className="cursos-disponibles-stat__value">{resumen.activos}</strong>
                        </div>

                        <div className="cursos-disponibles-stat">
                            <span className="cursos-disponibles-stat__label">Finalizados</span>
                            <strong className="cursos-disponibles-stat__value">{resumen.finalizados}</strong>
                        </div>

                        <div className="cursos-disponibles-stat">
                            <span className="cursos-disponibles-stat__label">Visibles</span>
                            <strong className="cursos-disponibles-stat__value">{resumen.visibles}</strong>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="cursos-disponibles-admin-note">
                            Como administrador, aquí ves los cursos a los que tu usuario actual aún no está inscrito.
                            La administración global del catálogo sigue estando separada.
                        </div>
                    )}
                </div>
            </section>

            <section className="cursos-disponibles-content">
                <div className="container">
                    <div className="cursos-disponibles-toolbar">
                        <div className="cursos-disponibles-toolbar__search">
                            <label htmlFor="cursos-disponibles-search">
                                <FaSearch />
                                <span>Buscar</span>
                            </label>
                            <input
                                id="cursos-disponibles-search"
                                type="text"
                                className="form-control"
                                placeholder="Título, descripción o responsable..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="cursos-disponibles-toolbar__filters">
                            <div className="cursos-disponibles-toolbar__filter">
                                <label htmlFor="cursos-disponibles-estado">Estado</label>
                                <select
                                    id="cursos-disponibles-estado"
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

                            <div className="cursos-disponibles-toolbar__filter">
                                <label htmlFor="cursos-disponibles-modalidad">Modalidad</label>
                                <select
                                    id="cursos-disponibles-modalidad"
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

                            <div className="cursos-disponibles-toolbar__actions">
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
                        <div className="cursos-disponibles-alert">
                            {error}
                        </div>
                    ) : cursosFiltrados.length === 0 ? (
                        <div className="cursos-disponibles-empty">
                            <FaUserGraduate />
                            <h3>No hay cursos disponibles para mostrar</h3>
                            <p>
                                {cursos.length === 0
                                    ? "No existen cursos disponibles fuera de tus inscripciones actuales."
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
                        <div className="cursos-disponibles-grid">
                            {cursosFiltrados.map((curso) => {
                                const estadoClase = normalizarEstadoClase(curso);
                                const inscritos = curso.inscritos?.length ?? 0;

                                return (
                                    <article
                                        key={curso.id}
                                        className="curso-disponible-card animate__animated animate__fadeInUp"
                                    >
                                        <div className="curso-disponible-card__media">
                                            <img
                                                src={curso.imagen_portada || placeholderImg}
                                                alt={curso.titulo || "Curso"}
                                                className="curso-disponible-card__image"
                                            />
                                            <div className="curso-disponible-card__overlay" />

                                            <div className="curso-disponible-card__badges">
                                                <span
                                                    className={`curso-disponible-card__status curso-disponible-card__status--${estadoClase}`}
                                                >
                                                    {getEstadoTexto(curso)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="curso-disponible-card__body">
                                            <div className="curso-disponible-card__top">
                                                <h3 className="curso-disponible-card__title">
                                                    {curso.titulo || "Curso sin título"}
                                                </h3>

                                                <span className="curso-disponible-card__modalidad">
                                                    <FaLayerGroup />
                                                    <span>{getModalidadTexto(curso)}</span>
                                                </span>
                                            </div>

                                            <p className="curso-disponible-card__description">
                                                {descripcionCorta(curso.descripcion)}
                                            </p>

                                            <div className="curso-disponible-card__meta">
                                                <div className="curso-disponible-card__metaItem">
                                                    <FaChalkboardTeacher />
                                                    <span>{curso.responsable || "Responsable no definido"}</span>
                                                </div>

                                                <div className="curso-disponible-card__metaItem">
                                                    <FaCalendarAlt />
                                                    <span>Inicio: {formatearFecha(curso.fecha_inicio)}</span>
                                                </div>

                                                <div className="curso-disponible-card__metaItem">
                                                    <FaClock />
                                                    <span>Fin: {formatearFecha(curso.fecha_fin)}</span>
                                                </div>

                                                <div className="curso-disponible-card__metaItem">
                                                    <FaUsers />
                                                    <span>{inscritos} inscrito{inscritos === 1 ? "" : "s"}</span>
                                                </div>
                                            </div>

                                            <div className="curso-disponible-card__footer">
                                                <button
                                                    type="button"
                                                    className="nur-btn nur-btn--ghost"
                                                    onClick={() => {
                                                        if (curso.id) {
                                                            navigate(resolveDetalleRoute(curso.id));
                                                        }
                                                    }}
                                                    disabled={!curso.id}
                                                >
                                                    <span>Ver detalle</span>
                                                    <FaArrowRight />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="nur-btn nur-btn--primary"
                                                    onClick={() => abrirModalInscripcion(curso)}
                                                    disabled={!curso.id || !currentUserId}
                                                >
                                                    <FaSignInAlt />
                                                    <span>Inscribirme</span>
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

            <Modal
                show={showModalInscribir}
                onHide={cerrarModalInscripcion}
                centered
                dialogClassName="curso-disponible-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaCheckCircle className="me-2" />
                        Confirmar inscripción
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body className="animate__animated animate__fadeIn">
                    {selectedCurso ? (
                        <>
                            ¿Deseas inscribirte al curso <strong>{selectedCurso.titulo}</strong>?
                        </>
                    ) : (
                        "No se pudo identificar el curso seleccionado."
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={cerrarModalInscripcion}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="warning"
                        onClick={confirmarInscripcion}
                        disabled={processing || !selectedCurso}
                    >
                        {processing ? "Procesando..." : "Sí, inscribirme"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CursosDisponiblesPage;