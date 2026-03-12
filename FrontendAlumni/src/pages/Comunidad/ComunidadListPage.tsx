import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import "animate.css";
import {
    FaArrowRight,
    FaCalendarAlt,
    FaComments,
    FaEdit,
    FaExclamationTriangle,
    FaFilter,
    FaImage,
    FaNewspaper,
    FaPlusCircle,
    FaRedo,
    FaSearch,
    FaTrash,
    FaUniversity,
    FaUsers,
} from "react-icons/fa";

import "./ComunidadListPage.css";

import { Comunidad } from "../../models/Comunidad/Comunidad";
import { ComunidadService } from "../../services/alumni/ComunidadService";
import { Routes } from "../../routes/CONSTANTS";

const placeholderImg = "/placeholder-comunidad.png";

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

const ComunidadListPage = () => {
    const [comunidades, setComunidades] = useState<Comunidad[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [search, setSearch] = useState<string>("");
    const [estadoFiltro, setEstadoFiltro] = useState<"todas" | "activas" | "inactivas">(
        "todas"
    );

    const navigate = useNavigate();

    const cargarComunidades = async (): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const data = await ComunidadService.list();
            setComunidades(data ?? []);
        } catch (err) {
            console.error("Error al cargar comunidades.", err);
            setError("No se pudieron cargar las comunidades.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarComunidades();
    }, []);

    const comunidadesOrdenadas = useMemo(() => {
        return [...comunidades].sort((a, b) => {
            const fechaA = a.fecha_actualizacion
                ? new Date(a.fecha_actualizacion).getTime()
                : a.fecha_creacion
                    ? new Date(a.fecha_creacion).getTime()
                    : 0;

            const fechaB = b.fecha_actualizacion
                ? new Date(b.fecha_actualizacion).getTime()
                : b.fecha_creacion
                    ? new Date(b.fecha_creacion).getTime()
                    : 0;

            if (fechaB !== fechaA) return fechaB - fechaA;

            return (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
        });
    }, [comunidades]);

    const comunidadesFiltradas = useMemo(() => {
        const term = search.trim().toLowerCase();

        return comunidadesOrdenadas.filter((comunidad) => {
            const estadoOk =
                estadoFiltro === "todas"
                    ? true
                    : estadoFiltro === "activas"
                        ? Boolean(comunidad.activo)
                        : !comunidad.activo;

            if (!estadoOk) return false;

            if (!term) return true;

            const nombre = comunidad.nombre?.toLowerCase() ?? "";
            const descripcion = comunidad.descripcion?.toLowerCase() ?? "";
            const slug = comunidad.slug?.toLowerCase() ?? "";

            return (
                nombre.includes(term) ||
                descripcion.includes(term) ||
                slug.includes(term)
            );
        });
    }, [comunidadesOrdenadas, estadoFiltro, search]);

    const estadisticas = useMemo(() => {
        const total = comunidades.length;
        const activas = comunidades.filter((c) => Boolean(c.activo)).length;
        const inactivas = total - activas;
        const totalMiembros = comunidades.reduce(
            (acc, comunidad) =>
                acc + (comunidad.total_miembros ?? comunidad.usuarios?.length ?? 0),
            0
        );
        const conImagen = comunidades.filter((c) => Boolean(c.imagen_portada)).length;
        const totalConversaciones = comunidades.reduce(
            (acc, comunidad) => acc + (comunidad.total_conversaciones ?? 0),
            0
        );

        return {
            total,
            activas,
            inactivas,
            totalMiembros,
            conImagen,
            totalConversaciones,
        };
    }, [comunidades]);

    const handleDelete = async (id?: number): Promise<void> => {
        if (!id) return;

        const confirmed = window.confirm(
            "¿Deseas eliminar esta comunidad? Esta acción no se puede deshacer."
        );
        if (!confirmed) return;

        try {
            setDeletingId(id);
            await ComunidadService.delete(id);
            setComunidades((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            console.error("No se pudo eliminar la comunidad.", err);
            alert("No se pudo eliminar la comunidad.");
        } finally {
            setDeletingId(null);
        }
    };

    const hayFiltroActivo = search.trim().length > 0 || estadoFiltro !== "todas";

    if (loading) {
        return (
            <div className="comunidad-list-page">
                <div className="container py-5">
                    <div className="comunidad-list-state animate__animated animate__fadeIn">
                        <Spinner animation="border" role="status" />
                        <h3>Cargando comunidades</h3>
                        <p className="mb-0">
                            Estamos recuperando la información administrativa del módulo.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="comunidad-list-page">
                <div className="container py-5">
                    <div className="comunidad-list-state comunidad-list-state--error animate__animated animate__fadeIn">
                        <FaExclamationTriangle />
                        <h3>No fue posible cargar las comunidades</h3>
                        <p>{error}</p>

                        <button
                            type="button"
                            className="nur-btn nur-btn--primary"
                            onClick={() => void cargarComunidades()}
                        >
                            <FaRedo />
                            <span>Reintentar</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="comunidad-list-page">
            <section className="comunidad-list-hero animate__animated animate__fadeIn">
                <div className="container">
                    <div className="comunidad-list-hero__grid">
                        <div className="comunidad-list-hero__content">
                            <span className="comunidad-list-hero__eyebrow">
                                <FaUniversity />
                                Gestión administrativa Alumni NUR
                            </span>

                            <h1 className="comunidad-list-hero__title">
                                Administración de comunidades
                            </h1>

                            <p className="comunidad-list-hero__text">
                                Supervisa las comunidades del portal, revisa su estado general,
                                controla membresía básica y gestiona edición, acceso al hub o
                                eliminación desde un panel administrativo coherente con el dominio
                                actual.
                            </p>

                            <div className="comunidad-list-hero__actions">
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--ghost-light"
                                    onClick={() => void cargarComunidades()}
                                >
                                    <FaRedo />
                                    <span>Actualizar listado</span>
                                </button>

                                <button
                                    type="button"
                                    className="nur-btn nur-btn--secondary"
                                    onClick={() => navigate(Routes.ADMIN.COMUNIDADES.CREATE)}
                                >
                                    <FaPlusCircle />
                                    <span>Nueva comunidad</span>
                                </button>
                            </div>
                        </div>

                        <div className="comunidad-list-hero__stats">
                            <div className="comunidad-list-stat">
                                <span className="comunidad-list-stat__value">
                                    {estadisticas.total}
                                </span>
                                <span className="comunidad-list-stat__label">
                                    Comunidades registradas
                                </span>
                            </div>

                            <div className="comunidad-list-stat">
                                <span className="comunidad-list-stat__value">
                                    {estadisticas.activas}
                                </span>
                                <span className="comunidad-list-stat__label">
                                    Activas actualmente
                                </span>
                            </div>

                            <div className="comunidad-list-stat">
                                <span className="comunidad-list-stat__value">
                                    {estadisticas.totalMiembros}
                                </span>
                                <span className="comunidad-list-stat__label">
                                    Miembros acumulados
                                </span>
                            </div>

                            <div className="comunidad-list-stat">
                                <span className="comunidad-list-stat__value">
                                    {estadisticas.totalConversaciones}
                                </span>
                                <span className="comunidad-list-stat__label">
                                    Conversaciones registradas
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="comunidad-list-content">
                <div className="container">
                    <div className="comunidad-list-toolbar animate__animated animate__fadeInUp">
                        <div className="comunidad-list-toolbar__searchCard">
                            <div className="comunidad-list-toolbar__top">
                                <label
                                    htmlFor="comunidad-search"
                                    className="comunidad-list-toolbar__label"
                                >
                                    <FaSearch />
                                    Buscar comunidad
                                </label>

                                <div className="comunidad-list-toolbar__chips">
                                    <span className="comunidad-list-toolbar__chip">
                                        <FaImage />
                                        {estadisticas.conImagen} con portada
                                    </span>
                                    <span className="comunidad-list-toolbar__chip muted">
                                        {hayFiltroActivo
                                            ? `${comunidadesFiltradas.length} resultado(s)`
                                            : "Sin filtros aplicados"}
                                    </span>
                                </div>
                            </div>

                            <input
                                id="comunidad-search"
                                type="text"
                                className="form-control comunidad-list-toolbar__input"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, descripción o slug"
                            />
                        </div>

                        <div className="comunidad-list-toolbar__filterCard">
                            <div className="comunidad-list-toolbar__filterTitle">
                                <FaFilter />
                                <span>Filtro por estado</span>
                            </div>

                            <div className="comunidad-list-toolbar__filterButtons">
                                <button
                                    type="button"
                                    className={`comunidad-filter-btn ${estadoFiltro === "todas" ? "is-active" : ""
                                        }`}
                                    onClick={() => setEstadoFiltro("todas")}
                                >
                                    Todas
                                </button>

                                <button
                                    type="button"
                                    className={`comunidad-filter-btn ${estadoFiltro === "activas" ? "is-active" : ""
                                        }`}
                                    onClick={() => setEstadoFiltro("activas")}
                                >
                                    Activas
                                </button>

                                <button
                                    type="button"
                                    className={`comunidad-filter-btn ${estadoFiltro === "inactivas" ? "is-active" : ""
                                        }`}
                                    onClick={() => setEstadoFiltro("inactivas")}
                                >
                                    Inactivas
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="comunidad-list-sectionHeader">
                        <div>
                            <span className="comunidad-list-sectionHeader__eyebrow">
                                <FaComments />
                                Panel de control
                            </span>
                            <h2 className="comunidad-list-sectionHeader__title">
                                Lista de comunidades
                            </h2>
                            <p className="comunidad-list-sectionHeader__text">
                                Visualiza rápidamente cada espacio creado, su estado, metadatos y
                                las acciones disponibles de mantenimiento.
                            </p>
                        </div>
                    </div>

                    {comunidadesFiltradas.length === 0 ? (
                        <div className="comunidad-list-empty animate__animated animate__fadeInUp">
                            <FaUsers />
                            <h3>
                                {hayFiltroActivo
                                    ? "No hay comunidades que coincidan con el filtro"
                                    : "Aún no existen comunidades registradas"}
                            </h3>
                            <p>
                                {hayFiltroActivo
                                    ? "Prueba otro término de búsqueda o cambia el filtro de estado."
                                    : "Crea la primera comunidad para habilitar espacios de networking y conversación dentro del portal Alumni."}
                            </p>

                            {!hayFiltroActivo ? (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={() => navigate(Routes.ADMIN.COMUNIDADES.CREATE)}
                                >
                                    <FaPlusCircle />
                                    <span>Crear comunidad</span>
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="row g-4">
                            {comunidadesFiltradas.map((comunidad) => {
                                const miembros =
                                    comunidad.total_miembros ??
                                    comunidad.usuarios?.length ??
                                    0;

                                const carreras = comunidad.carreras?.length ?? 0;
                                const conversaciones =
                                    comunidad.total_conversaciones ?? 0;
                                const noticias =
                                    comunidad.total_noticias_publicadas ?? 0;
                                const isDeleting = deletingId === comunidad.id;
                                const isActiva = Boolean(comunidad.activo);

                                return (
                                    <div className="col-12 col-md-6 col-xl-4" key={comunidad.id}>
                                        <article className="comunidad-admin-card animate__animated animate__fadeInUp">
                                            <div className="comunidad-admin-card__media">
                                                <img
                                                    src={comunidad.imagen_portada || placeholderImg}
                                                    alt={comunidad.nombre || "Comunidad"}
                                                    className="comunidad-admin-card__image"
                                                />

                                                <div className="comunidad-admin-card__overlay" />

                                                <div className="comunidad-admin-card__badges">
                                                    <div className="comunidad-admin-card__badge">
                                                        <FaUsers />
                                                        <span>{miembros} miembros</span>
                                                    </div>

                                                    <div
                                                        className={`comunidad-admin-card__status ${isActiva ? "is-active" : "is-inactive"
                                                            }`}
                                                    >
                                                        <span className="status-dot" />
                                                        <span>
                                                            {isActiva ? "Activa" : "Inactiva"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="comunidad-admin-card__body">
                                                <div className="comunidad-admin-card__header">
                                                    <h3 className="comunidad-admin-card__title">
                                                        {comunidad.nombre || "Comunidad sin nombre"}
                                                    </h3>

                                                    <p className="comunidad-admin-card__description">
                                                        {comunidad.descripcion?.trim() ||
                                                            "Sin descripción registrada para esta comunidad."}
                                                    </p>
                                                </div>

                                                <div className="comunidad-admin-card__meta">
                                                    <div className="comunidad-admin-card__metaItem">
                                                        <FaCalendarAlt />
                                                        <span>
                                                            {formatearFecha(
                                                                comunidad.fecha_actualizacion ||
                                                                comunidad.fecha_creacion
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="comunidad-admin-card__metaItem">
                                                        <FaUniversity />
                                                        <span>
                                                            {carreras} carrera
                                                            {carreras !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>

                                                    <div className="comunidad-admin-card__metaItem">
                                                        <FaImage />
                                                        <span>
                                                            {comunidad.imagen_portada
                                                                ? "Portada configurada"
                                                                : "Sin portada"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="comunidad-admin-card__indicators">
                                                    <div className="comunidad-admin-card__indicator">
                                                        <FaComments />
                                                        <span>{conversaciones} conversaciones</span>
                                                    </div>

                                                    <div className="comunidad-admin-card__indicator">
                                                        <FaNewspaper />
                                                        <span>{noticias} noticias</span>
                                                    </div>

                                                    {comunidad.slug ? (
                                                        <div className="comunidad-admin-card__indicator comunidad-admin-card__indicator--slug">
                                                            <span>slug: {comunidad.slug}</span>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="comunidad-admin-card__actions">
                                                    <button
                                                        type="button"
                                                        className="nur-btn nur-btn--ghost"
                                                        onClick={() =>
                                                            navigate(
                                                                Routes.ADMIN.COMUNIDADES.EDIT_PARAM(
                                                                    comunidad.id as number
                                                                )
                                                            )
                                                        }
                                                        disabled={!comunidad.id || isDeleting}
                                                    >
                                                        <FaEdit />
                                                        <span>Editar</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="nur-btn nur-btn--ghost"
                                                        onClick={() =>
                                                            navigate(
                                                                Routes.COMUNIDAD.HUB_PARAM(
                                                                    comunidad.id
                                                                )
                                                            )
                                                        }
                                                        disabled={!comunidad.id || isDeleting}
                                                    >
                                                        <FaArrowRight />
                                                        <span>Entrar al hub</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="nur-btn nur-btn--danger"
                                                        onClick={() =>
                                                            void handleDelete(comunidad.id)
                                                        }
                                                        disabled={isDeleting}
                                                    >
                                                        {isDeleting ? (
                                                            <>
                                                                <Spinner size="sm" />
                                                                <span>Eliminando...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FaTrash />
                                                                <span>Eliminar</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default ComunidadListPage;