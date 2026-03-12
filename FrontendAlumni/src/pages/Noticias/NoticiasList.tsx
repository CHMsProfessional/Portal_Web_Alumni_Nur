/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "animate.css";
import {
    FaArrowRight,
    FaCalendarDays,
    FaEye,
    FaFilter,
    FaLayerGroup,
    FaNewspaper,
    FaPlus,
    FaTrash,
} from "react-icons/fa6";

import {
FaEdit,
FaRedo,
FaSearch,
} from "react-icons/fa";

import "./NoticiasList.css";

import type { Noticia } from "../../models/Noticia/Noticia";
import type { TipoNoticia } from "../../models/Noticia/TipoNoticia";
import type { DestinoNoticia } from "../../models/Noticia/DestinoNoticia";

import { NoticiaService } from "../../services/alumni/NoticiaService";
import { Routes } from "../../routes/CONSTANTS";

const placeholderImg = "/placeholder-comunidad.png";

type PublishedFilter = "ALL" | "PUBLISHED" | "UNPUBLISHED";
type FeaturedFilter = "ALL" | "FEATURED" | "NOT_FEATURED";

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

const recortarTexto = (texto?: string, max = 140): string => {
    if (!texto?.trim()) return "Sin contenido.";
    if (texto.length <= max) return texto;
    return `${texto.slice(0, max).trim()}...`;
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

const NoticiasList = () => {
    const navigate = useNavigate();

    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [search, setSearch] = useState<string>("");
    const [tipoFilter, setTipoFilter] = useState<TipoNoticia | "ALL">("ALL");
    const [destinoFilter, setDestinoFilter] = useState<DestinoNoticia | "ALL">("ALL");
    const [publishedFilter, setPublishedFilter] = useState<PublishedFilter>("ALL");
    const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("ALL");

    const cargarNoticias = async (): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const data = await NoticiaService.list();
            setNoticias(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error al cargar noticias:", err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarNoticias();
    }, []);

    const noticiasOrdenadas = useMemo(() => {
        return [...noticias].sort((a, b) => {
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

    const noticiasFiltradas = useMemo(() => {
        const term = search.trim().toLowerCase();

        return noticiasOrdenadas.filter((noticia) => {
            const matchSearch =
                !term ||
                (noticia.titulo?.toLowerCase() ?? "").includes(term) ||
                (noticia.resumen?.toLowerCase() ?? "").includes(term) ||
                (noticia.contenido?.toLowerCase() ?? "").includes(term) ||
                (noticia.comunidad_nombre?.toLowerCase() ?? "").includes(term) ||
                (noticia.evento_titulo?.toLowerCase() ?? "").includes(term);

            const matchTipo =
                tipoFilter === "ALL" || noticia.tipo === tipoFilter;

            const matchDestino =
                destinoFilter === "ALL" || noticia.destino === destinoFilter;

            const matchPublished =
                publishedFilter === "ALL" ||
                (publishedFilter === "PUBLISHED" && noticia.publicado === true) ||
                (publishedFilter === "UNPUBLISHED" && noticia.publicado !== true);

            const matchFeatured =
                featuredFilter === "ALL" ||
                (featuredFilter === "FEATURED" && noticia.destacado === true) ||
                (featuredFilter === "NOT_FEATURED" && noticia.destacado !== true);

            return (
                matchSearch &&
                matchTipo &&
                matchDestino &&
                matchPublished &&
                matchFeatured
            );
        });
    }, [
        noticiasOrdenadas,
        search,
        tipoFilter,
        destinoFilter,
        publishedFilter,
        featuredFilter,
    ]);

    const resumen = useMemo(() => {
        const publicadas = noticias.filter((item) => item.publicado).length;
        const destacadas = noticias.filter((item) => item.destacado).length;

        return {
            total: noticias.length,
            visibles: noticiasFiltradas.length,
            publicadas,
            destacadas,
        };
    }, [noticias, noticiasFiltradas.length]);

    const handleDelete = async (id?: number) => {
        if (!id || deletingId) return;

        const confirmed = window.confirm(
            "¿Deseas eliminar esta noticia? Esta acción no se puede deshacer."
        );
        if (!confirmed) return;

        try {
            setDeletingId(id);
            await (NoticiaService as any).delete(id);
            await cargarNoticias();
        } catch (err) {
            console.error("Error eliminando noticia:", err);
            setError(getErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    };


    return (
        <div className="noticias-admin-page animate__animated animate__fadeIn">
            <section className="noticias-admin-hero">
                <div className="container">
                    <div className="noticias-admin-hero__content">
                        <div className="noticias-admin-hero__copy">
                            <span className="noticias-admin-hero__eyebrow">
                                <FaNewspaper />
                                Gestión administrativa
                            </span>

                            <h1 className="noticias-admin-hero__title">
                                Administración de noticias
                            </h1>

                            <p className="noticias-admin-hero__text">
                                Este listado ya no representa una vista pública de noticias.
                                Su función es administrar publicaciones del nuevo dominio
                                enriquecido para Home y Comunidad.
                            </p>
                        </div>

                        <div className="noticias-admin-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => void cargarNoticias()}
                                disabled={loading}
                            >
                                <FaRedo />
                                <span>Recargar</span>
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={() => navigate(Routes.ADMIN.NOTICIAS.CREATE)}
                            >
                                <FaPlus />
                                <span>Nueva noticia</span>
                            </button>
                        </div>
                    </div>

                    <div className="noticias-admin-stats">
                        <article className="noticias-admin-stats__card">
                            <span>Total</span>
                            <strong>{resumen.total}</strong>
                        </article>
                        <article className="noticias-admin-stats__card">
                            <span>Filtradas</span>
                            <strong>{resumen.visibles}</strong>
                        </article>
                        <article className="noticias-admin-stats__card">
                            <span>Publicadas</span>
                            <strong>{resumen.publicadas}</strong>
                        </article>
                        <article className="noticias-admin-stats__card">
                            <span>Destacadas</span>
                            <strong>{resumen.destacadas}</strong>
                        </article>
                    </div>
                </div>
            </section>

            <section className="noticias-admin-content">
                <div className="container">
                    <div className="noticias-admin-toolbar">
                        <div className="noticias-admin-toolbar__search">
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Buscar por título, resumen, contenido, comunidad o evento..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="noticias-admin-toolbar__filters">
                            <div className="noticias-admin-filter">
                                <label>
                                    <FaFilter />
                                    Tipo
                                </label>
                                <select
                                    value={tipoFilter}
                                    onChange={(e) =>
                                        setTipoFilter(e.target.value as TipoNoticia | "ALL")
                                    }
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="BOTON">Botón</option>
                                    <option value="EVENTO">Evento</option>
                                    <option value="BOTON_EVENTO">Botón + evento</option>
                                </select>
                            </div>

                            <div className="noticias-admin-filter">
                                <label>
                                    <FaLayerGroup />
                                    Destino
                                </label>
                                <select
                                    value={destinoFilter}
                                    onChange={(e) =>
                                        setDestinoFilter(
                                            e.target.value as DestinoNoticia | "ALL"
                                        )
                                    }
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="HOME">Home</option>
                                    <option value="COMUNIDAD">Comunidad</option>
                                </select>
                            </div>

                            <div className="noticias-admin-filter">
                                <label>Publicación</label>
                                <select
                                    value={publishedFilter}
                                    onChange={(e) =>
                                        setPublishedFilter(
                                            e.target.value as PublishedFilter
                                        )
                                    }
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="PUBLISHED">Publicadas</option>
                                    <option value="UNPUBLISHED">No publicadas</option>
                                </select>
                            </div>

                            <div className="noticias-admin-filter">
                                <label>Destacado</label>
                                <select
                                    value={featuredFilter}
                                    onChange={(e) =>
                                        setFeaturedFilter(
                                            e.target.value as FeaturedFilter
                                        )
                                    }
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="FEATURED">Destacadas</option>
                                    <option value="NOT_FEATURED">No destacadas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="noticias-admin-alert noticias-admin-alert--error">
                            <strong>No se pudo completar la operación.</strong>
                            <p>{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="noticias-admin-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p>Cargando noticias...</p>
                        </div>
                    ) : noticiasFiltradas.length === 0 ? (
                        <div className="noticias-admin-empty">
                            <FaNewspaper />
                            <h3>No hay noticias para mostrar</h3>
                            <p>
                                No existen resultados con los filtros actuales o aún no hay noticias registradas.
                            </p>
                        </div>
                    ) : (
                        <div className="noticias-admin-grid">
                            {noticiasFiltradas.map((noticia) => (
                                <article
                                    key={noticia.id}
                                    className="noticias-admin-card animate__animated animate__fadeInUp"
                                >
                                    <div className="noticias-admin-card__media">
                                        <img
                                            src={noticia.imagen || placeholderImg}
                                            alt={noticia.titulo || "Noticia"}
                                            className="noticias-admin-card__image"
                                        />

                                        <div className="noticias-admin-card__badges">
                                            <span className="noticias-admin-chip">
                                                {noticia.tipo_display || noticia.tipo || "Noticia"}
                                            </span>

                                            <span className="noticias-admin-chip noticias-admin-chip--muted">
                                                {noticia.destino_display ||
                                                    noticia.destino ||
                                                    "Sin destino"}
                                            </span>

                                            {noticia.destacado && (
                                                <span className="noticias-admin-chip noticias-admin-chip--accent">
                                                    Destacada
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="noticias-admin-card__body">
                                        <div className="noticias-admin-card__top">
                                            <h3 className="noticias-admin-card__title">
                                                {noticia.titulo || "Sin título"}
                                            </h3>

                                            <span
                                                className={`noticias-admin-status ${
                                                    noticia.publicado
                                                        ? "noticias-admin-status--published"
                                                        : "noticias-admin-status--draft"
                                                }`}
                                            >
                                                {noticia.publicado ? "Publicada" : "No publicada"}
                                            </span>
                                        </div>

                                        <p className="noticias-admin-card__summary">
                                            {recortarTexto(
                                                noticia.resumen || noticia.contenido,
                                                160
                                            )}
                                        </p>

                                        <div className="noticias-admin-card__meta">
                                            <span>
                                                <FaCalendarDays />
                                                {formatearFecha(
                                                    noticia.fecha_publicacion ||
                                                        noticia.fecha_actualizacion
                                                )}
                                            </span>

                                            {noticia.comunidad_nombre && (
                                                <span>{noticia.comunidad_nombre}</span>
                                            )}

                                            {noticia.evento_titulo && (
                                                <span>{noticia.evento_titulo}</span>
                                            )}
                                        </div>

                                        <div className="noticias-admin-card__footer">
                                            <button
                                                type="button"
                                                className="noticias-admin-action noticias-admin-action--view"
                                                onClick={() =>
                                                    navigate(Routes.NOTICIAS_DETALLE_PARAM(noticia.id))
                                                }
                                            >
                                                <FaEye />
                                                <span>Ver detalle</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="noticias-admin-action noticias-admin-action--edit"
                                                onClick={() =>
                                                    navigate(
                                                        Routes.ADMIN.NOTICIAS.EDIT_PARAM(
                                                            noticia.id
                                                        )
                                                    )
                                                }
                                            >
                                                <FaEdit />
                                                <span>Editar</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="noticias-admin-action noticias-admin-action--delete"
                                                onClick={() => void handleDelete(noticia.id)}
                                                disabled={deletingId === noticia.id}
                                            >
                                                <FaTrash />
                                                <span>
                                                    {deletingId === noticia.id
                                                        ? "Eliminando..."
                                                        : "Eliminar"}
                                                </span>
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="noticias-admin-card__link"
                                            onClick={() =>
                                                navigate(Routes.NOTICIAS_DETALLE_PARAM(noticia.id))
                                            }
                                        >
                                            <span>Ir al detalle</span>
                                            <FaArrowRight />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default NoticiasList;