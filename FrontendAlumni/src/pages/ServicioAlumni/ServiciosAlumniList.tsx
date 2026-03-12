import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "animate.css";
import {
    FaBook,
    FaDumbbell,
    FaEdit,
    FaExternalLinkAlt,
    FaFilter,
    FaGraduationCap,
    FaLink,
    FaPlus,
    FaRedo,
    FaSearch,
    FaToolbox,
    FaTrash,
    FaTimes,
} from "react-icons/fa";

import "./ServiciosAlumniList.css";

import { ServicioAlumni } from "../../models/ServicioAlumni/ServicioAlumni";
import { ServicioAlumniService } from "../../services/alumni/ServicioAlumniService";
import { Routes } from "../../routes/CONSTANTS";

const formatearFecha = (fecha?: string | null): string => {
    if (!fecha) return "Sin fecha";

    try {
        return new Date(fecha).toLocaleDateString("es-BO", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return fecha;
    }
};

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

const obtenerTipoIcono = (tipo?: ServicioAlumni["tipo"]) => {
    switch (tipo) {
        case "educacion":
            return <FaGraduationCap />;
        case "biblioteca":
            return <FaBook />;
        case "deporte":
            return <FaDumbbell />;
        case "otros":
            return <FaToolbox />;
        default:
            return <FaToolbox />;
    }
};

const obtenerResumenTipos = (servicios: ServicioAlumni[]) => {
    return {
        educacion: servicios.filter((s) => s.tipo === "educacion").length,
        biblioteca: servicios.filter((s) => s.tipo === "biblioteca").length,
        deporte: servicios.filter((s) => s.tipo === "deporte").length,
        otros: servicios.filter((s) => s.tipo === "otros").length,
    };
};

const ServiciosAlumniList = () => {
    const [servicios, setServicios] = useState<ServicioAlumni[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [search, setSearch] = useState<string>("");

    const navigate = useNavigate();

    const cargarServicios = async (): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const data = await ServicioAlumniService.list();
            setServicios(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("No se pudieron cargar los servicios.", err);
            setError("No se pudieron cargar los servicios Alumni. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarServicios();
    }, []);

    const serviciosOrdenados = useMemo(() => {
        return [...servicios].sort((a, b) => {
            const fechaA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
            const fechaB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;

            if (fechaB !== fechaA) return fechaB - fechaA;

            const nombreA = a.nombre?.toLowerCase() ?? "";
            const nombreB = b.nombre?.toLowerCase() ?? "";
            return nombreA.localeCompare(nombreB, "es");
        });
    }, [servicios]);

    const serviciosFiltrados = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return serviciosOrdenados;

        return serviciosOrdenados.filter((servicio) => {
            const nombre = servicio.nombre?.toLowerCase() ?? "";
            const descripcion = servicio.descripcion?.toLowerCase() ?? "";
            const tipo = servicio.tipo?.toLowerCase() ?? "";
            const icono = servicio.icono?.toLowerCase() ?? "";
            const link = servicio.link?.toLowerCase() ?? "";

            return (
                nombre.includes(term) ||
                descripcion.includes(term) ||
                tipo.includes(term) ||
                icono.includes(term) ||
                link.includes(term)
            );
        });
    }, [serviciosOrdenados, search]);

    const resumen = useMemo(() => {
        return {
            total: servicios.length,
            visibles: serviciosFiltrados.length,
            conLink: servicios.filter((s) => Boolean(s.link)).length,
            sinLink: servicios.filter((s) => !s.link).length,
        };
    }, [servicios, serviciosFiltrados]);

    const resumenTipos = useMemo(() => {
        return obtenerResumenTipos(servicios);
    }, [servicios]);

    const handleDelete = async (id?: number): Promise<void> => {
        if (!id) return;

        const confirmed = window.confirm(
            "¿Estás seguro de que deseas eliminar este servicio?"
        );
        if (!confirmed) return;

        try {
            setDeletingId(id);
            await ServicioAlumniService.delete(id);
            setServicios((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error("No se pudo eliminar el servicio.", err);
            alert("No se pudo eliminar el servicio.");
        } finally {
            setDeletingId(null);
        }
    };

    const hayFiltroActivo = search.trim().length > 0;

    return (
        <div className="servicios-admin-nur-page animate__animated animate__fadeIn">
            <section className="servicios-admin-nur-hero">
                <div className="container">
                    <div className="servicios-admin-nur-hero__content">
                        <div className="servicios-admin-nur-hero__copy">
                            <span className="servicios-admin-nur-hero__eyebrow">
                                <FaToolbox />
                                Panel administrativo
                            </span>

                            <h1 className="servicios-admin-nur-hero__title">
                                Gestión de servicios Alumni
                            </h1>

                            <p className="servicios-admin-nur-hero__text">
                                Administra los beneficios y accesos institucionales publicados para
                                la comunidad Alumni NUR. Aquí el administrador puede revisar el
                                catálogo, validar metadata básica y ejecutar acciones de creación,
                                edición o eliminación.
                            </p>
                        </div>

                        <div className="servicios-admin-nur-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => void cargarServicios()}
                                disabled={loading}
                            >
                                <FaRedo className={loading ? "spin-soft" : ""} />
                                <span>{loading ? "Actualizando..." : "Recargar"}</span>
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={() => navigate(Routes.ADMIN.SERVICIOS.CREATE)}
                            >
                                <FaPlus />
                                <span>Nuevo servicio</span>
                            </button>
                        </div>
                    </div>

                    <div className="servicios-admin-nur-stats">
                        <div className="servicios-admin-nur-stat">
                            <span className="servicios-admin-nur-stat__label">Total</span>
                            <strong className="servicios-admin-nur-stat__value">
                                {resumen.total}
                            </strong>
                        </div>

                        <div className="servicios-admin-nur-stat">
                            <span className="servicios-admin-nur-stat__label">Visibles</span>
                            <strong className="servicios-admin-nur-stat__value">
                                {resumen.visibles}
                            </strong>
                        </div>

                        <div className="servicios-admin-nur-stat">
                            <span className="servicios-admin-nur-stat__label">Con enlace</span>
                            <strong className="servicios-admin-nur-stat__value">
                                {resumen.conLink}
                            </strong>
                        </div>

                        <div className="servicios-admin-nur-stat">
                            <span className="servicios-admin-nur-stat__label">Sin enlace</span>
                            <strong className="servicios-admin-nur-stat__value">
                                {resumen.sinLink}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="servicios-admin-nur-content">
                <div className="container">
                    <div className="servicios-admin-nur-toolbar">
                        <div className="servicios-admin-nur-toolbar__searchCard">
                            <div className="servicios-admin-nur-toolbar__searchTop">
                                <label
                                    htmlFor="servicio-search"
                                    className="servicios-admin-nur-toolbar__label"
                                >
                                    <FaSearch />
                                    Buscar servicio
                                </label>

                                {hayFiltroActivo ? (
                                    <button
                                        type="button"
                                        className="servicios-admin-nur-toolbar__clear"
                                        onClick={() => setSearch("")}
                                    >
                                        <FaTimes />
                                        <span>Limpiar</span>
                                    </button>
                                ) : null}
                            </div>

                            <input
                                id="servicio-search"
                                type="text"
                                className="form-control servicios-admin-nur-toolbar__input"
                                placeholder="Buscar por nombre, tipo, descripción, icono o enlace"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            <div className="servicios-admin-nur-toolbar__meta">
                                <span className="servicios-admin-nur-toolbar__chip">
                                    <FaFilter />
                                    {hayFiltroActivo
                                        ? `${serviciosFiltrados.length} resultado(s) filtrado(s)`
                                        : "Sin filtro activo"}
                                </span>

                                <span className="servicios-admin-nur-toolbar__chip muted">
                                    Catálogo administrativo de servicios Alumni
                                </span>
                            </div>
                        </div>

                        <div className="servicios-admin-nur-toolbar__summary">
                            <div className="servicios-admin-nur-toolbar__summaryItem">
                                <span>Educación</span>
                                <strong>{resumenTipos.educacion}</strong>
                            </div>
                            <div className="servicios-admin-nur-toolbar__summaryItem">
                                <span>Biblioteca</span>
                                <strong>{resumenTipos.biblioteca}</strong>
                            </div>
                            <div className="servicios-admin-nur-toolbar__summaryItem">
                                <span>Deporte</span>
                                <strong>{resumenTipos.deporte}</strong>
                            </div>
                            <div className="servicios-admin-nur-toolbar__summaryItem">
                                <span>Otros</span>
                                <strong>{resumenTipos.otros}</strong>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="servicios-admin-nur-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mb-0 mt-3">Cargando servicios...</p>
                        </div>
                    ) : error ? (
                        <div className="servicios-admin-nur-alert servicios-admin-nur-alert--error">
                            {error}
                        </div>
                    ) : serviciosFiltrados.length === 0 ? (
                        <div className="servicios-admin-nur-empty">
                            <FaToolbox />
                            <h3>
                                {hayFiltroActivo
                                    ? "No hay coincidencias para tu búsqueda"
                                    : "No hay servicios registrados"}
                            </h3>
                            <p>
                                {hayFiltroActivo
                                    ? "No existen registros que coincidan con el filtro aplicado. Prueba con otro término de búsqueda."
                                    : "Todavía no se han creado servicios en el sistema. Puedes registrar el primero desde este panel."}
                            </p>

                            {!hayFiltroActivo ? (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={() => navigate(Routes.ADMIN.SERVICIOS.CREATE)}
                                >
                                    <FaPlus />
                                    <span>Crear primer servicio</span>
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="servicios-admin-nur-grid">
                            {serviciosFiltrados.map((servicio) => {
                                const deleting = deletingId === servicio.id;

                                return (
                                    <article
                                        key={servicio.id ?? `${servicio.nombre}-${servicio.tipo}`}
                                        className="servicio-admin-card animate__animated animate__fadeInUp"
                                    >
                                        <div className="servicio-admin-card__accent" />

                                        <div className="servicio-admin-card__header">
                                            <span className="servicio-admin-card__icon">
                                                {obtenerTipoIcono(servicio.tipo)}
                                            </span>

                                            <span className="servicio-admin-card__badge">
                                                {obtenerTipoLabel(servicio.tipo)}
                                            </span>
                                        </div>

                                        <div className="servicio-admin-card__body">
                                            <div className="servicio-admin-card__titleBlock">
                                                <h3 className="servicio-admin-card__title">
                                                    {servicio.nombre || "Servicio sin nombre"}
                                                </h3>

                                                {servicio.id ? (
                                                    <span className="servicio-admin-card__id">
                                                        ID #{servicio.id}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <p className="servicio-admin-card__text">
                                                {servicio.descripcion ||
                                                    "Sin descripción registrada."}
                                            </p>

                                            <div className="servicio-admin-card__meta">
                                                <span className="servicio-admin-card__metaItem">
                                                    {formatearFecha(servicio.fecha_creacion)}
                                                </span>

                                                {servicio.icono ? (
                                                    <span className="servicio-admin-card__metaItem">
                                                        <FaToolbox />
                                                        Ícono: {servicio.icono}
                                                    </span>
                                                ) : (
                                                    <span className="servicio-admin-card__metaItem is-muted">
                                                        Ícono no configurado
                                                    </span>
                                                )}

                                                {servicio.link ? (
                                                    <span className="servicio-admin-card__metaItem">
                                                        <FaLink />
                                                        Con enlace
                                                    </span>
                                                ) : (
                                                    <span className="servicio-admin-card__metaItem is-muted">
                                                        Sin enlace
                                                    </span>
                                                )}
                                            </div>

                                            {servicio.link ? (
                                                <a
                                                    href={servicio.link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="servicio-admin-card__externalLink"
                                                >
                                                    <FaExternalLinkAlt />
                                                    <span>Ver enlace publicado</span>
                                                </a>
                                            ) : null}
                                        </div>

                                        <div className="servicio-admin-card__actions">
                                            <button
                                                type="button"
                                                className="nur-btn nur-btn--ghost"
                                                onClick={() =>
                                                    servicio.id &&
                                                    navigate(
                                                        Routes.ADMIN.SERVICIOS.EDIT_PARAM(
                                                            servicio.id
                                                        )
                                                    )
                                                }
                                                disabled={!servicio.id}
                                            >
                                                <FaEdit />
                                                <span>Editar</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="nur-btn nur-btn--ghost-danger"
                                                onClick={() => void handleDelete(servicio.id)}
                                                disabled={!servicio.id || deleting}
                                            >
                                                <FaTrash />
                                                <span>
                                                    {deleting ? "Eliminando..." : "Eliminar"}
                                                </span>
                                            </button>
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

export default ServiciosAlumniList;