import { useMemo, useRef } from "react";
import { FaArrowLeft, FaArrowRight, FaNewspaper, FaPlus } from "react-icons/fa6";

import "./NoticiasBannerSection.css";
import type { Noticia } from "../../models/Noticia/Noticia";
import NoticiaBannerCard from "./NoticiaBannerCard";

interface NoticiasBannerSectionProps {
    noticias: Noticia[];
    title: string;
    subtitle?: string;
    eyebrow?: string;
    emptyTitle?: string;
    emptyText?: string;
    className?: string;
    showContextFeatured?: boolean;
    showContextCompact?: boolean;
    adminActionLabel?: string;
    onAdminAction?: () => void;
    onNavigateEvento?: (noticia: Noticia) => void;
    maxCompactItems?: number;
}

const NoticiasBannerSection = ({
    noticias,
    title,
    subtitle = "",
    eyebrow = "Noticias",
    emptyTitle = "Sin noticias disponibles",
    emptyText = "Todavía no existen noticias visibles para esta sección.",
    className = "",
    showContextFeatured = true,
    showContextCompact = false,
    adminActionLabel = "Crear noticia",
    onAdminAction,
    onNavigateEvento,
    maxCompactItems = 8,
}: NoticiasBannerSectionProps) => {
    const sliderRef = useRef<HTMLDivElement | null>(null);

    const noticiasOrdenadas = useMemo(() => {
        return [...(noticias ?? [])].sort((a, b) => {
            if ((a.destacado ?? false) !== (b.destacado ?? false)) {
                return a.destacado ? -1 : 1;
            }

            const ordenA = a.orden ?? Number.MAX_SAFE_INTEGER;
            const ordenB = b.orden ?? Number.MAX_SAFE_INTEGER;

            if (ordenA !== ordenB) {
                return ordenA - ordenB;
            }

            const fechaA = a.fecha_publicacion
                ? new Date(a.fecha_publicacion).getTime()
                : a.fecha_actualizacion
                    ? new Date(a.fecha_actualizacion).getTime()
                    : 0;

            const fechaB = b.fecha_publicacion
                ? new Date(b.fecha_publicacion).getTime()
                : b.fecha_actualizacion
                    ? new Date(b.fecha_actualizacion).getTime()
                    : 0;

            return fechaB - fechaA;
        });
    }, [noticias]);

    const featured = noticiasOrdenadas.length > 0 ? noticiasOrdenadas[0] : null;
    const compactItems = noticiasOrdenadas.slice(1, 1 + maxCompactItems);

    const scrollSlider = (direction: "left" | "right") => {
        if (!sliderRef.current) return;

        const amount = Math.max(sliderRef.current.clientWidth * 0.82, 280);

        sliderRef.current.scrollBy({
            left: direction === "left" ? -amount : amount,
            behavior: "smooth",
        });
    };

    const rootClassName = ["noticias-banner-section", className].filter(Boolean).join(" ");

    return (
        <section className={rootClassName}>
            <div className="noticias-banner-section__header">
                <div className="noticias-banner-section__heading">
                    <span className="noticias-banner-section__eyebrow">{eyebrow}</span>
                    <h2 className="noticias-banner-section__title">{title}</h2>
                    {subtitle ? (
                        <p className="noticias-banner-section__subtitle">{subtitle}</p>
                    ) : null}
                </div>

                {onAdminAction ? (
                    <div className="noticias-banner-section__headerActions">
                        <button
                            type="button"
                            className="noticias-banner-section__adminAction"
                            onClick={onAdminAction}
                        >
                            <FaPlus />
                            <span>{adminActionLabel}</span>
                        </button>
                    </div>
                ) : null}
            </div>

            {!featured ? (
                <div className="noticias-banner-section__empty">
                    <div className="noticias-banner-section__emptyIcon">
                        <FaNewspaper />
                    </div>
                    <h3>{emptyTitle}</h3>
                    <p>{emptyText}</p>
                </div>
            ) : (
                <>
                    <div className="noticias-banner-section__featured">
                        <NoticiaBannerCard
                            noticia={featured}
                            variant="featured"
                            showContext={showContextFeatured}
                            onNavigateEvento={onNavigateEvento}
                        />
                    </div>

                    {compactItems.length > 0 ? (
                        <div className="noticias-banner-section__sliderBlock">
                            <div className="noticias-banner-section__sliderTop">
                                <div>
                                    <h3 className="noticias-banner-section__sliderTitle">
                                        Más publicaciones
                                    </h3>
                                    <p className="noticias-banner-section__sliderText">
                                        Contenido complementario para mantener visible la actividad reciente.
                                    </p>
                                </div>

                                <div className="noticias-banner-section__controls">
                                    <button
                                        type="button"
                                        className="noticias-banner-section__control"
                                        onClick={() => scrollSlider("left")}
                                        aria-label="Desplazar noticias a la izquierda"
                                    >
                                        <FaArrowLeft />
                                    </button>
                                    <button
                                        type="button"
                                        className="noticias-banner-section__control"
                                        onClick={() => scrollSlider("right")}
                                        aria-label="Desplazar noticias a la derecha"
                                    >
                                        <FaArrowRight />
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={sliderRef}
                                className="noticias-banner-section__slider"
                            >
                                {compactItems.map((noticia) => (
                                    <div
                                        key={noticia.id ?? `${noticia.titulo}-${noticia.fecha_publicacion}`}
                                        className="noticias-banner-section__slide"
                                    >
                                        <NoticiaBannerCard
                                            noticia={noticia}
                                            variant="compact"
                                            showContext={showContextCompact}
                                            onNavigateEvento={onNavigateEvento}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </section>
    );
};

export default NoticiasBannerSection;