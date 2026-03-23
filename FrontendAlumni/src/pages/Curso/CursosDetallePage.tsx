import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Modal } from "react-bootstrap";
import "animate.css";
import "./CursosDetallePage.css";

import { CursoService } from "../../services/alumni/CursoService";
import UserAlumniService from "../../services/alumni/UserAlumniService";
import { Curso } from "../../models/Curso/Curso";
import { resolveMediaSrc } from "../../utils/media";
import { resolveEnvUrl } from "../../utils/runtimeUrls";

import {
    FaArrowLeft,
    FaBookOpen,
    FaCalendarAlt,
    FaCheckCircle,
    FaChalkboardTeacher,
    FaClock,
    FaDoorOpen,
    FaInfoCircle,
    FaLayerGroup,
    FaSignInAlt,
    FaUserGraduate,
    FaUserTimes,
    FaUsers,
} from "react-icons/fa";

const placeholderImg = "/placeholder-comunidad.png";
const CONTENT_MEDIA_URL = resolveEnvUrl(import.meta.env.VITE_CONTENT_MEDIA_URL || "");

type CursoUsuarioDetalle = {
    id?: number;
    is_admin?: boolean;
    carrera_nombre?: string | null;
    carrera_codigo?: string | null;
    user?: {
        id?: number;
        username?: string;
        first_name?: string;
        last_name?: string;
        email?: string | null;
    } | null;
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

const normalizarEstadoClase = (estado?: string | null): string => {
    const valor = (estado || "sin-estado").toLowerCase();

    if (valor.includes("activo")) return "activo";
    if (valor.includes("final")) return "finalizado";
    if (valor.includes("cancel")) return "cancelado";
    if (valor.includes("inactivo")) return "inactivo";

    return "sin-estado";
};

const obtenerModalidad = (curso?: Curso | null): string => {
    return curso?.modalidad_display || curso?.modalidad || "Modalidad no definida";
};

const obtenerEstado = (curso?: Curso | null): string => {
    return curso?.estado_display || curso?.estado || "Sin estado definido";
};

const getUserDisplayName = (usuario?: CursoUsuarioDetalle | null): string => {
    const firstName = usuario?.user?.first_name?.trim() || "";
    const lastName = usuario?.user?.last_name?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;
    if (usuario?.user?.username?.trim()) return usuario.user.username.trim();
    if (usuario?.user?.email?.trim()) return usuario.user.email.trim();

    return `Usuario #${usuario?.id ?? "N/D"}`;
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

const CursoDetallePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [curso, setCurso] = useState<Curso | null>(null);
    const [participantes, setParticipantes] = useState<CursoUsuarioDetalle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [processing, setProcessing] = useState<boolean>(false);
    const [loadingParticipantes, setLoadingParticipantes] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [warningParticipantes, setWarningParticipantes] = useState<string>("");

    const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
        const perfil = UserAlumniService.getCachedPerfilCompleto();
        return perfil?.usuario?.id ?? null;
    });

    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        const perfil = UserAlumniService.getCachedPerfilCompleto();
        return Boolean(perfil?.usuario?.is_admin);
    });

    const [inscrito, setInscrito] = useState<boolean>(false);
    const [showModalInscribir, setShowModalInscribir] = useState<boolean>(false);
    const [showModalDesinscribir, setShowModalDesinscribir] = useState<boolean>(false);

    const cursoId = useMemo(() => {
        if (!id) return null;
        const parsed = Number(id);
        return Number.isNaN(parsed) ? null : parsed;
    }, [id]);

    const cargarPerfil = async (): Promise<void> => {
        try {
            const perfil = await UserAlumniService.loadPerfilCompleto();
            setCurrentUserId(perfil?.usuario?.id ?? null);
            setIsAdmin(Boolean(perfil?.usuario?.is_admin));
        } catch (profileError) {
            console.warn("No se pudo cargar el perfil completo para el detalle del curso.", profileError);
        }
    };

    const cargarCurso = async (): Promise<Curso | null> => {
        if (!cursoId) {
            setError("El identificador del curso no es válido.");
            return null;
        }

        try {
            const data = await CursoService.get(cursoId);
            setCurso(data);
            return data;
        } catch (loadError) {
            console.error("Error al cargar el curso.", loadError);
            setError("No se pudo cargar el detalle del curso.");
            return null;
        }
    };

    const cargarParticipantes = async (): Promise<void> => {
        if (!cursoId || !isAdmin) {
            setParticipantes([]);
            return;
        }

        try {
            setLoadingParticipantes(true);
            setWarningParticipantes("");

            const response = await CursoService.getUsuariosDetalle<CursoUsuarioDetalle>(cursoId);
            setParticipantes(response.usuarios ?? []);
        } catch (participantsError) {
            console.warn("No se pudo cargar el detalle de usuarios inscritos.", participantsError);
            setWarningParticipantes("No se pudo obtener el detalle completo de los inscritos.");
            setParticipantes([]);
        } finally {
            setLoadingParticipantes(false);
        }
    };

    useEffect(() => {
        void cargarPerfil();
    }, []);

    useEffect(() => {
        const init = async (): Promise<void> => {
            setLoading(true);
            setError("");

            const data = await cargarCurso();

            if (data && currentUserId) {
                setInscrito(CursoService.isUserInscrito(data, currentUserId));
            }

            setLoading(false);
        };

        void init();
    }, [cursoId, currentUserId]);

    useEffect(() => {
        if (curso && currentUserId) {
            setInscrito(CursoService.isUserInscrito(curso, currentUserId));
        } else {
            setInscrito(false);
        }
    }, [curso, currentUserId]);

    useEffect(() => {
        void cargarParticipantes();
    }, [cursoId, isAdmin, curso?.inscritos?.length]);

    const estadoClase = normalizarEstadoClase(obtenerEstado(curso));
    const cantidadInscritos = curso?.inscritos?.length ?? 0;
    const puedeInscribirse = Boolean(currentUserId) && !inscrito && !processing;
    const puedeDesinscribirse = Boolean(currentUserId) && inscrito && !processing;

    const handleInscribirse = async (): Promise<void> => {
        if (!cursoId) {
            setError("No se pudo identificar el curso.");
            return;
        }

        if (!currentUserId) {
            setError("Debes iniciar sesión para inscribirte al curso.");
            setShowModalInscribir(false);
            return;
        }

        try {
            setProcessing(true);
            setError("");

            await CursoService.inscribirUsuario(cursoId, currentUserId);
            await UserAlumniService.loadPerfilCompleto(true);

            const updated = await CursoService.get(cursoId);
            setCurso(updated);
            setInscrito(true);
            setShowModalInscribir(false);
        } catch (actionError) {
            console.error("Error al inscribirse al curso.", actionError);
            setError(getErrorMessage(actionError));
        } finally {
            setProcessing(false);
        }
    };

    const handleDesinscribirse = async (): Promise<void> => {
        if (!cursoId) {
            setError("No se pudo identificar el curso.");
            return;
        }

        if (!currentUserId) {
            setError("Debes iniciar sesión para gestionar tu inscripción.");
            setShowModalDesinscribir(false);
            return;
        }

        try {
            setProcessing(true);
            setError("");

            await CursoService.desinscribirUsuario(cursoId, currentUserId);
            await UserAlumniService.loadPerfilCompleto(true);

            const updated = await CursoService.get(cursoId);
            setCurso(updated);
            setInscrito(false);
            setShowModalDesinscribir(false);
        } catch (actionError) {
            console.error("Error al desinscribirse del curso.", actionError);
            setError(getErrorMessage(actionError));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="curso-detalle-page animate__animated animate__fadeIn">
                <section className="curso-detalle-content">
                    <div className="container">
                        <div className="curso-detalle-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando detalle del curso...</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (!curso) {
        return (
            <div className="curso-detalle-page animate__animated animate__fadeIn">
                <section className="curso-detalle-content">
                    <div className="container">
                        <div className="curso-detalle-empty">
                            <FaInfoCircle />
                            <h2>No se encontró el curso</h2>
                            <p>{error || "El recurso solicitado no está disponible."}</p>
                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={() => navigate(-1)}
                            >
                                <FaArrowLeft />
                                <span>Volver</span>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="curso-detalle-page animate__animated animate__fadeIn">
            <section className="curso-detalle-hero">
                <div className="container">
                    <div className="curso-detalle-hero__topbar">
                        <button
                            type="button"
                            className="nur-btn nur-btn--ghost"
                            onClick={() => navigate(-1)}
                        >
                            <FaArrowLeft />
                            <span>Volver</span>
                        </button>

                        <div className="curso-detalle-hero__actions">
                            {puedeInscribirse && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={() => setShowModalInscribir(true)}
                                >
                                    <FaSignInAlt />
                                    <span>Inscribirme</span>
                                </button>
                            )}

                            {puedeDesinscribirse && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--ghost-danger"
                                    onClick={() => setShowModalDesinscribir(true)}
                                >
                                    <FaUserTimes />
                                    <span>Desinscribirme</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="curso-detalle-hero__panel">
                        <div className="curso-detalle-hero__layout">
                            <div className="curso-detalle-hero__content">
                                <span className="curso-detalle-hero__eyebrow">
                                    <FaBookOpen />
                                    Formación Alumni
                                </span>

                                <h1 className="curso-detalle-hero__title">
                                    {curso.titulo || "Curso sin título"}
                                </h1>

                                <p className="curso-detalle-hero__text">
                                    {curso.descripcion?.trim()
                                        ? curso.descripcion
                                        : "Este curso aún no cuenta con una descripción detallada."}
                                </p>

                                <div className="curso-detalle-hero__badges">
                                    <span
                                        className={`curso-detalle-hero__status curso-detalle-hero__status--${estadoClase}`}
                                    >
                                        {curso.estado_display || curso.estado || "Sin estado"}
                                    </span>

                                    <span className="curso-detalle-hero__badge">
                                        <FaLayerGroup />
                                        <span>{obtenerModalidad(curso)}</span>
                                    </span>

                                    <span className="curso-detalle-hero__badge">
                                        <FaUsers />
                                        <span>{cantidadInscritos} inscrito{cantidadInscritos === 1 ? "" : "s"}</span>
                                    </span>

                                    {inscrito && (
                                        <span className="curso-detalle-hero__badge curso-detalle-hero__badge--success">
                                            <FaCheckCircle />
                                            <span>Ya estás inscrito</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="curso-detalle-hero__imageCard">
                                <img
                                    src={resolveMediaSrc(CONTENT_MEDIA_URL, curso.imagen_portada, placeholderImg)}
                                    alt={curso.titulo || "Curso"}
                                    className="curso-detalle-hero__image"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="curso-detalle-content">
                <div className="container">
                    {error && (
                        <div className="curso-detalle-alert">
                            <FaInfoCircle />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="curso-detalle-grid">
                        <main className="curso-detalle-main">
                            <section className="curso-detalle-card">
                                <div className="curso-detalle-card__header">
                                    <div>
                                        <span className="curso-detalle-card__eyebrow">Resumen</span>
                                        <h2 className="curso-detalle-card__title">
                                            Información del curso
                                        </h2>
                                    </div>
                                </div>

                                <div className="curso-detalle-infoGrid">
                                    <div className="curso-detalle-infoItem">
                                        <div className="curso-detalle-infoItem__icon">
                                            <FaChalkboardTeacher />
                                        </div>
                                        <div>
                                            <span className="curso-detalle-infoItem__label">Responsable</span>
                                            <strong className="curso-detalle-infoItem__value">
                                                {curso.responsable || "No definido"}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="curso-detalle-infoItem">
                                        <div className="curso-detalle-infoItem__icon">
                                            <FaLayerGroup />
                                        </div>
                                        <div>
                                            <span className="curso-detalle-infoItem__label">Modalidad</span>
                                            <strong className="curso-detalle-infoItem__value">
                                                {obtenerModalidad(curso)}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="curso-detalle-infoItem">
                                        <div className="curso-detalle-infoItem__icon">
                                            <FaCalendarAlt />
                                        </div>
                                        <div>
                                            <span className="curso-detalle-infoItem__label">Fecha de inicio</span>
                                            <strong className="curso-detalle-infoItem__value">
                                                {formatearFecha(curso.fecha_inicio)}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="curso-detalle-infoItem">
                                        <div className="curso-detalle-infoItem__icon">
                                            <FaClock />
                                        </div>
                                        <div>
                                            <span className="curso-detalle-infoItem__label">Fecha de cierre</span>
                                            <strong className="curso-detalle-infoItem__value">
                                                {formatearFecha(curso.fecha_fin)}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="curso-detalle-infoItem">
                                        <div className="curso-detalle-infoItem__icon">
                                            <FaDoorOpen />
                                        </div>
                                        <div>
                                            <span className="curso-detalle-infoItem__label">Estado</span>
                                            <strong className="curso-detalle-infoItem__value">
                                                {obtenerEstado(curso)}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="curso-detalle-infoItem">
                                        <div className="curso-detalle-infoItem__icon">
                                            <FaUserGraduate />
                                        </div>
                                        <div>
                                            <span className="curso-detalle-infoItem__label">Inscritos</span>
                                            <strong className="curso-detalle-infoItem__value">
                                                {cantidadInscritos}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="curso-detalle-card">
                                <div className="curso-detalle-card__header">
                                    <div>
                                        <span className="curso-detalle-card__eyebrow">Descripción</span>
                                        <h2 className="curso-detalle-card__title">
                                            Alcance del curso
                                        </h2>
                                    </div>
                                </div>

                                <div className="curso-detalle-description">
                                    <p>
                                        {curso.descripcion?.trim()
                                            ? curso.descripcion
                                            : "No existe una descripción ampliada para este curso."}
                                    </p>
                                </div>
                            </section>
                        </main>

                        <aside className="curso-detalle-side">
                            <section className="curso-detalle-card">
                                <div className="curso-detalle-card__header">
                                    <div>
                                        <span className="curso-detalle-card__eyebrow">Acciones</span>
                                        <h2 className="curso-detalle-card__title">
                                            Estado de inscripción
                                        </h2>
                                    </div>
                                </div>

                                <div className="curso-detalle-cta">
                                    <p className="curso-detalle-cta__status">
                                        {currentUserId
                                            ? inscrito
                                                ? "Actualmente estás inscrito en este curso."
                                                : "Aún no estás inscrito en este curso."
                                            : "Inicia sesión para gestionar tu inscripción."}
                                    </p>

                                    <div className="curso-detalle-cta__actions">
                                        {puedeInscribirse && (
                                            <button
                                                type="button"
                                                className="nur-btn nur-btn--primary"
                                                onClick={() => setShowModalInscribir(true)}
                                            >
                                                <FaSignInAlt />
                                                <span>Inscribirme ahora</span>
                                            </button>
                                        )}

                                        {puedeDesinscribirse && (
                                            <button
                                                type="button"
                                                className="nur-btn nur-btn--ghost-danger"
                                                onClick={() => setShowModalDesinscribir(true)}
                                            >
                                                <FaUserTimes />
                                                <span>Cancelar inscripción</span>
                                            </button>
                                        )}

                                        {!currentUserId && (
                                            <div className="curso-detalle-cta__notice">
                                                Debes tener una sesión activa para usar esta acción.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {isAdmin && (
                                <section className="curso-detalle-card">
                                    <div className="curso-detalle-card__header">
                                        <div>
                                            <span className="curso-detalle-card__eyebrow">Vista administrativa</span>
                                            <h2 className="curso-detalle-card__title">
                                                Participantes inscritos
                                            </h2>
                                        </div>
                                    </div>

                                    {loadingParticipantes ? (
                                        <div className="curso-detalle-sideFeedback">
                                            <div className="spinner-border spinner-border-sm text-warning" role="status" />
                                            <span>Cargando inscritos...</span>
                                        </div>
                                    ) : warningParticipantes ? (
                                        <div className="curso-detalle-sideWarning">
                                            <FaInfoCircle />
                                            <span>{warningParticipantes}</span>
                                        </div>
                                    ) : participantes.length === 0 ? (
                                        <div className="curso-detalle-sideEmpty">
                                            <FaUsers />
                                            <span>No hay usuarios inscritos registrados.</span>
                                        </div>
                                    ) : (
                                        <div className="curso-detalle-participantes">
                                            {participantes.map((usuario) => (
                                                <article
                                                    key={`${usuario.id}-${usuario.user?.id ?? usuario.user?.username ?? "user"}`}
                                                    className="curso-detalle-participante"
                                                >
                                                    <div className="curso-detalle-participante__avatar">
                                                        {getUserDisplayName(usuario).charAt(0).toUpperCase()}
                                                    </div>

                                                    <div className="curso-detalle-participante__content">
                                                        <strong>{getUserDisplayName(usuario)}</strong>
                                                        <span>{usuario.user?.email || "Sin correo visible"}</span>
                                                        <small>
                                                            {usuario.carrera_nombre || "Sin carrera"}
                                                            {usuario.carrera_codigo ? ` · ${usuario.carrera_codigo}` : ""}
                                                        </small>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}
                        </aside>
                    </div>
                </div>
            </section>

            <Modal
                show={showModalInscribir}
                onHide={() => setShowModalInscribir(false)}
                centered
                dialogClassName="curso-detalle-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaSignInAlt className="me-2" />
                        Confirmar inscripción
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body className="animate__animated animate__fadeIn">
                    ¿Estás seguro de que deseas inscribirte al curso{" "}
                    <strong>{curso.titulo}</strong>?
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowModalInscribir(false)}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="warning"
                        onClick={handleInscribirse}
                        disabled={processing}
                    >
                        {processing ? "Procesando..." : "Sí, inscribirme"}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={showModalDesinscribir}
                onHide={() => setShowModalDesinscribir(false)}
                centered
                dialogClassName="curso-detalle-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaUserTimes className="me-2" />
                        Confirmar desinscripción
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body className="animate__animated animate__fadeIn">
                    ¿Estás seguro de que deseas darte de baja del curso{" "}
                    <strong>{curso.titulo}</strong>?
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowModalDesinscribir(false)}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="danger"
                        onClick={handleDesinscribirse}
                        disabled={processing}
                    >
                        {processing ? "Procesando..." : "Sí, desinscribirme"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CursoDetallePage;