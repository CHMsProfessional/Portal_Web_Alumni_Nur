import { useEffect, useMemo, useState } from "react";
import "animate.css";
import {
    FaCalendarAlt,
    FaCalendarCheck,
    FaClock,
    FaInfoCircle,
    FaLayerGroup,
    FaRedo,
    FaUserCheck,
    FaUserTimes,
    FaUsers,
} from "react-icons/fa";

import "./EventoHomePage.css";

import type { Evento } from "../../models/Evento/Evento";
import { EventoService } from "../../services/alumni/EventoService";

const placeholderImg = "/placeholder-comunidad.png";

type FeedbackState = {
    type: "success" | "error";
    message: string;
} | null;

const formatearFecha = (fecha?: string | null): string => {
    if (!fecha) return "Sin fecha";

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return fecha;

    return parsed.toLocaleDateString("es-BO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const formatearHora = (fecha?: string | null): string => {
    if (!fecha) return "Hora no definida";

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return "Hora no definida";

    return parsed.toLocaleTimeString("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const construirRangoFecha = (evento: Evento): string => {
    if (!evento.fecha_inicio && !evento.fecha_fin) {
        return "Fecha no disponible";
    }

    if (evento.fecha_inicio && evento.fecha_fin) {
        const inicio = new Date(evento.fecha_inicio);
        const fin = new Date(evento.fecha_fin);

        if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime())) {
            const mismoDia =
                inicio.getFullYear() === fin.getFullYear() &&
                inicio.getMonth() === fin.getMonth() &&
                inicio.getDate() === fin.getDate();

            if (mismoDia) {
                return `${formatearFecha(evento.fecha_inicio)} · ${formatearHora(
                    evento.fecha_inicio
                )} - ${formatearHora(evento.fecha_fin)}`;
            }

            return `${formatearFecha(evento.fecha_inicio)} — ${formatearFecha(
                evento.fecha_fin
            )}`;
        }
    }

    return formatearFecha(evento.fecha_inicio ?? evento.fecha_fin);
};

const obtenerEstadoLabel = (evento: Evento): string => {
    if (evento.estado_display?.trim()) return evento.estado_display;

    switch (evento.estado) {
        case "ACTIVO":
            return "Activo";
        case "FINALIZADO":
            return "Finalizado";
        case "CANCELADO":
            return "Cancelado";
        default:
            return "Sin estado";
    }
};

const obtenerEstadoClase = (estado?: Evento["estado"]): string => {
    switch (estado) {
        case "ACTIVO":
            return "is-active";
        case "FINALIZADO":
            return "is-finished";
        case "CANCELADO":
            return "is-cancelled";
        default:
            return "is-neutral";
    }
};

const getInscritosCount = (evento: Evento): number =>
    evento.inscritos_count ?? evento.usuarios?.length ?? 0;

const getEstaInscrito = (evento: Evento): boolean =>
    Boolean(evento.esta_inscrito ?? false);

const getAlcanceLabel = (evento: Evento): string => {
    if (evento.alcance === "GLOBAL" || !evento.carreras?.length) {
        return "Toda la comunidad Alumni";
    }

    const cantidad = evento.carreras.length;
    return cantidad === 1
        ? "Dirigido a una carrera específica"
        : `Dirigido a ${cantidad} carreras`;
};

const EventoHomePage = () => {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [error, setError] = useState<string>("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);

    const cargarEventos = async (silent = false): Promise<void> => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        try {
            const data = await EventoService.list({ para_mi: true });
            const ordenados = [...data].sort((a, b) => {
                const aTime = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
                const bTime = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
                return bTime - aTime;
            });

            setEventos(ordenados);
        } catch (err) {
            console.error("Error al cargar los eventos.", err);
            setError("No se pudieron cargar los eventos en este momento.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void cargarEventos();
    }, []);

    const actualizarEventoEnEstado = (eventoActualizado: Evento): void => {
        setEventos((prev) =>
            prev.map((ev) => (ev.id === eventoActualizado.id ? eventoActualizado : ev))
        );
    };

    const refrescarEvento = async (eventoId: number): Promise<void> => {
        const updated = await EventoService.get(eventoId);
        actualizarEventoEnEstado(updated);
    };

    const eventosActivos = useMemo(
        () => eventos.filter((e) => e.estado === "ACTIVO"),
        [eventos]
    );

    const eventosFinalizados = useMemo(
        () => eventos.filter((e) => e.estado === "FINALIZADO"),
        [eventos]
    );

    const eventosCancelados = useMemo(
        () => eventos.filter((e) => e.estado === "CANCELADO"),
        [eventos]
    );

    const misInscripciones = useMemo(
        () => eventosActivos.filter((evento) => getEstaInscrito(evento)),
        [eventosActivos]
    );

    const disponibles = useMemo(
        () => eventosActivos.filter((evento) => !getEstaInscrito(evento)),
        [eventosActivos]
    );

    const resumen = useMemo(() => {
        const conRegistro = eventosActivos.filter((evento) => evento.requiere_registro).length;

        return {
            total: eventos.length,
            misInscripciones: misInscripciones.length,
            activos: eventosActivos.length,
            finalizados: eventosFinalizados.length,
            conRegistro,
        };
    }, [eventos, eventosActivos, eventosFinalizados, misInscripciones]);

    const handleInscribirse = async (evento: Evento): Promise<void> => {
        if (!evento.id) return;

        setFeedback(null);

        try {
            setProcessingId(evento.id);

            const response = await EventoService.inscribirUsuario(evento.id);

            if (response.evento) {
                actualizarEventoEnEstado(response.evento);
            } else {
                await refrescarEvento(evento.id);
            }

            setFeedback({
                type: "success",
                message:
                    response.message || "Tu inscripción al evento se realizó correctamente.",
            });
        } catch (err: unknown) {
            console.error("Error al inscribirse al evento.", err);
            setFeedback({
                type: "error",
                message: "No se pudo completar la inscripción al evento.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDesinscribirse = async (evento: Evento): Promise<void> => {
        if (!evento.id) return;

        setFeedback(null);

        try {
            setProcessingId(evento.id);

            const response = await EventoService.desinscribirUsuario(evento.id);

            if (response.evento) {
                actualizarEventoEnEstado(response.evento);
            } else {
                await refrescarEvento(evento.id);
            }

            setFeedback({
                type: "success",
                message:
                    response.message ||
                    "Tu inscripción fue cancelada correctamente.",
            });
        } catch (err: unknown) {
            console.error("Error al desinscribirse del evento.", err);
            setFeedback({
                type: "error",
                message: "No se pudo cancelar la inscripción en este momento.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const renderActionArea = (evento: Evento) => {
        const inscrito = getEstaInscrito(evento);
        const requiereRegistro = Boolean(evento.requiere_registro);
        const disabled = processingId === evento.id;

        if (evento.estado === "CANCELADO") {
            return (
                <div className="evento-nur-card__notice evento-nur-card__notice--muted">
                    <FaInfoCircle />
                    <span>Este evento fue cancelado por la organización.</span>
                </div>
            );
        }

        if (evento.estado === "FINALIZADO") {
            return (
                <div className="evento-nur-card__notice evento-nur-card__notice--muted">
                    <FaCalendarCheck />
                    <span>Este evento ya forma parte del historial institucional.</span>
                </div>
            );
        }

        if (!requiereRegistro) {
            return (
                <div className="evento-nur-card__notice">
                    <FaInfoCircle />
                    <span>Participación abierta. No necesitas registrarte previamente.</span>
                </div>
            );
        }

        if (inscrito) {
            return (
                <div className="evento-nur-card__actions">
                    <button
                        type="button"
                        className="nur-btn nur-btn--secondary"
                        disabled
                    >
                        <FaUserCheck />
                        <span>Ya inscrito</span>
                    </button>

                    <button
                        type="button"
                        className="nur-btn nur-btn--ghost-danger"
                        onClick={() => void handleDesinscribirse(evento)}
                        disabled={disabled}
                    >
                        <FaUserTimes />
                        <span>{disabled ? "Procesando..." : "Cancelar inscripción"}</span>
                    </button>
                </div>
            );
        }

        return (
            <button
                type="button"
                className="nur-btn nur-btn--primary evento-nur-card__cta"
                onClick={() => void handleInscribirse(evento)}
                disabled={disabled}
            >
                <FaUserCheck />
                <span>{disabled ? "Procesando..." : "Inscribirme"}</span>
            </button>
        );
    };

    const renderEventoCard = (evento: Evento) => {
        const inscritos = getInscritosCount(evento);
        const requiereRegistro = Boolean(evento.requiere_registro);

        return (
            <article
                className="evento-nur-card animate__animated animate__fadeInUp"
                key={evento.id}
            >
                <div className="evento-nur-card__media">
                    <img
                        src={evento.imagen_portada || placeholderImg}
                        alt={evento.titulo || "Evento"}
                        className="evento-nur-card__image"
                    />

                    <div className="evento-nur-card__overlay" />

                    <div className="evento-nur-card__badges">
                        <span
                            className={`evento-nur-badge evento-nur-badge--state ${obtenerEstadoClase(
                                evento.estado
                            )}`}
                        >
                            {obtenerEstadoLabel(evento)}
                        </span>

                        <span
                            className={`evento-nur-badge ${
                                requiereRegistro
                                    ? "evento-nur-badge--accent"
                                    : "evento-nur-badge--soft"
                            }`}
                        >
                            {requiereRegistro ? "Con inscripción" : "Acceso libre"}
                        </span>
                    </div>
                </div>

                <div className="evento-nur-card__body">
                    <div className="evento-nur-card__header">
                        <h3 className="evento-nur-card__title">
                            {evento.titulo || "Evento sin título"}
                        </h3>

                        <p className="evento-nur-card__description">
                            {evento.descripcion?.trim() ||
                                "Este evento no cuenta con una descripción registrada."}
                        </p>
                    </div>

                    <div className="evento-nur-card__meta">
                        <div className="evento-nur-meta-item">
                            <span className="evento-nur-meta-item__icon">
                                <FaCalendarAlt />
                            </span>
                            <div>
                                <span className="evento-nur-meta-item__label">Fecha</span>
                                <span className="evento-nur-meta-item__value">
                                    {construirRangoFecha(evento)}
                                </span>
                            </div>
                        </div>

                        <div className="evento-nur-meta-item">
                            <span className="evento-nur-meta-item__icon">
                                <FaClock />
                            </span>
                            <div>
                                <span className="evento-nur-meta-item__label">Inicio</span>
                                <span className="evento-nur-meta-item__value">
                                    {evento.fecha_inicio
                                        ? formatearHora(evento.fecha_inicio)
                                        : "Por definir"}
                                </span>
                            </div>
                        </div>

                        <div className="evento-nur-meta-item">
                            <span className="evento-nur-meta-item__icon">
                                <FaUsers />
                            </span>
                            <div>
                                <span className="evento-nur-meta-item__label">Participación</span>
                                <span className="evento-nur-meta-item__value">
                                    {inscritos} inscrito{inscritos === 1 ? "" : "s"}
                                </span>
                            </div>
                        </div>

                        <div className="evento-nur-meta-item">
                            <span className="evento-nur-meta-item__icon">
                                <FaLayerGroup />
                            </span>
                            <div>
                                <span className="evento-nur-meta-item__label">Alcance</span>
                                <span className="evento-nur-meta-item__value">
                                    {getAlcanceLabel(evento)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="evento-nur-card__footer">{renderActionArea(evento)}</div>
                </div>
            </article>
        );
    };

    return (
        <div className="evento-home-nur-page animate__animated animate__fadeIn">
            <section className="evento-home-nur-hero">
                <div className="container">
                    <div className="evento-home-nur-hero__content">
                        <div className="evento-home-nur-hero__copy">
                            <span className="evento-home-nur-hero__eyebrow">
                                <FaCalendarAlt />
                                Agenda institucional Alumni
                            </span>

                            <h1 className="evento-home-nur-hero__title">
                                Eventos y actividades de la comunidad NUR
                            </h1>

                            <p className="evento-home-nur-hero__text">
                                Consulta tus próximos encuentros, revisa en qué actividades ya
                                participas y mantente al tanto del historial institucional con una
                                vista más clara, sobria y útil para Alumni.
                            </p>
                        </div>

                        <div className="evento-home-nur-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => void cargarEventos(true)}
                                disabled={loading || refreshing}
                            >
                                <FaRedo />
                                <span>
                                    {refreshing ? "Actualizando..." : "Recargar eventos"}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="evento-home-nur-stats">
                        <div className="evento-home-nur-stat-card">
                            <span className="evento-home-nur-stat-card__label">Visibles para mí</span>
                            <strong className="evento-home-nur-stat-card__value">
                                {resumen.total}
                            </strong>
                        </div>

                        <div className="evento-home-nur-stat-card">
                            <span className="evento-home-nur-stat-card__label">Mis inscripciones</span>
                            <strong className="evento-home-nur-stat-card__value">
                                {resumen.misInscripciones}
                            </strong>
                        </div>

                        <div className="evento-home-nur-stat-card">
                            <span className="evento-home-nur-stat-card__label">Activos</span>
                            <strong className="evento-home-nur-stat-card__value">
                                {resumen.activos}
                            </strong>
                        </div>

                        <div className="evento-home-nur-stat-card">
                            <span className="evento-home-nur-stat-card__label">Con registro</span>
                            <strong className="evento-home-nur-stat-card__value">
                                {resumen.conRegistro}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="evento-home-nur-content">
                <div className="container">
                    {feedback && (
                        <div
                            className={`evento-home-nur-inline-alert evento-home-nur-inline-alert--${feedback.type}`}
                        >
                            {feedback.message}
                        </div>
                    )}

                    {loading ? (
                        <div className="evento-home-nur-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mb-0 mt-3">Cargando eventos...</p>
                        </div>
                    ) : error ? (
                        <div className="evento-home-nur-alert evento-home-nur-alert--error">
                            {error}
                        </div>
                    ) : (
                        <>
                            <section className="evento-home-nur-section">
                                <div className="evento-home-nur-section__header">
                                    <div>
                                        <span className="evento-home-nur-section__eyebrow">
                                            Participación actual
                                        </span>
                                        <h2 className="evento-home-nur-section__title">
                                            Mis inscripciones activas
                                        </h2>
                                    </div>

                                    <span className="evento-home-nur-section__count">
                                        {misInscripciones.length} registro
                                        {misInscripciones.length === 1 ? "" : "s"}
                                    </span>
                                </div>

                                {misInscripciones.length > 0 ? (
                                    <div className="evento-home-nur-grid">
                                        {misInscripciones.map(renderEventoCard)}
                                    </div>
                                ) : (
                                    <div className="evento-home-nur-empty evento-home-nur-empty--soft">
                                        <FaUserCheck />
                                        <h3>Aún no tienes inscripciones activas</h3>
                                        <p>
                                            Cuando te registres en un evento, aparecerá primero en
                                            esta sección para facilitar tu seguimiento.
                                        </p>
                                    </div>
                                )}
                            </section>

                            <section className="evento-home-nur-section evento-home-nur-section--secondary">
                                <div className="evento-home-nur-section__header">
                                    <div>
                                        <span className="evento-home-nur-section__eyebrow">
                                            Agenda disponible
                                        </span>
                                        <h2 className="evento-home-nur-section__title">
                                            Eventos activos
                                        </h2>
                                    </div>

                                    <span className="evento-home-nur-section__count">
                                        {disponibles.length} registro
                                        {disponibles.length === 1 ? "" : "s"}
                                    </span>
                                </div>

                                {disponibles.length > 0 ? (
                                    <div className="evento-home-nur-grid">
                                        {disponibles.map(renderEventoCard)}
                                    </div>
                                ) : (
                                    <div className="evento-home-nur-empty">
                                        <FaCalendarAlt />
                                        <h3>No hay eventos activos pendientes</h3>
                                        <p>
                                            En este momento no existen nuevas actividades visibles
                                            para tu perfil.
                                        </p>
                                    </div>
                                )}
                            </section>

                            <section className="evento-home-nur-section evento-home-nur-section--secondary">
                                <div className="evento-home-nur-section__header">
                                    <div>
                                        <span className="evento-home-nur-section__eyebrow">
                                            Historial institucional
                                        </span>
                                        <h2 className="evento-home-nur-section__title">
                                            Eventos finalizados
                                        </h2>
                                    </div>

                                    <span className="evento-home-nur-section__count">
                                        {eventosFinalizados.length} registro
                                        {eventosFinalizados.length === 1 ? "" : "s"}
                                    </span>
                                </div>

                                {eventosFinalizados.length > 0 ? (
                                    <div className="evento-home-nur-grid">
                                        {eventosFinalizados.map(renderEventoCard)}
                                    </div>
                                ) : (
                                    <div className="evento-home-nur-empty evento-home-nur-empty--soft">
                                        <FaCalendarCheck />
                                        <h3>No hay eventos finalizados</h3>
                                        <p>
                                            El historial de actividades aparecerá aquí cuando
                                            existan registros cerrados.
                                        </p>
                                    </div>
                                )}
                            </section>

                            {eventosCancelados.length > 0 && (
                                <section className="evento-home-nur-section evento-home-nur-section--secondary">
                                    <div className="evento-home-nur-section__header">
                                        <div>
                                            <span className="evento-home-nur-section__eyebrow">
                                                Actualizaciones
                                            </span>
                                            <h2 className="evento-home-nur-section__title">
                                                Eventos cancelados
                                            </h2>
                                        </div>

                                        <span className="evento-home-nur-section__count">
                                            {eventosCancelados.length} registro
                                            {eventosCancelados.length === 1 ? "" : "s"}
                                        </span>
                                    </div>

                                    <div className="evento-home-nur-grid">
                                        {eventosCancelados.map(renderEventoCard)}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};

export default EventoHomePage;