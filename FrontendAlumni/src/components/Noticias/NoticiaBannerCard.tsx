import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowRight,
    FaCalendarDays,
    FaCircleInfo,
    FaGlobe,
    FaLink,
    FaNewspaper,
    FaPeopleGroup,
    FaStar,
} from "react-icons/fa6";

import "./NoticiaBannerCard.css";
import { Routes } from "../../routes/CONSTANTS";
import type { Noticia } from "../../models/Noticia/Noticia";


type NoticiaBannerVariant = "featured" | "compact";

interface NoticiaBannerCardProps {
    noticia: Noticia;
    variant?: NoticiaBannerVariant;
    showContext?: boolean;
    className?: string;
    onNavigateEvento?: (noticia: Noticia) => void;
}

const NoticiaBannerCard = ({
    noticia,
    variant = "featured",
    showContext = true,
    className = "",
    onNavigateEvento,
}: NoticiaBannerCardProps) => {
    const navigate = useNavigate();

    const isFeatured = variant === "featured";

    const formatFecha = (value?: string | null): string => {
        if (!value) return "Fecha no disponible";

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "Fecha no disponible";

        return parsed.toLocaleDateString("es-BO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    const getResumen = (item: Noticia): string => {
        const resumen = item.resumen?.trim();
        if (resumen) return resumen;

        const contenido = item.contenido?.trim();
        if (!contenido) return "Publicación institucional disponible en el portal Alumni.";

        const limit = isFeatured ? 260 : 140;
        if (contenido.length <= limit) return contenido;
        return `${contenido.slice(0, limit).trim()}...`;
    };

    const getTipoLabel = (item: Noticia): string => {
        if (item.tipo_display?.trim()) return item.tipo_display.trim();
        if (item.tipo?.trim()) return item.tipo.trim();
        return "Noticia";
    };

    const getDestinoLabel = (item: Noticia): string => {
        if (item.destino_display?.trim()) return item.destino_display.trim();
        if (item.destino?.trim()) return item.destino.trim();
        return "";
    };

    const sanitizeUrl = (url?: string | null): string | null => {
        if (!url?.trim()) return null;
        const raw = url.trim();

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

    const externalUrl = useMemo(() => sanitizeUrl(noticia.boton_url), [noticia.boton_url]);

    const hasExternalButton =
        (noticia.tipo === "BOTON" || noticia.tipo === "BOTON_EVENTO") &&
        !!externalUrl;

    const hasEventButton =
        (noticia.tipo === "EVENTO" || noticia.tipo === "BOTON_EVENTO") &&
        !!noticia.evento;

    const buttonText = noticia.boton_texto?.trim() || "Ir al enlace";

    const handleOpenExternal = (): void => {
        if (!externalUrl) return;
        window.open(externalUrl, "_blank", "noopener,noreferrer");
    };

    const handleNavigateEvento = (): void => {
        if (!noticia.evento) return;

        if (onNavigateEvento) {
            onNavigateEvento(noticia);
            return;
        }

        navigate(Routes.EVENTOS);
    };

    const handleDefaultNavigate = (): void => {
        navigate(Routes.NOTICIAS_DETALLE_PARAM(noticia.id));
    };

    const rootClassName = [
        "noticia-banner-card",
        `noticia-banner-card--${variant}`,
        noticia.destacado ? "noticia-banner-card--destacada" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <article className={rootClassName}>
            <div className="noticia-banner-card__media">
                {noticia.imagen ? (
                    <img
                        src={noticia.imagen}
                        alt={noticia.titulo || "Noticia institucional"}
                        className="noticia-banner-card__image"
                    />
                ) : (
                    <div className="noticia-banner-card__placeholder">
                        <FaNewspaper />
                    </div>
                )}
            </div>

            <div className="noticia-banner-card__body">
                <div className="noticia-banner-card__chips">
                    <span className="noticia-banner-card__chip">
                        <FaCircleInfo />
                        <span>{getTipoLabel(noticia)}</span>
                    </span>

                    {!!getDestinoLabel(noticia) && (
                        <span className="noticia-banner-card__chip noticia-banner-card__chip--muted">
                            <FaGlobe />
                            <span>{getDestinoLabel(noticia)}</span>
                        </span>
                    )}

                    {noticia.destacado && (
                        <span className="noticia-banner-card__chip noticia-banner-card__chip--accent">
                            <FaStar />
                            <span>Destacada</span>
                        </span>
                    )}
                </div>

                <h3 className="noticia-banner-card__title">
                    {noticia.titulo || "Noticia institucional"}
                </h3>

                <p className="noticia-banner-card__summary">{getResumen(noticia)}</p>

                {showContext && (
                    <div className="noticia-banner-card__meta">
                        <span>
                            <FaCalendarDays />
                            {formatFecha(noticia.fecha_publicacion ?? noticia.fecha_actualizacion)}
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
                )}

                <div className="noticia-banner-card__actions">
                    <button
                        type="button"
                        className="noticia-banner-card__action noticia-banner-card__action--ghost"
                        onClick={handleDefaultNavigate}
                    >
                        <span>Ver más</span>
                        <FaArrowRight />
                    </button>

                    {hasExternalButton && (
                        <button
                            type="button"
                            className="noticia-banner-card__action noticia-banner-card__action--primary"
                            onClick={handleOpenExternal}
                        >
                            <FaLink />
                            <span>{buttonText}</span>
                        </button>
                    )}

                    {hasEventButton && (
                        <button
                            type="button"
                            className="noticia-banner-card__action noticia-banner-card__action--outline"
                            onClick={handleNavigateEvento}
                        >
                            <FaCalendarDays />
                            <span>{noticia.evento_titulo?.trim() || "Ver evento"}</span>
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

export default NoticiaBannerCard;