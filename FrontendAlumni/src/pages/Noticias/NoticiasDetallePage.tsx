import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "animate.css";
import {
    FaArrowLeft,
    FaArrowRight,
    FaCalendarDays,
    FaEye,
    FaGlobe,
    FaLink,
    FaNewspaper,
    FaPeopleGroup,
    FaStar,
} from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";

import "./NoticiasDetallePage.css";
import { Routes } from "../../routes/CONSTANTS";

import type { Noticia } from "../../models/Noticia/Noticia";
import { NoticiaService } from "../../services/alumni/NoticiaService";
import { AuthService } from "../../services/alumni/AuthService";

const placeholderImg = "/placeholder-comunidad.png";

const formatFecha = (value?: string | null): string => {
    if (!value) return "Sin fecha";
    try {
        return new Date(value).toLocaleString("es-BO", {
            year: "numeric",
            month: "long",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
};

const sanitizeUrl = (value?: string | null): string | null => {
    const raw = value?.trim();
    if (!raw) return null;

    if (
        raw.startsWith("http://") ||
        raw.startsWith("https://") ||
        raw.startsWith("mailto:") ||
        raw.startsWith("tel:")
    ) {
        return raw;
    }

    return `https://${raw}`;
};

const getErrorMessage = (err: unknown): string => {
    if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: unknown }).response === "object" &&
        (err as { response?: { data?: unknown } }).response?.data
    ) {
        const data = (err as { response?: { data?: unknown } }).response?.data;

        if (typeof data === "string") return data;

        try {
            return JSON.stringify(data, null, 2);
        } catch {
            return "Ocurrió un error inesperado al procesar la respuesta.";
        }
    }

    if (err instanceof Error) return err.message;

    return "Ocurrió un error inesperado.";
};

const NoticiasDetallePage = () => {
    const navigate = useNavigate();
    const params = useParams();

    const id = Number(params.id);

    const [noticia, setNoticia] = useState<Noticia | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const isAdmin = AuthService.isAdmin();

    useEffect(() => {
        let mounted = true;

        const cargarNoticia = async (): Promise<void> => {
            if (!id || Number.isNaN(id)) {
                setError("No se pudo identificar la noticia solicitada.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data = await NoticiaService.get(id);

                if (!mounted) return;
                setNoticia(data ?? null);
            } catch (err) {
                console.error("Error cargando detalle de noticia:", err);
                if (!mounted) return;
                setError(getErrorMessage(err));
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void cargarNoticia();

        return () => {
            mounted = false;
        };
    }, [id]);

    const externalUrl = useMemo(
        () => sanitizeUrl(noticia?.boton_url),
        [noticia?.boton_url]
    );

    const hasExternalButton =
        (noticia?.tipo === "BOTON" || noticia?.tipo === "BOTON_EVENTO") &&
        !!externalUrl;

    const hasEventButton =
        (noticia?.tipo === "EVENTO" || noticia?.tipo === "BOTON_EVENTO") &&
        !!noticia?.evento;

    const publicationDateLabel = useMemo(() => {
        return formatFecha(noticia?.fecha_publicacion || noticia?.fecha_actualizacion);
    }, [noticia?.fecha_publicacion, noticia?.fecha_actualizacion]);

    const contentParagraphs = useMemo(() => {
        const raw = (noticia?.contenido || "").trim();
        if (!raw) {
            return ["No se registró contenido adicional para esta publicación."];
        }

        return raw
            .split("\n")
            .map((paragraph) => paragraph.trim())
            .filter((paragraph) => paragraph.length > 0);
    }, [noticia?.contenido]);

    const estadoVigencia = useMemo(() => {
        if (!noticia) return "No evaluado";
        if (!noticia.publicado) return "No publicada";

        const now = Date.now();
        const inicio = noticia.fecha_inicio_publicacion
            ? new Date(noticia.fecha_inicio_publicacion).getTime()
            : null;
        const fin = noticia.fecha_fin_publicacion
            ? new Date(noticia.fecha_fin_publicacion).getTime()
            : null;

        const vigente =
            (inicio === null || inicio <= now) &&
            (fin === null || fin >= now);

        return vigente ? "Vigente" : "Fuera de ventana";
    }, [
        noticia,
        noticia?.publicado,
        noticia?.fecha_inicio_publicacion,
        noticia?.fecha_fin_publicacion,
    ]);

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        if (noticia?.destino === "COMUNIDAD" && noticia.comunidad) {
            navigate(Routes.COMUNIDAD.HUB_PARAM(noticia.comunidad));
            return;
        }

        navigate("/");
    };

    const handleGoHub = () => {
        if (!noticia?.comunidad) return;
        navigate(Routes.COMUNIDAD.HUB_PARAM(noticia.comunidad));
    };

    const handleGoEvento = () => {
        if (!noticia?.evento) return;
        navigate(Routes.EVENTOS);
    };

    const handleOpenExternal = () => {
        if (!externalUrl) return;
        window.open(externalUrl, "_blank", "noopener,noreferrer");
    };

    if (loading) {
        return (
            <div className="noticia-detalle-page animate__animated animate__fadeIn">
                <div className="container py-5">
                    <div className="noticia-detalle-feedback">
                        <div className="spinner-border text-warning" role="status" />
                        <p className="mt-3 mb-0">Cargando noticia...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !noticia) {
        return (
            <div className="noticia-detalle-page animate__animated animate__fadeIn">
                <div className="container py-5">
                    <div className="noticia-detalle-alert noticia-detalle-alert--error">
                        <strong>No se pudo mostrar la noticia.</strong>
                        <p>{error || "La noticia solicitada no está disponible."}</p>

                        <div className="noticia-detalle-actions mt-3">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={handleBack}
                            >
                                <FaArrowLeft />
                                <span>Volver</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="noticia-detalle-page animate__animated animate__fadeIn">
            <section className="noticia-detalle-hero">
                <div className="container">
                    <div className="noticia-detalle-topbar">
                        <button
                            type="button"
                            className="nur-btn nur-btn--ghost"
                            onClick={handleBack}
                        >
                            <FaArrowLeft />
                            <span>Volver</span>
                        </button>

                        {isAdmin && noticia.id && (
                            <button
                                type="button"
                                className="nur-btn nur-btn--outline"
                                onClick={() =>
                                    navigate(Routes.ADMIN.NOTICIAS.EDIT_PARAM(noticia.id!))
                                }
                            >
                                <FaEdit />
                                <span>Editar noticia</span>
                            </button>
                        )}
                    </div>

                    <div className="noticia-detalle-heroCard">
                        <div className="noticia-detalle-heroCard__media">
                            <img
                                src={noticia.imagen || placeholderImg}
                                alt={noticia.titulo || "Noticia"}
                                className="noticia-detalle-heroCard__image"
                            />

                            <div className="noticia-detalle-heroCard__badges">
                                <span className="noticia-detalle-chip">
                                    <FaNewspaper />
                                    <span>{noticia.tipo_display || "Noticia"}</span>
                                </span>

                                {noticia.destacado && (
                                    <span className="noticia-detalle-chip noticia-detalle-chip--accent">
                                        <FaStar />
                                        <span>Destacada</span>
                                    </span>
                                )}

                                {isAdmin && (
                                    <span className="noticia-detalle-chip noticia-detalle-chip--muted">
                                        <FaGlobe />
                                        <span>
                                            {noticia.destino_display ||
                                                noticia.destino ||
                                                "Sin destino"}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="noticia-detalle-heroCard__body">
                            <h1 className="noticia-detalle-title">
                                {noticia.titulo || "Noticia institucional"}
                            </h1>

                            {noticia.resumen?.trim() && (
                                <p className="noticia-detalle-summary">{noticia.resumen}</p>
                            )}

                            <div className="noticia-detalle-meta">
                                <span>
                                    <FaCalendarDays />
                                    Publicación: {publicationDateLabel}
                                </span>

                                {noticia.comunidad_nombre && (
                                    <span>
                                        <FaPeopleGroup />
                                        {noticia.comunidad_nombre}
                                    </span>
                                )}

                                {noticia.evento_titulo && (
                                    <span>
                                        <FaCalendarDays />
                                        {noticia.evento_titulo}
                                    </span>
                                )}
                            </div>

                            <div className="noticia-detalle-actions">
                                {hasExternalButton && (
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--primary"
                                        onClick={handleOpenExternal}
                                    >
                                        <FaLink />
                                        <span>
                                            {noticia.boton_texto?.trim() || "Ir al enlace"}
                                        </span>
                                    </button>
                                )}

                                {hasEventButton && (
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--outline"
                                        onClick={handleGoEvento}
                                    >
                                        <FaCalendarDays />
                                        <span>
                                            {noticia.evento_titulo?.trim() || "Ver evento"}
                                        </span>
                                    </button>
                                )}

                                {noticia.comunidad && (
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={handleGoHub}
                                    >
                                        <FaPeopleGroup />
                                        <span>Ir a la comunidad</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="noticia-detalle-content">
                <div className="container">
                    <div className="noticia-detalle-layout">
                        <article className="noticia-detalle-main">
                            <div className="noticia-detalle-section">
                                <div className="noticia-detalle-section__header">
                                    <h2>
                                        <FaEye />
                                        Descripcion/Contenido
                                    </h2>
                                    <p>
                                        Contenido íntegro de la publicación 
                                    </p>
                                </div>

                                <div className="noticia-detalle-body">
                                    {contentParagraphs.map((paragraph, index) => (
                                        <p key={`${index}-${paragraph.slice(0, 20)}`}>
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </article>

                        <aside className="noticia-detalle-side">
                            {(noticia.comunidad_nombre ||
                                noticia.evento_titulo ||
                                noticia.boton_texto?.trim()) && (
                                <div className="noticia-detalle-sideCard">
                                    <div className="noticia-detalle-sideCard__header">
                                        <h3>Contexto relacionado</h3>
                                        <p>Información útil para continuar la navegación.</p>
                                    </div>

                                    <div className="noticia-detalle-summaryGrid">
                                        {noticia.comunidad_nombre && (
                                            <div className="noticia-detalle-summaryItem">
                                                <span>Comunidad</span>
                                                <strong>{noticia.comunidad_nombre}</strong>
                                            </div>
                                        )}

                                        {noticia.evento_titulo && (
                                            <div className="noticia-detalle-summaryItem">
                                                <span>Evento</span>
                                                <strong>{noticia.evento_titulo}</strong>
                                            </div>
                                        )}

                                        {hasExternalButton && (
                                            <div className="noticia-detalle-summaryItem">
                                                <span>Acción</span>
                                                <strong>
                                                    {noticia.boton_texto?.trim() || "Abrir enlace"}
                                                </strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="noticia-detalle-sideCard">
                                <div className="noticia-detalle-sideCard__header">
                                    <h3>Acciones</h3>
                                    <p>Accesos disponibles según el contexto de la noticia.</p>
                                </div>

                                <div className="noticia-detalle-sideActions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={handleBack}
                                    >
                                        <FaArrowLeft />
                                        <span>Volver</span>
                                    </button>

                                    {noticia.comunidad && (
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--outline"
                                            onClick={handleGoHub}
                                        >
                                            <FaPeopleGroup />
                                            <span>Ver comunidad</span>
                                        </button>
                                    )}

                                    {hasEventButton && (
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--outline"
                                            onClick={handleGoEvento}
                                        >
                                            <FaCalendarDays />
                                            <span>Ir al evento</span>
                                        </button>
                                    )}

                                    {hasExternalButton && (
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--primary"
                                            onClick={handleOpenExternal}
                                        >
                                            <FaArrowRight />
                                            <span>
                                                {noticia.boton_texto?.trim() || "Abrir enlace"}
                                            </span>
                                        </button>
                                    )}

                                    {isAdmin && noticia.id && (
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--outline"
                                            onClick={() =>
                                                navigate(Routes.ADMIN.NOTICIAS.EDIT_PARAM(noticia.id!))
                                            }
                                        >
                                            <FaEdit />
                                            <span>Editar</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </aside>
                    </div>
                     {isAdmin && (
                                <div className="noticia-detalle-sideCard ">
                                    <div className="noticia-detalle-sideCard__header">
                                        <h3>Panel administrativo</h3>
                                        <p>Estado, metadatos y trazabilidad de la publicación.</p>
                                    </div>

                                    <div className="noticia-detalle-summaryGrid">
                                        <div className="noticia-detalle-summaryItem">
                                            <span>ID</span>
                                            <strong>{noticia.id ?? "—"}</strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Tipo</span>
                                            <strong>
                                                {noticia.tipo_display || noticia.tipo || "No definido"}
                                            </strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Destino</span>
                                            <strong>
                                                {noticia.destino_display ||
                                                    noticia.destino ||
                                                    "No definido"}
                                            </strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Publicado</span>
                                            <strong>{noticia.publicado ? "Sí" : "No"}</strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Estado visual</span>
                                            <strong>{estadoVigencia}</strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Destacada</span>
                                            <strong>{noticia.destacado ? "Sí" : "No"}</strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Orden</span>
                                            <strong>{noticia.orden ?? 0}</strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Publicación</span>
                                            <strong>{formatFecha(noticia.fecha_publicacion)}</strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Actualización</span>
                                            <strong>
                                                {formatFecha(noticia.fecha_actualizacion)}
                                            </strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Inicio visible</span>
                                            <strong>
                                                {formatFecha(noticia.fecha_inicio_publicacion)}
                                            </strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Fin visible</span>
                                            <strong>
                                                {formatFecha(noticia.fecha_fin_publicacion)}
                                            </strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Creado por</span>
                                            <strong>{noticia.creado_por_id ?? "No registrado"}</strong>
                                        </div>

                                        <div className="noticia-detalle-summaryItem">
                                            <span>Actualizado por</span>
                                            <strong>
                                                {noticia.actualizado_por_id ?? "No registrado"}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                </div>
                
            </section>
        </div>
    );
};

export default NoticiasDetallePage;