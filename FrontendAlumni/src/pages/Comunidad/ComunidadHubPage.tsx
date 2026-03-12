/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "animate.css";
import {
    FaArrowRight,
    FaBolt,
    FaComments,
    FaDoorOpen,
    FaLock,
    FaLockOpen,
    FaNewspaper,
    FaPeopleGroup,
    FaPlus,
    FaUserCheck,
    FaUsers,
} from "react-icons/fa6";

import "./ComunidadHubPage.css";
import { Routes } from "../../routes/CONSTANTS";

import type { Comunidad } from "../../models/Comunidad/Comunidad";
import type { ConversacionComunidad } from "../../models/Comunidad/ConversacionComunidad";
import type { Noticia } from "../../models/Noticia/Noticia";
import type { UsuarioPerfil } from "../../models/Usuario/UsuarioPerfil";

import { AuthService } from "../../services/alumni/AuthService";
import { ComunidadService } from "../../services/alumni/ComunidadService";
import { ConversacionComunidadService } from "../../services/alumni/ConversacionComunidadService";
import { NoticiaService } from "../../services/alumni/NoticiaService";
import UserAlumniService from "../../services/alumni/UserAlumniService";

import NoticiasBannerSection from "../../components/Noticias/NoticiasBannerSection";

const placeholderImg = "/placeholder-comunidad.png";

const getErrorMessage = (error: unknown): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: { data?: unknown } }).response?.data
    ) {
        const data = (error as { response?: { data?: unknown } }).response?.data;

        if (typeof data === "string") {
            return data;
        }

        try {
            return JSON.stringify(data, null, 2);
        } catch {
            return "Ocurrió un error inesperado al procesar la respuesta.";
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado.";
};

const formatDate = (value?: string | null): string => {
    if (!value) return "Sin fecha";
    try {
        return new Date(value).toLocaleString("es-BO", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
};

const truncate = (value?: string | null, max = 160): string => {
    const safe = value?.trim() || "";
    if (!safe) return "";
    if (safe.length <= max) return safe;
    return `${safe.slice(0, max).trim()}...`;
};

const ComunidadHubPage = () => {
    const navigate = useNavigate();
    const params = useParams();

    const comunidadId = Number(params.comunidadId ?? params.id);

    const [comunidad, setComunidad] = useState<Comunidad | null>(null);
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [conversaciones, setConversaciones] = useState<ConversacionComunidad[]>([]);
    const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);

    const [loadingHub, setLoadingHub] = useState<boolean>(true);
    const [loadingNoticias, setLoadingNoticias] = useState<boolean>(true);
    const [loadingConversaciones, setLoadingConversaciones] = useState<boolean>(true);

    const [errorHub, setErrorHub] = useState<string>("");
    const [errorNoticias, setErrorNoticias] = useState<string>("");
    const [errorConversaciones, setErrorConversaciones] = useState<string>("");

    const isAdmin = AuthService.isAdmin();
    const isAuthenticated = AuthService.isAuthenticated();

    useEffect(() => {
        if (!comunidadId || Number.isNaN(comunidadId)) {
            setErrorHub("No se pudo identificar la comunidad solicitada.");
            setLoadingHub(false);
            setLoadingNoticias(false);
            setLoadingConversaciones(false);
            return;
        }

        let mounted = true;

        const ordenarNoticias = (items: Noticia[]): Noticia[] => {
            return [...items].sort((a, b) => {
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
        };

        const ordenarConversaciones = (items: ConversacionComunidad[]): ConversacionComunidad[] => {
            return [...items].sort((a, b) => {
                const fechaA = a.ultimo_mensaje_at
                    ? new Date(a.ultimo_mensaje_at).getTime()
                    : a.fecha_actualizacion
                        ? new Date(a.fecha_actualizacion).getTime()
                        : a.fecha_creacion
                            ? new Date(a.fecha_creacion).getTime()
                            : 0;

                const fechaB = b.ultimo_mensaje_at
                    ? new Date(b.ultimo_mensaje_at).getTime()
                    : b.fecha_actualizacion
                        ? new Date(b.fecha_actualizacion).getTime()
                        : b.fecha_creacion
                            ? new Date(b.fecha_creacion).getTime()
                            : 0;

                return fechaB - fechaA;
            });
        };

        const cargarPerfil = async (): Promise<void> => {
            if (!isAuthenticated) return;

            try {
                const user = await UserAlumniService.loadPerfilCompleto();
                if (!mounted) return;
                setPerfil(user ?? null);
            } catch (error) {
                console.warn("No se pudo cargar el perfil del usuario en el hub:", error);
            }
        };

        const cargarHub = async (): Promise<void> => {
            setLoadingHub(true);
            setErrorHub("");

            try {
                let data: Comunidad | null = null;

                if (typeof (ComunidadService as any).getHub === "function") {
                    const hubResponse = await (ComunidadService as any).getHub(comunidadId);
                    data = hubResponse?.comunidad ?? hubResponse ?? null;
                } else if (typeof (ComunidadService as any).getById === "function") {
                    data = await (ComunidadService as any).getById(comunidadId);
                } else if (typeof (ComunidadService as any).get === "function") {
                    data = await (ComunidadService as any).get(comunidadId);
                }

                if (!mounted) return;
                setComunidad(data ?? null);
            } catch (error) {
                console.error("Error cargando comunidad hub:", error);
                if (!mounted) return;
                setErrorHub(getErrorMessage(error));
            } finally {
                if (mounted) {
                    setLoadingHub(false);
                }
            }
        };

        const cargarNoticias = async (): Promise<void> => {
            setLoadingNoticias(true);
            setErrorNoticias("");

            try {
                let items: Noticia[] = [];

                if (typeof (NoticiaService as any).list === "function") {
                    const response = await (NoticiaService as any).list();
                    items = Array.isArray(response) ? response : [];
                }

                const ahora = new Date().getTime();

                const filtradas = items.filter((item) => {
                    const esDeComunidad = Number(item.comunidad) === comunidadId;
                    const destinoOk = item.destino === "COMUNIDAD" || item.comunidad === comunidadId;
                    const publicada = item.publicado === true;

                    const inicio = item.fecha_inicio_publicacion
                        ? new Date(item.fecha_inicio_publicacion).getTime()
                        : null;

                    const fin = item.fecha_fin_publicacion
                        ? new Date(item.fecha_fin_publicacion).getTime()
                        : null;

                    const dentroVentana =
                        (inicio === null || inicio <= ahora) &&
                        (fin === null || fin >= ahora);

                    return esDeComunidad && destinoOk && publicada && dentroVentana;
                });

                if (!mounted) return;
                setNoticias(ordenarNoticias(filtradas));
            } catch (error) {
                console.error("Error cargando noticias de comunidad:", error);
                if (!mounted) return;
                setErrorNoticias(getErrorMessage(error));
            } finally {
                if (mounted) {
                    setLoadingNoticias(false);
                }
            }
        };

        const cargarConversaciones = async (): Promise<void> => {
            setLoadingConversaciones(true);
            setErrorConversaciones("");

            try {
                let items: ConversacionComunidad[] = [];

                if (typeof (ConversacionComunidadService as any).listByComunidad === "function") {
                    items = await (ConversacionComunidadService as any).listByComunidad(comunidadId);
                } else if (typeof (ConversacionComunidadService as any).list === "function") {
                    const response = await (ConversacionComunidadService as any).list();
                    items = (Array.isArray(response) ? response : []).filter(
                        (item) => Number(item.comunidad) === comunidadId
                    );
                }

                if (!mounted) return;
                setConversaciones(ordenarConversaciones(items).slice(0, 6));
            } catch (error) {
                console.error("Error cargando conversaciones del hub:", error);
                if (!mounted) return;
                setErrorConversaciones(getErrorMessage(error));
            } finally {
                if (mounted) {
                    setLoadingConversaciones(false);
                }
            }
        };

        void cargarPerfil();
        void cargarHub();
        void cargarNoticias();
        void cargarConversaciones();

        return () => {
            mounted = false;
        };
    }, [comunidadId, isAuthenticated]);

    const resumenStats = useMemo(
        () => [
            {
                label: "Miembros",
                value: comunidad?.total_miembros ?? 0,
                icon: <FaUsers />,
            },
            {
                label: "Conversaciones",
                value: comunidad?.total_conversaciones ?? conversaciones.length,
                icon: <FaComments />,
            },
            {
                label: "Noticias",
                value: comunidad?.total_noticias_publicadas ?? noticias.length,
                icon: <FaNewspaper />,
            },
        ],
        [comunidad, conversaciones.length, noticias.length]
    );

    const conversacionesPreview = useMemo(
        () => conversaciones.slice(0, 4),
        [conversaciones]
    );

    const puedeCrearConversacion = isAdmin || comunidad?.puede_crear_conversacion;
    const puedeCrearNoticia = isAdmin || comunidad?.puede_publicar_noticia;

    const handleCrearNoticia = () => {
        navigate(Routes.ADMIN.NOTICIAS.CREATE, {
            state: {
                comunidadId,
                origen: "comunidad_hub",
                destino: "COMUNIDAD",
            },
        });
    };

    const handleIrConversaciones = () => {
        navigate(Routes.COMUNIDAD.CONVERSACIONES_PARAM(comunidadId));
    };

    const handleAbrirConversacion = (conversacionId?: number) => {
        if (!conversacionId) return;
        navigate(Routes.COMUNIDAD.CONVERSACION_PARAM(comunidadId, conversacionId));
    };

    const imagenPortada = comunidad?.imagen_portada || placeholderImg;

    return (
        <div className="comunidad-hub-page">
            <section className="comunidad-hub-page__hero">
                <div className="comunidad-hub-page__heroOverlay" />

                <div className="container comunidad-hub-page__heroContainer">
                    {loadingHub ? (
                        <div className="comunidad-hub-page__loader">
                            <div className="comunidad-hub-page__spinner" />
                            <p>Cargando información del hub...</p>
                        </div>
                    ) : errorHub ? (
                        <div className="comunidad-hub-page__alert comunidad-hub-page__alert--error">
                            <strong>No se pudo cargar el hub.</strong>
                            <p>{errorHub}</p>
                        </div>
                    ) : comunidad ? (
                        <div className="comunidad-hub-page__heroGrid animate__animated animate__fadeIn">
                            <article className="comunidad-hub-page__heroMain">
                                <div className="comunidad-hub-page__badgeRow">
                                    <span className="comunidad-hub-page__badge">
                                        <FaPeopleGroup />
                                        <span>Hub de comunidad</span>
                                    </span>

                                    {comunidad.slug ? (
                                        <span className="comunidad-hub-page__badge comunidad-hub-page__badge--muted">
                                            @{comunidad.slug}
                                        </span>
                                    ) : null}

                                    {comunidad.pertenece_usuario_actual ? (
                                        <span className="comunidad-hub-page__badge comunidad-hub-page__badge--accent">
                                            <FaUserCheck />
                                            <span>Eres miembro</span>
                                        </span>
                                    ) : null}
                                </div>

                                <h1 className="comunidad-hub-page__title">
                                    {comunidad.nombre || "Comunidad Alumni"}
                                </h1>

                                <p className="comunidad-hub-page__description">
                                    {comunidad.descripcion?.trim() ||
                                        "Espacio de noticias, conversación y participación para la comunidad alumni."}
                                </p>

                                <div className="comunidad-hub-page__actions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--primary"
                                        onClick={handleIrConversaciones}
                                    >
                                        <FaDoorOpen />
                                        <span>Entrar al hub conversacional</span>
                                    </button>

                                    {isAuthenticated && puedeCrearConversacion && (
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--ghost"
                                            onClick={handleIrConversaciones}
                                        >
                                            <FaPlus />
                                            <span>Crear conversación</span>
                                        </button>
                                    )}

                                    {puedeCrearNoticia && (
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--outline"
                                            onClick={handleCrearNoticia}
                                        >
                                            <FaPlus />
                                            <span>Crear noticia</span>
                                        </button>
                                    )}
                                </div>
                            </article>

                            <article className="comunidad-hub-page__heroMedia">
                                <img
                                    src={imagenPortada}
                                    alt={comunidad.nombre || "Comunidad"}
                                    className="comunidad-hub-page__heroImage"
                                />
                            </article>

                            <article className="comunidad-hub-page__heroSide">
                                <h2 className="comunidad-hub-page__sideTitle">Resumen del hub</h2>

                                <div className="comunidad-hub-page__statsGrid">
                                    {resumenStats.map((item) => (
                                        <div key={item.label} className="comunidad-hub-page__statCard">
                                            <span className="comunidad-hub-page__statIcon">{item.icon}</span>
                                            <div>
                                                <strong>{item.value}</strong>
                                                <p>{item.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="comunidad-hub-page__metaBlock">
                                    <h3>Estado y capacidades</h3>

                                    <div className="comunidad-hub-page__chips">
                                        <span className="comunidad-hub-page__chip">
                                            {comunidad.activo ? "Comunidad activa" : "Comunidad inactiva"}
                                        </span>

                                        <span className="comunidad-hub-page__chip">
                                            {comunidad.total_conversaciones_abiertas ?? 0} abiertas
                                        </span>

                                        {comunidad.puede_crear_conversacion && (
                                            <span className="comunidad-hub-page__chip comunidad-hub-page__chip--accent">
                                                Puede crear conversación
                                            </span>
                                        )}

                                        {comunidad.puede_publicar_noticia && (
                                            <span className="comunidad-hub-page__chip comunidad-hub-page__chip--accent">
                                                Puede publicar noticia
                                            </span>
                                        )}
                                    </div>

                                    {perfil?.usuario?.carrera_nombre ? (
                                        <p className="comunidad-hub-page__metaText">
                                            Tu carrera actual: <strong>{perfil.usuario.carrera_nombre}</strong>
                                        </p>
                                    ) : null}
                                </div>
                            </article>
                        </div>
                    ) : (
                        <div className="comunidad-hub-page__empty">
                            <h2>Comunidad no encontrada</h2>
                            <p>No se encontró la información principal de esta comunidad.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="comunidad-hub-page__section">
                <div className="container">
                    {loadingNoticias ? (
                        <div className="comunidad-hub-page__loader">
                            <div className="comunidad-hub-page__spinner" />
                            <p>Cargando noticias de la comunidad...</p>
                        </div>
                    ) : (
                        <NoticiasBannerSection
                            noticias={noticias}
                            eyebrow="Noticias de la comunidad"
                            title={`Novedades de ${comunidad?.nombre || "la comunidad"}`}
                            subtitle="Este hub concentra noticias publicadas específicamente para esta comunidad, separadas del Home institucional."
                            emptyTitle="Sin noticias para esta comunidad"
                            emptyText="Todavía no existen noticias publicadas para este hub."
                            showContextFeatured={true}
                            showContextCompact={false}
                            onAdminAction={puedeCrearNoticia ? handleCrearNoticia : undefined}
                            onNavigateEvento={(noticia) => {
                                if (noticia.evento) {
                                    navigate(Routes.EVENTOS);
                                }
                            }}
                        />
                    )}

                    {errorNoticias && (
                        <div className="comunidad-hub-page__alert comunidad-hub-page__alert--warning">
                            <strong>No se cargaron completamente las noticias.</strong>
                            <p>{errorNoticias}</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="comunidad-hub-page__section comunidad-hub-page__section--soft">
                <div className="container">
                    <div className="comunidad-hub-page__sectionHeader">
                        <div>
                            <span className="comunidad-hub-page__eyebrow">Conversaciones</span>
                            <h2 className="comunidad-hub-page__sectionTitle">
                                Actividad reciente del hub
                            </h2>
                            <p className="comunidad-hub-page__sectionText">
                                Vista resumida de conversaciones recientes para entrar rápido al movimiento actual de la comunidad.
                            </p>
                        </div>

                        <div className="comunidad-hub-page__sectionActions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={handleIrConversaciones}
                            >
                                <FaComments />
                                <span>Ver todas</span>
                            </button>

                            {isAuthenticated && puedeCrearConversacion && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--outline"
                                    onClick={handleIrConversaciones}
                                >
                                    <FaPlus />
                                    <span>Nueva conversación</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {loadingConversaciones ? (
                        <div className="comunidad-hub-page__loader">
                            <div className="comunidad-hub-page__spinner" />
                            <p>Cargando conversaciones...</p>
                        </div>
                    ) : conversacionesPreview.length > 0 ? (
                        <div className="row g-4">
                            {conversacionesPreview.map((item) => {
                                const abierta = item.estado === "ABIERTA" || item.activa;

                                return (
                                    <div
                                        className="col-md-6 col-xl-3"
                                        key={item.id ?? `${item.titulo}-${item.fecha_creacion}`}
                                    >
                                        <article className="comunidad-hub-page__conversationCard animate__animated animate__fadeInUp">
                                            <div className="comunidad-hub-page__conversationTop">
                                                <span
                                                    className={`comunidad-hub-page__status ${
                                                        abierta
                                                            ? "comunidad-hub-page__status--open"
                                                            : "comunidad-hub-page__status--closed"
                                                    }`}
                                                >
                                                    {abierta ? <FaLockOpen /> : <FaLock />}
                                                    <span>{item.estado || (abierta ? "ABIERTA" : "CERRADA")}</span>
                                                </span>

                                                <span className="comunidad-hub-page__date">
                                                    {formatDate(
                                                        item.ultimo_mensaje_at ??
                                                            item.fecha_actualizacion ??
                                                            item.fecha_creacion
                                                    )}
                                                </span>
                                            </div>

                                            <h3 className="comunidad-hub-page__conversationTitle">
                                                {item.titulo || "Conversación"}
                                            </h3>

                                            <p className="comunidad-hub-page__conversationText">
                                                {truncate(item.descripcion, 150) ||
                                                    "Conversación disponible dentro del hub de comunidad."}
                                            </p>

                                            <div className="comunidad-hub-page__conversationMeta">
                                                {typeof item.total_mensajes === "number" ? (
                                                    <span>
                                                        <FaComments />
                                                        {item.total_mensajes} mensajes
                                                    </span>
                                                ) : null}

                                                {item.puede_escribir ? (
                                                    <span>
                                                        <FaBolt />
                                                        Puede escribir
                                                    </span>
                                                ) : null}

                                                {item.puede_cerrar || item.puede_reabrir ? (
                                                    <span>
                                                        <FaUserCheck />
                                                        Gestión permitida
                                                    </span>
                                                ) : null}
                                            </div>

                                            <button
                                                type="button"
                                                className="comunidad-hub-page__conversationAction"
                                                onClick={() => handleAbrirConversacion(item.id)}
                                            >
                                                <span>Abrir conversación</span>
                                                <FaArrowRight />
                                            </button>
                                        </article>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="comunidad-hub-page__empty comunidad-hub-page__empty--soft">
                            <h3>Sin conversaciones recientes</h3>
                            <p>Todavía no existen conversaciones visibles para este hub.</p>
                        </div>
                    )}

                    {errorConversaciones && (
                        <div className="comunidad-hub-page__alert comunidad-hub-page__alert--warning">
                            <strong>No se cargaron completamente las conversaciones.</strong>
                            <p>{errorConversaciones}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default ComunidadHubPage;