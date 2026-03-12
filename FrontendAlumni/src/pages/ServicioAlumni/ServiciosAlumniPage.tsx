import { JSX, useEffect, useMemo, useState } from "react";
import "animate.css";
import {
    FaBook,
    FaDumbbell,
    FaExternalLinkAlt,
    FaGraduationCap,
    FaInfoCircle,
    FaLink,
    FaRedo,
    FaToolbox,
} from "react-icons/fa";

import "./ServiciosAlumniPage.css";

import { ServicioAlumni } from "../../models/ServicioAlumni/ServicioAlumni";
import { ServicioAlumniService } from "../../services/alumni/ServicioAlumniService";

const iconosPorTipo: Record<string, JSX.Element> = {
    educacion: <FaGraduationCap />,
    biblioteca: <FaBook />,
    deporte: <FaDumbbell />,
    otros: <FaToolbox />,
};

const titulosPorTipo: Record<string, string> = {
    educacion: "Servicios educativos",
    biblioteca: "Biblioteca y recursos",
    deporte: "Servicios deportivos",
    otros: "Otros beneficios",
};

const descripcionesPorTipo: Record<string, string> = {
    educacion:
        "Programas, oportunidades de formación continua y beneficios académicos orientados a egresados y graduados de la Universidad NUR.",
    biblioteca:
        "Recursos bibliográficos, servicios de consulta y materiales institucionales de apoyo para fortalecer el vínculo con la comunidad Alumni.",
    deporte:
        "Actividades, beneficios y servicios vinculados al bienestar integral, la recreación y la vida saludable.",
    otros:
        "Servicios complementarios y beneficios adicionales que fortalecen la experiencia Alumni dentro del portal institucional.",
};

const TIPOS_ORDENADOS: Array<ServicioAlumni["tipo"]> = [
    "educacion",
    "biblioteca",
    "deporte",
    "otros",
];

const obtenerTipoLabel = (tipo?: ServicioAlumni["tipo"]): string => {
    switch (tipo) {
        case "educacion":
            return "Educación";
        case "biblioteca":
            return "Biblioteca";
        case "deporte":
            return "Deporte";
        case "otros":
            return "Otros";
        default:
            return "Sin categoría";
    }
};

const normalizarTexto = (valor?: string | null): string => {
    return valor?.trim() || "Sin información disponible por el momento.";
};

const ServiciosAlumniPage = () => {
    const [servicios, setServicios] = useState<ServicioAlumni[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const cargarServicios = async (): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const data = await ServicioAlumniService.list();
            setServicios(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("No se pudieron cargar los servicios Alumni.", err);
            setError(
                "No se pudieron cargar los servicios Alumni en este momento. Intenta nuevamente."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarServicios();
    }, []);

    const serviciosOrdenados = useMemo(() => {
        return [...servicios].sort((a, b) => {
            const ordenTipos = {
                educacion: 1,
                biblioteca: 2,
                deporte: 3,
                otros: 4,
            };

            const tipoA = ordenTipos[a.tipo ?? "otros"] ?? 99;
            const tipoB = ordenTipos[b.tipo ?? "otros"] ?? 99;

            if (tipoA !== tipoB) return tipoA - tipoB;

            const nombreA = a.nombre?.toLowerCase() ?? "";
            const nombreB = b.nombre?.toLowerCase() ?? "";

            return nombreA.localeCompare(nombreB, "es");
        });
    }, [servicios]);

    const serviciosPorTipo = useMemo(() => {
        return TIPOS_ORDENADOS.reduce(
            (acc, tipo) => {
                acc[tipo ?? "otros"] = serviciosOrdenados.filter(
                    (servicio) => (servicio.tipo ?? "otros") === tipo
                );
                return acc;
            },
            {} as Record<string, ServicioAlumni[]>
        );
    }, [serviciosOrdenados]);

    const resumen = useMemo(() => {
        return {
            total: servicios.length,
            educacion: servicios.filter((s) => s.tipo === "educacion").length,
            biblioteca: servicios.filter((s) => s.tipo === "biblioteca").length,
            deporte: servicios.filter((s) => s.tipo === "deporte").length,
            otros: servicios.filter((s) => s.tipo === "otros").length,
            conLink: servicios.filter((s) => Boolean(s.link)).length,
        };
    }, [servicios]);

    return (
        <div className="servicios-home-nur-page">
            <section className="servicios-home-nur-hero">
                <div className="container">
                    <div className="servicios-home-nur-hero__content animate__animated animate__fadeIn">
                        <div className="servicios-home-nur-hero__copy">
                            <span className="servicios-home-nur-hero__eyebrow">
                                <FaGraduationCap />
                                Beneficios para la comunidad Alumni
                            </span>

                            <h1 className="servicios-home-nur-hero__title">
                                Servicios y beneficios institucionales NUR
                            </h1>

                            <p className="servicios-home-nur-hero__text">
                                Consulta los servicios disponibles para egresados y graduados de
                                la Universidad NUR. La vista está orientada a una experiencia
                                clara y útil: agrupación por categoría, acceso a enlaces
                                institucionales y contenido fácil de recorrer.
                            </p>
                        </div>

                        <div className="servicios-home-nur-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost servicios-home-nur-hero__reload"
                                onClick={() => void cargarServicios()}
                                disabled={loading}
                            >
                                <FaRedo className={loading ? "spin-soft" : ""} />
                                <span>{loading ? "Actualizando..." : "Recargar servicios"}</span>
                            </button>
                        </div>
                    </div>

                    <div className="servicios-home-nur-stats animate__animated animate__fadeInUp">
                        <div className="servicios-home-nur-stat-card">
                            <span className="servicios-home-nur-stat-card__label">Total</span>
                            <strong className="servicios-home-nur-stat-card__value">
                                {resumen.total}
                            </strong>
                        </div>

                        <div className="servicios-home-nur-stat-card">
                            <span className="servicios-home-nur-stat-card__label">Educación</span>
                            <strong className="servicios-home-nur-stat-card__value">
                                {resumen.educacion}
                            </strong>
                        </div>

                        <div className="servicios-home-nur-stat-card">
                            <span className="servicios-home-nur-stat-card__label">Biblioteca</span>
                            <strong className="servicios-home-nur-stat-card__value">
                                {resumen.biblioteca}
                            </strong>
                        </div>

                        <div className="servicios-home-nur-stat-card">
                            <span className="servicios-home-nur-stat-card__label">Deporte</span>
                            <strong className="servicios-home-nur-stat-card__value">
                                {resumen.deporte}
                            </strong>
                        </div>

                        <div className="servicios-home-nur-stat-card">
                            <span className="servicios-home-nur-stat-card__label">Con enlace</span>
                            <strong className="servicios-home-nur-stat-card__value">
                                {resumen.conLink}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="servicios-home-nur-content">
                <div className="container">
                    {error ? (
                        <div className="servicios-home-nur-empty animate__animated animate__fadeIn">
                            <FaInfoCircle />
                            <h3>No se pudo cargar la información</h3>
                            <p>{error}</p>
                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={() => void cargarServicios()}
                            >
                                <FaRedo />
                                <span>Reintentar</span>
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="servicios-home-nur-grid">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <article
                                    key={`servicio-skeleton-${index}`}
                                    className="servicio-nur-card servicio-nur-card--skeleton"
                                >
                                    <div className="servicio-nur-card__header">
                                        <span className="servicio-nur-skeleton servicio-nur-skeleton--icon" />
                                        <span className="servicio-nur-skeleton servicio-nur-skeleton--badge" />
                                    </div>
                                    <div className="servicio-nur-card__body">
                                        <span className="servicio-nur-skeleton servicio-nur-skeleton--title" />
                                        <span className="servicio-nur-skeleton servicio-nur-skeleton--text" />
                                        <span className="servicio-nur-skeleton servicio-nur-skeleton--text short" />
                                    </div>
                                    <div className="servicio-nur-card__footer">
                                        <span className="servicio-nur-skeleton servicio-nur-skeleton--button" />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : servicios.length === 0 ? (
                        <div className="servicios-home-nur-empty animate__animated animate__fadeIn">
                            <FaToolbox />
                            <h3>No hay servicios publicados</h3>
                            <p>
                                Todavía no existen servicios Alumni registrados en el sistema.
                                Cuando el administrador publique nuevos beneficios, aparecerán en
                                esta sección.
                            </p>
                        </div>
                    ) : (
                        TIPOS_ORDENADOS.map((tipo) => {
                            const key = tipo ?? "otros";
                            const items = serviciosPorTipo[key] ?? [];
                            const icono = iconosPorTipo[key] ?? <FaToolbox />;

                            return (
                                <section
                                    key={key}
                                    className="servicios-home-nur-section animate__animated animate__fadeInUp"
                                >
                                    <header className="servicios-home-nur-section__header">
                                        <div className="servicios-home-nur-section__title-wrap">
                                            <span className="servicios-home-nur-section__icon">
                                                {icono}
                                            </span>
                                            <div>
                                                <h2 className="servicios-home-nur-section__title">
                                                    {titulosPorTipo[key]}
                                                </h2>
                                                <p className="servicios-home-nur-section__description">
                                                    {descripcionesPorTipo[key]}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="servicios-home-nur-section__count">
                                            {items.length}{" "}
                                            {items.length === 1 ? "servicio" : "servicios"}
                                        </span>
                                    </header>

                                    {items.length > 0 ? (
                                        <div className="servicios-home-nur-grid">
                                            {items.map((servicio) => (
                                                <article
                                                    key={servicio.id ?? `${key}-${servicio.nombre}`}
                                                    className="servicio-nur-card"
                                                >
                                                    <div className="servicio-nur-card__header">
                                                        <div className="servicio-nur-card__icon">
                                                            {icono}
                                                        </div>

                                                        <span className="servicio-nur-card__badge">
                                                            {obtenerTipoLabel(servicio.tipo)}
                                                        </span>
                                                    </div>

                                                    <div className="servicio-nur-card__body">
                                                        <h3 className="servicio-nur-card__title">
                                                            {servicio.nombre || "Servicio sin nombre"}
                                                        </h3>

                                                        <p className="servicio-nur-card__text">
                                                            {normalizarTexto(servicio.descripcion)}
                                                        </p>

                                                        {servicio.icono ? (
                                                            <div className="servicio-nur-card__meta">
                                                                <FaLink />
                                                                <span>Ícono configurado: {servicio.icono}</span>
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <div className="servicio-nur-card__footer">
                                                        {servicio.link ? (
                                                            <a
                                                                href={servicio.link}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="nur-btn nur-btn--primary servicio-nur-card__link"
                                                            >
                                                                <FaExternalLinkAlt />
                                                                <span>Abrir servicio</span>
                                                            </a>
                                                        ) : (
                                                            <div className="servicio-nur-card__notice">
                                                                Este servicio no tiene enlace externo
                                                                configurado todavía.
                                                            </div>
                                                        )}
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="servicios-home-nur-empty servicios-home-nur-empty--soft">
                                            <FaToolbox />
                                            <h3>Sin registros en esta categoría</h3>
                                            <p>
                                                Todavía no hay servicios cargados dentro de{" "}
                                                {titulosPorTipo[key].toLowerCase()}.
                                            </p>
                                        </div>
                                    )}
                                </section>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
};

export default ServiciosAlumniPage;