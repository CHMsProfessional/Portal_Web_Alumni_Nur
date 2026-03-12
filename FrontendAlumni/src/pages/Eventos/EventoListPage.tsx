import { useEffect, useMemo, useState } from "react";
import "animate.css";
import { useNavigate } from "react-router-dom";
import {
    FaCalendarAlt,
    FaCheckCircle,
    FaClock,
    FaEdit,
    FaExclamationTriangle,
    FaEye,
    FaFilter,
    FaPlus,
    FaSearch,
    FaTimesCircle,
    FaTrash,
    FaUsers,
    FaUniversity,
    FaRedo,
    FaLayerGroup,
    FaGlobeAmericas,
} from "react-icons/fa";

import "./EventoListPage.css";

import type { Evento } from "../../models/Evento/Evento";
import { EventoService } from "../../services/alumni/EventoService";
import { Routes } from "../../routes/CONSTANTS";

type EstadoFiltro = "TODOS" | "ACTIVO" | "FINALIZADO" | "CANCELADO";

const placeholderImg = "/placeholder-comunidad.png";

const formatearFecha = (fecha?: string | null): string => {
    if (!fecha) return "Sin fecha";

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return fecha;

    return parsed.toLocaleDateString("es-BO", {
        year: "numeric",
        month: "short",
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

const construirRango = (evento: Evento): string => {
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

            return `${formatearFecha(evento.fecha_inicio)} → ${formatearFecha(
                evento.fecha_fin
            )}`;
        }
    }

    return formatearFecha(evento.fecha_inicio ?? evento.fecha_fin);
};

const getEstadoLabel = (evento: Evento): string => {
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

const getEstadoClass = (estado?: Evento["estado"]): string => {
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

const getCarrerasLabel = (evento: Evento): string => {
    if (evento.carreras_detalle?.length) {
        if (evento.carreras_detalle.length === 1) {
            return evento.carreras_detalle[0].nombre ?? "1 carrera";
        }

        return `${evento.carreras_detalle.length} carreras segmentadas`;
    }

    if (!evento.carreras?.length) {
        return "Evento global";
    }

    if (evento.carreras.length === 1) {
        return "1 carrera segmentada";
    }

    return `${evento.carreras.length} carreras segmentadas`;
};

const EventoListPage = () => {
    const navigate = useNavigate();

    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const [search, setSearch] = useState<string>("");
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("TODOS");
    const [soloConRegistro, setSoloConRegistro] = useState<boolean>(false);

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const cargarEventos = async (silent = false): Promise<void> => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        try {
            const data = await EventoService.list();
            const ordenados = [...data].sort((a, b) => {
                const aTime = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
                const bTime = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
                return bTime - aTime;
            });

            setEventos(ordenados);
        } catch (err) {
            console.error("Error al cargar eventos.", err);
            setError("No se pudieron cargar los eventos administrativos.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void cargarEventos();
    }, []);

    const eventosFiltrados = useMemo(() => {
        const q = search.trim().toLowerCase();

        return eventos.filter((evento) => {
            const cumpleEstado =
                estadoFiltro === "TODOS" ? true : evento.estado === estadoFiltro;

            const cumpleRegistro = soloConRegistro
                ? Boolean(evento.requiere_registro)
                : true;

            const texto =
                [
                    evento.titulo ?? "",
                    evento.descripcion ?? "",
                    evento.estado_display ?? "",
                    evento.estado ?? "",
                    getCarrerasLabel(evento),
                    ...(evento.carreras_detalle?.map((c) => c.nombre ?? "") ?? []),
                ]
                    .join(" ")
                    .toLowerCase();

            const cumpleBusqueda = q ? texto.includes(q) : true;

            return cumpleEstado && cumpleRegistro && cumpleBusqueda;
        });
    }, [eventos, search, estadoFiltro, soloConRegistro]);

    const resumen = useMemo(() => {
        const activos = eventos.filter((e) => e.estado === "ACTIVO").length;
        const finalizados = eventos.filter((e) => e.estado === "FINALIZADO").length;
        const cancelados = eventos.filter((e) => e.estado === "CANCELADO").length;
        const conRegistro = eventos.filter((e) => e.requiere_registro).length;
        const globales = eventos.filter((e) => !e.carreras?.length).length;

        return {
            total: eventos.length,
            activos,
            finalizados,
            cancelados,
            conRegistro,
            globales,
        };
    }, [eventos]);

    const handleDelete = async (evento: Evento): Promise<void> => {
        if (!evento.id) return;

        try {
            setDeletingId(evento.id);
            setFeedback(null);

            await EventoService.delete(evento.id);

            setEventos((prev) => prev.filter((item) => item.id !== evento.id));
            setFeedback({
                type: "success",
                message: `El evento "${evento.titulo}" fue eliminado correctamente.`,
            });
        } catch (err) {
            console.error("Error al eliminar evento.", err);
            setFeedback({
                type: "error",
                message: "No se pudo eliminar el evento en este momento.",
            });
        } finally {
            setDeletingId(null);
        }
    };

    const renderCard = (evento: Evento) => {
        const inscritos = getInscritosCount(evento);
        const deleting = deletingId === evento.id;
        const carrerasDetalle = evento.carreras_detalle ?? [];

        return (
            <article
                key={evento.id}
                className="evento-admin-list__card animate__animated animate__fadeInUp"
            >
                <div className="evento-admin-list__cardMedia">
                    <img
                        src={evento.imagen_portada || placeholderImg}
                        alt={evento.titulo || "Evento"}
                        className="evento-admin-list__cardImage"
                    />
                    <div className="evento-admin-list__cardOverlay" />

                    <div className="evento-admin-list__badgeRow">
                        <span
                            className={`evento-admin-list__badge evento-admin-list__badge--state ${getEstadoClass(
                                evento.estado
                            )}`}
                        >
                            {getEstadoLabel(evento)}
                        </span>

                        <span
                            className={`evento-admin-list__badge ${
                                evento.requiere_registro
                                    ? "evento-admin-list__badge--accent"
                                    : "evento-admin-list__badge--muted"
                            }`}
                        >
                            {evento.requiere_registro ? "Con inscripción" : "Acceso libre"}
                        </span>
                    </div>
                </div>

                <div className="evento-admin-list__cardBody">
                    <div className="evento-admin-list__cardHeader">
                        <h3 className="evento-admin-list__cardTitle">
                            {evento.titulo || "Evento sin título"}
                        </h3>
                        <p className="evento-admin-list__cardText">
                            {evento.descripcion?.trim() ||
                                "Este evento no cuenta con una descripción registrada."}
                        </p>
                    </div>

                    <div className="evento-admin-list__metaGrid">
                        <div className="evento-admin-list__metaItem">
                            <span className="evento-admin-list__metaIcon">
                                <FaCalendarAlt />
                            </span>
                            <div>
                                <span className="evento-admin-list__metaLabel">Cronograma</span>
                                <strong className="evento-admin-list__metaValue">
                                    {construirRango(evento)}
                                </strong>
                            </div>
                        </div>

                        <div className="evento-admin-list__metaItem">
                            <span className="evento-admin-list__metaIcon">
                                <FaUsers />
                            </span>
                            <div>
                                <span className="evento-admin-list__metaLabel">Inscritos</span>
                                <strong className="evento-admin-list__metaValue">
                                    {inscritos}
                                </strong>
                            </div>
                        </div>

                        <div className="evento-admin-list__metaItem">
                            <span className="evento-admin-list__metaIcon">
                                <FaGlobeAmericas />
                            </span>
                            <div>
                                <span className="evento-admin-list__metaLabel">Alcance</span>
                                <strong className="evento-admin-list__metaValue">
                                    {getCarrerasLabel(evento)}
                                </strong>
                            </div>
                        </div>

                        <div className="evento-admin-list__metaItem">
                            <span className="evento-admin-list__metaIcon">
                                <FaClock />
                            </span>
                            <div>
                                <span className="evento-admin-list__metaLabel">Inicio</span>
                                <strong className="evento-admin-list__metaValue">
                                    {evento.fecha_inicio
                                        ? formatearHora(evento.fecha_inicio)
                                        : "Por definir"}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {!!carrerasDetalle.length && (
                        <div className="evento-admin-list__chipSection">
                            <span className="evento-admin-list__chipTitle">
                                Carreras destino
                            </span>
                            <div className="evento-admin-list__chips">
                                {carrerasDetalle.map((carrera) => (
                                    <span
                                        key={carrera.id}
                                        className="evento-admin-list__chip evento-admin-list__chip--accent"
                                    >
                                        {carrera.nombre}
                                        {carrera.codigo ? ` (${carrera.codigo})` : ""}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {!carrerasDetalle.length && (
                        <div className="evento-admin-list__chipSection">
                            <span className="evento-admin-list__chipTitle">
                                Segmentación
                            </span>
                            <div className="evento-admin-list__chips">
                                <span className="evento-admin-list__chip">
                                    Visible para toda la comunidad Alumni
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="evento-admin-list__actions">
                        <button
                            type="button"
                            className="nur-btn nur-btn--ghost"
                            onClick={() => navigate(Routes.EVENTOS)}
                        >
                            <FaEye />
                            <span>Vista pública</span>
                        </button>

                        <button
                            type="button"
                            className="nur-btn nur-btn--secondary"
                            onClick={() =>
                                navigate(Routes.ADMIN.EVENTOS.EDIT_PARAM(Number(evento.id)))
                            }
                        >
                            <FaEdit />
                            <span>Editar</span>
                        </button>

                        <button
                            type="button"
                            className="nur-btn nur-btn--ghost-danger"
                            onClick={() => void handleDelete(evento)}
                            disabled={deleting}
                        >
                            <FaTrash />
                            <span>{deleting ? "Eliminando..." : "Eliminar"}</span>
                        </button>
                    </div>
                </div>
            </article>
        );
    };

    return (
        <div className="evento-admin-list-page">
            <section className="evento-admin-list-page__hero animate__animated animate__fadeIn">
                <div className="evento-admin-list-page__heroOverlay" />
                <div className="container evento-admin-list-page__heroContainer">
                    <div className="evento-admin-list-page__heroTop">
                        <div className="evento-admin-list-page__heroCopy">
                            <div className="evento-admin-list-page__badgeRow">
                                <span className="evento-admin-list-page__badge">
                                    <FaUniversity />
                                    Gestión administrativa
                                </span>
                                <span className="evento-admin-list-page__badge evento-admin-list-page__badge--muted">
                                    <FaLayerGroup />
                                    Dominio Eventos
                                </span>
                            </div>

                            <h1 className="evento-admin-list-page__title">
                                Panel de administración de eventos
                            </h1>

                            <p className="evento-admin-list-page__description">
                                Supervisa estado, alcance, cronograma, segmentación por carreras e
                                inscripciones desde una vista más sobria, legible y útil para
                                operación administrativa.
                            </p>

                            <div className="evento-admin-list-page__actions">
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={() => navigate(Routes.ADMIN.EVENTOS.CREATE)}
                                >
                                    <FaPlus />
                                    <span>Nuevo evento</span>
                                </button>

                                <button
                                    type="button"
                                    className="nur-btn nur-btn--ghost"
                                    onClick={() => void cargarEventos(true)}
                                    disabled={loading || refreshing}
                                >
                                    <FaRedo />
                                    <span>
                                        {refreshing ? "Actualizando..." : "Recargar listado"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="evento-admin-list-page__statsGrid">
                        <div className="evento-admin-list-page__statCard">
                            <span className="evento-admin-list-page__statIcon">
                                <FaCalendarAlt />
                            </span>
                            <div>
                                <strong>{resumen.total}</strong>
                                <p>Total registrados</p>
                            </div>
                        </div>

                        <div className="evento-admin-list-page__statCard">
                            <span className="evento-admin-list-page__statIcon">
                                <FaCheckCircle />
                            </span>
                            <div>
                                <strong>{resumen.activos}</strong>
                                <p>Eventos activos</p>
                            </div>
                        </div>

                        <div className="evento-admin-list-page__statCard">
                            <span className="evento-admin-list-page__statIcon">
                                <FaClock />
                            </span>
                            <div>
                                <strong>{resumen.finalizados}</strong>
                                <p>Eventos finalizados</p>
                            </div>
                        </div>

                        <div className="evento-admin-list-page__statCard">
                            <span className="evento-admin-list-page__statIcon">
                                <FaTimesCircle />
                            </span>
                            <div>
                                <strong>{resumen.cancelados}</strong>
                                <p>Eventos cancelados</p>
                            </div>
                        </div>

                        <div className="evento-admin-list-page__statCard">
                            <span className="evento-admin-list-page__statIcon">
                                <FaUsers />
                            </span>
                            <div>
                                <strong>{resumen.conRegistro}</strong>
                                <p>Con inscripción previa</p>
                            </div>
                        </div>

                        <div className="evento-admin-list-page__statCard">
                            <span className="evento-admin-list-page__statIcon">
                                <FaGlobeAmericas />
                            </span>
                            <div>
                                <strong>{resumen.globales}</strong>
                                <p>Eventos globales</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="evento-admin-list-page__section">
                <div className="container">
                    {feedback && (
                        <div
                            className={`evento-admin-list-page__inlineAlert evento-admin-list-page__inlineAlert--${feedback.type}`}
                        >
                            {feedback.message}
                        </div>
                    )}

                    <div className="evento-admin-list-page__filterBar animate__animated animate__fadeInUp">
                        <div className="evento-admin-list-page__filterGroup evento-admin-list-page__filterGroup--search">
                            <label htmlFor="evento-search">
                                <FaSearch />
                                <span>Búsqueda</span>
                            </label>
                            <input
                                id="evento-search"
                                type="text"
                                className="form-control"
                                placeholder="Buscar por título, descripción, carrera o estado..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="evento-admin-list-page__filterGroup">
                            <label htmlFor="evento-estado">
                                <FaFilter />
                                <span>Estado</span>
                            </label>
                            <select
                                id="evento-estado"
                                className="form-select"
                                value={estadoFiltro}
                                onChange={(e) =>
                                    setEstadoFiltro(e.target.value as EstadoFiltro)
                                }
                            >
                                <option value="TODOS">Todos</option>
                                <option value="ACTIVO">Activo</option>
                                <option value="FINALIZADO">Finalizado</option>
                                <option value="CANCELADO">Cancelado</option>
                            </select>
                        </div>

                        <div className="evento-admin-list-page__filterGroup evento-admin-list-page__filterGroup--switch">
                            <label className="form-check form-switch mb-0">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={soloConRegistro}
                                    onChange={(e) => setSoloConRegistro(e.target.checked)}
                                />
                                <span className="evento-admin-list-page__switchLabel">
                                    Solo con inscripción previa
                                </span>
                            </label>
                        </div>
                    </div>

                    {loading ? (
                        <div className="evento-admin-list-page__loader animate__animated animate__fadeIn">
                            <div className="evento-admin-list-page__spinner" />
                            <h3>Cargando eventos</h3>
                            <p>Estamos preparando la vista administrativa del dominio Eventos.</p>
                        </div>
                    ) : error ? (
                        <div className="evento-admin-list-page__alert evento-admin-list-page__alert--error animate__animated animate__fadeIn">
                            <FaExclamationTriangle />
                            <strong>No se pudo cargar el listado</strong>
                            <p>{error}</p>
                        </div>
                    ) : eventosFiltrados.length === 0 ? (
                        <div className="evento-admin-list-page__empty animate__animated animate__fadeIn">
                            <FaCalendarAlt />
                            <h3>No hay resultados para los filtros aplicados</h3>
                            <p>
                                Ajusta la búsqueda o los filtros para encontrar eventos dentro del
                                panel administrativo.
                            </p>
                        </div>
                    ) : (
                        <div className="evento-admin-list-page__grid">
                            {eventosFiltrados.map(renderCard)}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default EventoListPage;