/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import "animate.css";
import {
    FaArrowLeft,
    FaCircleCheck,
    FaCircleExclamation,
    FaComments,
    FaLock,
    FaLockOpen,
    FaPaperPlane,
    FaPlug,
    FaRotateRight,
    FaTriangleExclamation,
    FaUserPen,
    FaUsers,
    FaWifi,
    FaWind,
} from "react-icons/fa6";

import "./ComunidadConversacionPage.css";

import { Routes } from "../../routes/CONSTANTS";
import { Comunidad } from "../../models/Comunidad/Comunidad";
import { ConversacionComunidad } from "../../models/Comunidad/ConversacionComunidad";
import { MensajeConversacion } from "../../models/Comunidad/MensajeConversacion";
import { UsuarioPerfil } from "../../models/Usuario/UsuarioPerfil";

import UserAlumniService from "../../services/alumni/UserAlumniService";
import { ComunidadService } from "../../services/alumni/ComunidadService";
import { ConversacionComunidadService } from "../../services/alumni/ConversacionComunidadService";
import { MensajeConversacionService } from "../../services/alumni/MensajeConversacionService";
import ConversationWebSocketService, {
    ConversationStatusEvent,
} from "../../services/alumni/ConversationWebSocketService";

const getErrorMessage = (error: unknown): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: { data?: unknown } }).response?.data
    ) {
        const data = (error as { response?: { data?: unknown } }).response?.data;

        if (typeof data === "string") return data;

        if (typeof data === "object" && data !== null) {
            const detail = (data as Record<string, unknown>).detail;
            if (typeof detail === "string") return detail;

            try {
                return JSON.stringify(data, null, 2);
            } catch {
                return "Ocurrió un error inesperado al procesar la respuesta.";
            }
        }
    }

    if (error instanceof Error) return error.message;

    return "Ocurrió un error inesperado.";
};

const normalizeText = (value?: string | null): string => value?.trim() ?? "";

const formatDateTime = (value?: string | null): string => {
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

type ConnectionStatus =
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "error"
    | "expired"
    | "forbidden"
    | "not-found"
    | "closed";

type ConversationStateAction = "closing" | "reopening" | null;

const ComunidadConversacionPage = () => {
    const params = useParams();
    const navigate = useNavigate();

    const comunidadIdRaw = params.comunidadId ?? params.id;
    const conversacionIdRaw = params.conversacionId;

    const comunidadId = Number(comunidadIdRaw);
    const conversationId = Number(conversacionIdRaw);

    const [perfil, setPerfil] = useState<UsuarioPerfil | null>(() =>
        UserAlumniService.getCachedPerfilCompleto()
    );
    const [comunidad, setComunidad] = useState<Comunidad | null>(null);
    const [conversacion, setConversacion] = useState<ConversacionComunidad | null>(null);
    const [mensajes, setMensajes] = useState<MensajeConversacion[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [sending, setSending] = useState<boolean>(false);
    const [pageError, setPageError] = useState<string>("");
    const [socketStatus, setSocketStatus] = useState<ConnectionStatus>("connecting");
    const [socketMessage, setSocketMessage] = useState<string>("");
    const [input, setInput] = useState<string>("");
    const [typingUserId, setTypingUserId] = useState<number | null>(null);
    const [stateAction, setStateAction] = useState<ConversationStateAction>(null);

    const socketServiceRef = useRef<ConversationWebSocketService | null>(null);
    const typingTimeoutRef = useRef<number | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const conversacionRef = useRef<ConversacionComunidad | null>(null);

    const usuario = perfil?.usuario ?? null;
    const usuarioId = usuario?.id ?? null;

    useEffect(() => {
        conversacionRef.current = conversacion;
    }, [conversacion]);

    const pertenece = useMemo(() => {
        if (!comunidad || !usuarioId) return false;

        if (typeof comunidad.pertenece_usuario_actual === "boolean") {
            return comunidad.pertenece_usuario_actual;
        }

        return (comunidad.usuarios ?? []).includes(usuarioId);
    }, [comunidad, usuarioId]);

    const estaAbierta = useMemo(() => {
        if (!conversacion) return false;
        return conversacion.estado === "ABIERTA" && conversacion.activa !== false;
    }, [conversacion]);

    const puedeEscribir = useMemo(() => {
        if (!conversacion) return false;
        return Boolean(conversacion.puede_escribir) && estaAbierta;
    }, [conversacion, estaAbierta]);

    const puedeCerrar = useMemo(() => {
        if (!conversacion) return false;
        return estaAbierta && Boolean(conversacion.puede_cerrar);
    }, [conversacion, estaAbierta]);

    const puedeReabrir = useMemo(() => {
        if (!conversacion) return false;
        return !estaAbierta && Boolean(conversacion.puede_reabrir);
    }, [conversacion, estaAbierta]);

    const mensajesOrdenados = useMemo(() => {
        return [...mensajes].sort((a, b) => {
            const fechaA = a.fecha_envio ? new Date(a.fecha_envio).getTime() : 0;
            const fechaB = b.fecha_envio ? new Date(b.fecha_envio).getTime() : 0;
            return fechaA - fechaB;
        });
    }, [mensajes]);

    const totalMiembros = comunidad?.total_miembros ?? comunidad?.usuarios?.length ?? 0;

    const scrollMessagesToBottom = (behavior: ScrollBehavior = "smooth") => {
        const container = messagesContainerRef.current;
        if (!container) return;

        requestAnimationFrame(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior,
            });
        });
    };

    const mergeMensaje = (nuevoMensaje: MensajeConversacion) => {
        setMensajes((prev) => {
            const exists = prev.some((item) => item.id === nuevoMensaje.id);
            if (exists) {
                return prev.map((item) =>
                    item.id === nuevoMensaje.id ? { ...item, ...nuevoMensaje } : item
                );
            }
            return [...prev, nuevoMensaje];
        });
    };

    const clearTypingIndicator = () => {
        setTypingUserId(null);
        if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    };

    const closeSocket = () => {
        socketServiceRef.current?.disconnect();
        socketServiceRef.current = null;
        clearTypingIndicator();
    };

    const syncConversationState = (
        nextConversation: ConversacionComunidad,
        detail?: string
    ) => {
        setConversacion(nextConversation);

        const nextIsOpen =
            nextConversation.estado === "ABIERTA" && nextConversation.activa !== false;

        if (detail) {
            setSocketMessage(detail);
        } else if (!nextIsOpen) {
            setSocketMessage("La conversación fue cerrada. Solo queda disponible para lectura.");
        } else {
            setSocketMessage("La conversación fue reabierta y vuelve a admitir mensajes.");
        }

        if (!nextIsOpen) {
            setSocketStatus("closed");
            closeSocket();
        } else {
            setSocketStatus("reconnecting");
        }
    };

    const handleSocketEstado = (event: ConversationStatusEvent) => {
        const estado = event?.estado;
        const detail = event?.detail ?? "";

        if (detail) {
            setSocketMessage(detail);
        }

        if (estado === "CERRADA") {
            setConversacion((prev) =>
                prev
                    ? {
                          ...prev,
                          estado: "CERRADA",
                          activa: true,
                          puede_escribir: false,
                          puede_cerrar: false,
                          puede_reabrir: true,
                      }
                    : prev
            );
            setSocketStatus("closed");
            closeSocket();
            return;
        }

        if (estado === "ABIERTA") {
            setConversacion((prev) =>
                prev
                    ? {
                          ...prev,
                          estado: "ABIERTA",
                          activa: true,
                          puede_escribir: true,
                          puede_cerrar: true,
                          puede_reabrir: false,
                      }
                    : prev
            );
            setSocketStatus("connected");
            setSocketMessage("La conversación volvió a estar disponible en tiempo real.");
        }
    };

    const connectSocket = () => {
        closeSocket();

        if (!Number.isFinite(conversationId) || conversationId <= 0) {
            setSocketStatus("error");
            setSocketMessage("El identificador de la conversación no es válido.");
            return;
        }

        const conversacionActual = conversacionRef.current;
        const abierta =
            conversacionActual?.estado === "ABIERTA" && conversacionActual?.activa !== false;

        if (!abierta) {
            setSocketStatus("closed");
            setSocketMessage("La conversación está cerrada. El chat permanece en modo lectura.");
            return;
        }

        const service = new ConversationWebSocketService();
        socketServiceRef.current = service;

        setSocketStatus((prev) => (prev === "disconnected" ? "reconnecting" : "connecting"));
        setSocketMessage("Conectando conversación en tiempo real...");

        service.connect(conversationId, {
            onOpen: () => {
                const currentConversation = conversacionRef.current;
                const isOpen =
                    currentConversation?.estado === "ABIERTA" &&
                    currentConversation?.activa !== false;

                if (isOpen) {
                    setSocketStatus("connected");
                    setSocketMessage("Canal en tiempo real conectado.");
                } else {
                    setSocketStatus("closed");
                    setSocketMessage(
                        "La conversación está cerrada. El chat permanece en modo lectura."
                    );
                    closeSocket();
                }
            },
            onMensaje: (mensaje) => {
                mergeMensaje(mensaje);
                setConversacion((prev) =>
                    prev
                        ? {
                              ...prev,
                              ultimo_mensaje_at: mensaje.fecha_envio ?? prev.ultimo_mensaje_at,
                              total_mensajes: Math.max(
                                  (prev.total_mensajes ?? 0) + 1,
                                  mensajes.length + 1
                              ),
                          }
                        : prev
                );
            },
            onEscribiendo: (userId) => {
                if (typeof userId === "number" && userId !== usuarioId) {
                    setTypingUserId(userId);

                    if (typingTimeoutRef.current) {
                        window.clearTimeout(typingTimeoutRef.current);
                    }

                    typingTimeoutRef.current = window.setTimeout(() => {
                        setTypingUserId(null);
                    }, 1800);
                }
            },
            onEstadoConversacion: handleSocketEstado,
            onAuthExpired: () => {
                setSocketStatus("expired");
                setSocketMessage("La sesión del socket expiró. Intenta reconectar.");
            },
            onForbidden: () => {
                setSocketStatus("forbidden");
                setSocketMessage("No tienes permisos para acceder a esta conversación.");
            },
            onNotFound: () => {
                setSocketStatus("not-found");
                setSocketMessage("La conversación no existe o no está disponible.");
            },
            onConversationUnavailable: () => {
                setSocketStatus("closed");
                setSocketMessage("La conversación no admite nuevos mensajes en este momento.");
                closeSocket();
            },
            onError: () => {
                setSocketStatus("error");
                setSocketMessage("Ocurrió un error en la conexión del WebSocket.");
            },
            onClose: () => {
                setSocketStatus((prev) => {
                    if (prev === "closed") return prev;
                    if (prev === "forbidden" || prev === "not-found" || prev === "expired") {
                        return prev;
                    }
                    return "disconnected";
                });
            },
        });
    };

    const cargarPagina = async (silent = false): Promise<void> => {
        if (
            !Number.isFinite(comunidadId) ||
            comunidadId <= 0 ||
            !Number.isFinite(conversationId) ||
            conversationId <= 0
        ) {
            setPageError("Los identificadores de comunidad o conversación no son válidos.");
            setLoading(false);
            return;
        }

        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setPageError("");

        try {
            const [perfilData, comunidadData, conversacionData, mensajesData] = await Promise.all([
                UserAlumniService.loadPerfilCompleto(false),
                ComunidadService.get(comunidadId),
                ConversacionComunidadService.get(conversationId),
                MensajeConversacionService.list({
                    conversacion: conversationId,
                    ordering: "fecha_envio",
                }),
            ]);

            if (conversacionData?.comunidad !== comunidadId) {
                throw new Error("La conversación no pertenece a la comunidad solicitada.");
            }

            setPerfil(perfilData ?? null);
            setComunidad(comunidadData ?? null);
            setConversacion(conversacionData ?? null);
            setMensajes(mensajesData ?? []);

            if (silent) {
                setSocketMessage("Datos actualizados sin recargar toda la vista.");
            }
        } catch (err) {
            console.error("Error al cargar la conversación:", err);
            const message = getErrorMessage(err);

            if (silent) {
                setSocketMessage(message);
            } else {
                setPageError(message);
            }
        } finally {
            if (silent) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        void cargarPagina();
    }, [comunidadId, conversationId]);

    useEffect(() => {
        if (!loading && !pageError && conversacion) {
            if (conversacion.estado === "ABIERTA" && conversacion.activa !== false) {
                connectSocket();
            } else {
                closeSocket();
                setSocketStatus("closed");
                setSocketMessage("La conversación está cerrada. El chat permanece en modo lectura.");
            }
        }

        return () => {
            closeSocket();
        };
    }, [loading, pageError, conversacion?.id, conversacion?.estado, conversacion?.activa]);

    useEffect(() => {
        scrollMessagesToBottom("auto");
    }, [mensajesOrdenados.length, typingUserId]);

    const handleSendMessage = async () => {
        const contenido = normalizeText(input);

        if (!contenido || sending) return;

        if (!puedeEscribir || !estaAbierta) {
            setSocketStatus("closed");
            setSocketMessage("La conversación está cerrada o no tienes permiso para escribir.");
            return;
        }

        if (!socketServiceRef.current || !socketServiceRef.current.isConnected()) {
            setSocketStatus("error");
            setSocketMessage("El socket no está conectado. Intenta reconectar.");
            return;
        }

        try {
            setSending(true);
            socketServiceRef.current.sendMessage(contenido);
            setInput("");
        } catch (error) {
            setSocketStatus("error");
            setSocketMessage(getErrorMessage(error));
        } finally {
            setSending(false);
        }
    };

    const handleTyping = (value: string) => {
        setInput(value);

        if (value.trim().length > 0) {
            try {
                socketServiceRef.current?.sendTyping();
            } catch {
                //
            }
        }
    };

    const handleCerrarConversacion = async () => {
        if (!conversacion?.id || !puedeCerrar || stateAction) return;

        try {
            setStateAction("closing");

            const actualizada = await ConversacionComunidadService.cerrar(conversacion.id);

            syncConversationState(
                {
                    ...actualizada,
                    estado: "CERRADA",
                    activa: true,
                    puede_escribir: false,
                    puede_cerrar: false,
                    puede_reabrir: true,
                },
                "La conversación fue cerrada correctamente."
            );

            setInput("");
            clearTypingIndicator();
        } catch (error) {
            setSocketMessage(getErrorMessage(error));
        } finally {
            setStateAction(null);
        }
    };

    const handleReabrirConversacion = async () => {
        if (!conversacion?.id || !puedeReabrir || stateAction) return;

        try {
            setStateAction("reopening");

            const actualizada = await ConversacionComunidadService.reabrir(conversacion.id);

            const actualizadaNormalizada: ConversacionComunidad = {
                ...actualizada,
                estado: "ABIERTA",
                activa: true,
                puede_escribir: true,
                puede_cerrar: true,
                puede_reabrir: false,
            };

            syncConversationState(
                actualizadaNormalizada,
                "La conversación fue reabierta correctamente."
            );

            setTimeout(() => {
                connectSocket();
            }, 50);
        } catch (error) {
            setSocketMessage(getErrorMessage(error));
        } finally {
            setStateAction(null);
        }
    };

    const handleRefreshConversation = async () => {
        if (refreshing || loading) return;
        await cargarPagina(true);
    };

    const getConnectionBadge = () => {
        switch (socketStatus) {
            case "connected":
                return {
                    icon: <FaWifi />,
                    text: "Conectado",
                    className: "comunidad-conversacion__status comunidad-conversacion__status--ok",
                };
            case "connecting":
            case "reconnecting":
                return {
                    icon: <FaRotateRight />,
                    text: socketStatus === "reconnecting" ? "Reconectando" : "Conectando",
                    className: "comunidad-conversacion__status comunidad-conversacion__status--warn",
                };
            case "closed":
                return {
                    icon: <FaLock />,
                    text: "Cerrada",
                    className: "comunidad-conversacion__status comunidad-conversacion__status--closed",
                };
            case "forbidden":
                return {
                    icon: <FaTriangleExclamation />,
                    text: "Sin acceso",
                    className: "comunidad-conversacion__status comunidad-conversacion__status--error",
                };
            case "expired":
                return {
                    icon: <FaWind />,
                    text: "Sesión expirada",
                    className: "comunidad-conversacion__status comunidad-conversacion__status--error",
                };
            case "not-found":
                return {
                    icon: <FaTriangleExclamation />,
                    text: "No encontrada",
                    className: "comunidad-conversacion__status comunidad-conversacion__status--error",
                };
            default:
                return {
                    icon: <FaWind />,
                    text: "Desconectado",
                    className: "comunidad-conversacion__status comunidad-conversacion__status--error",
                };
        }
    };

    const connectionBadge = getConnectionBadge();

    if (loading) {
        return (
            <div className="comunidad-conversacion-page">
                <div className="container py-5">
                    <div className="comunidad-conversacion-state animate__animated animate__fadeIn">
                        <Spinner animation="border" role="status" />
                        <h3>Cargando conversación</h3>
                        <p className="mb-0">
                            Estamos preparando el historial y la conexión en tiempo real.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (pageError || !comunidad || !conversacion) {
        return (
            <div className="comunidad-conversacion-page">
                <div className="container py-5">
                    <div className="comunidad-conversacion-state comunidad-conversacion-state--error animate__animated animate__fadeIn">
                        <FaTriangleExclamation />
                        <h3>No fue posible cargar la conversación</h3>
                        <p>{pageError || "La conversación solicitada no está disponible."}</p>

                        <div className="comunidad-conversacion-state__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() =>
                                    Number.isFinite(comunidadId) && comunidadId > 0
                                        ? navigate(Routes.COMUNIDAD.CONVERSACIONES_PARAM(comunidadId))
                                        : navigate(Routes.COMUNIDAD.HOME)
                                }
                            >
                                <FaArrowLeft />
                                <span>Volver a conversaciones</span>
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={() => void cargarPagina()}
                            >
                                <FaRotateRight />
                                <span>Reintentar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="comunidad-conversacion-page">
            <section className="comunidad-conversacion-hero animate__animated animate__fadeIn">
                <div className="container">
                    <div className="comunidad-conversacion-hero__top">
                        <div className="comunidad-conversacion-hero__left">
                            <span className="comunidad-conversacion-hero__eyebrow">
                                <FaComments />
                                Conversación en tiempo real
                            </span>

                            <h1 className="comunidad-conversacion-hero__title">
                                {conversacion.titulo}
                            </h1>

                            <p className="comunidad-conversacion-hero__text">
                                {normalizeText(conversacion.descripcion) ||
                                    "Espacio temático de intercambio dentro de la comunidad Alumni."}
                            </p>

                            <div className="comunidad-conversacion-hero__chips">
                                <span className="comunidad-conversacion-hero__chip">
                                    <FaUsers />
                                    {totalMiembros} miembro{totalMiembros !== 1 ? "s" : ""}
                                </span>

                                <span className="comunidad-conversacion-hero__chip comunidad-conversacion-hero__chip--soft">
                                    {estaAbierta ? <FaLockOpen /> : <FaLock />}
                                    {estaAbierta ? "Abierta" : "Cerrada"}
                                </span>

                                <span className={connectionBadge.className}>
                                    {connectionBadge.icon}
                                    <span>{connectionBadge.text}</span>
                                </span>
                            </div>
                        </div>

                        <div className="comunidad-conversacion-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost-light"
                                onClick={() =>
                                    navigate(Routes.COMUNIDAD.CONVERSACIONES_PARAM(comunidadId))
                                }
                            >
                                <FaArrowLeft />
                                <span>Volver a conversaciones</span>
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost-light"
                                onClick={() => void handleRefreshConversation()}
                                disabled={refreshing || stateAction !== null}
                            >
                                {refreshing ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Actualizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaRotateRight />
                                        <span>Actualizar chat</span>
                                    </>
                                )}
                            </button>

                            {puedeCerrar && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--secondary"
                                    onClick={() => void handleCerrarConversacion()}
                                    disabled={stateAction !== null || refreshing}
                                >
                                    {stateAction === "closing" ? (
                                        <>
                                            <Spinner size="sm" />
                                            <span>Cerrando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaLock />
                                            <span>Cerrar conversación</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {puedeReabrir && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={() => void handleReabrirConversacion()}
                                    disabled={stateAction !== null || refreshing}
                                >
                                    {stateAction === "reopening" ? (
                                        <>
                                            <Spinner size="sm" />
                                            <span>Reabriendo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaLockOpen />
                                            <span>Reabrir conversación</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {estaAbierta && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--secondary"
                                    onClick={connectSocket}
                                    disabled={stateAction !== null || refreshing}
                                >
                                    <FaPlug />
                                    <span>Reconectar socket</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="comunidad-conversacion-content">
                <div className="container">
                    <div className="comunidad-conversacion-layout">
                        <aside className="comunidad-conversacion-side animate__animated animate__fadeInLeft">
                            <div className="comunidad-conversacion-sideCard">
                                <h3>Resumen</h3>

                                <div className="comunidad-conversacion-sideCard__list">
                                    <div className="comunidad-conversacion-sideCard__item">
                                        <span className="label">Comunidad</span>
                                        <span className="value">{comunidad.nombre}</span>
                                    </div>

                                    <div className="comunidad-conversacion-sideCard__item">
                                        <span className="label">Mensajes cargados</span>
                                        <span className="value">{mensajesOrdenados.length}</span>
                                    </div>

                                    <div className="comunidad-conversacion-sideCard__item">
                                        <span className="label">Estado</span>
                                        <span className="value">
                                            {estaAbierta ? "ABIERTA" : "CERRADA"}
                                        </span>
                                    </div>

                                    <div className="comunidad-conversacion-sideCard__item">
                                        <span className="label">Puedes escribir</span>
                                        <span className="value">{puedeEscribir ? "Sí" : "No"}</span>
                                    </div>

                                    <div className="comunidad-conversacion-sideCard__item">
                                        <span className="label">Gestión</span>
                                        <span className="value">
                                            {puedeCerrar
                                                ? "Puedes cerrar"
                                                : puedeReabrir
                                                  ? "Puedes reabrir"
                                                  : "Solo lectura"}
                                        </span>
                                    </div>

                                    <div className="comunidad-conversacion-sideCard__item">
                                        <span className="label">Última actividad</span>
                                        <span className="value">
                                            {formatDateTime(
                                                conversacion.ultimo_mensaje_at ||
                                                    conversacion.fecha_creacion
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {socketMessage && (
                                <div className="comunidad-conversacion-sideCard comunidad-conversacion-sideCard--notice">
                                    <h3>Estado del canal</h3>
                                    <p>{socketMessage}</p>
                                </div>
                            )}
                        </aside>

                        <div className="comunidad-conversacion-chat animate__animated animate__fadeInUp">
                            <div className="comunidad-conversacion-chat__header">
                                <div>
                                    <h2>Mensajes</h2>
                                    <p>
                                        Vista conectada al nuevo flujo por conversación con
                                        WebSocket específico por sala.
                                    </p>
                                </div>

                                <div className="comunidad-conversacion-chat__badges">
                                    <span className="comunidad-conversacion-chat__badge">
                                        <FaCircleCheck />
                                        {pertenece ? "Miembro validado" : "Sin membresía detectada"}
                                    </span>
                                </div>
                            </div>

                            <div
                                ref={messagesContainerRef}
                                className="comunidad-conversacion-chat__messages"
                            >
                                {mensajesOrdenados.length === 0 ? (
                                    <div className="comunidad-conversacion-chat__empty">
                                        <FaComments />
                                        <h3>Aún no hay mensajes</h3>
                                        <p>
                                            {puedeEscribir
                                                ? "Esta conversación todavía no tiene actividad. Envía el primer mensaje para probar el canal en tiempo real."
                                                : "Esta conversación todavía no tiene actividad y actualmente está en modo lectura."}
                                        </p>
                                    </div>
                                ) : (
                                    mensajesOrdenados.map((mensaje) => {
                                        const isMine = mensaje.autor_id === usuarioId;

                                        return (
                                            <article
                                                key={
                                                    mensaje.id ??
                                                    `${mensaje.fecha_envio}-${mensaje.contenido}`
                                                }
                                                className={`comunidad-conversacion-message ${
                                                    isMine
                                                        ? "comunidad-conversacion-message--mine"
                                                        : "comunidad-conversacion-message--other"
                                                }`}
                                            >
                                                <div className="comunidad-conversacion-message__meta">
                                                    <span className="author">
                                                        {isMine
                                                            ? "Tú"
                                                            : `Usuario ${mensaje.autor_id ?? "?"}`}
                                                    </span>
                                                    <span className="date">
                                                        {formatDateTime(mensaje.fecha_envio)}
                                                    </span>
                                                </div>

                                                <div className="comunidad-conversacion-message__bubble">
                                                    <p>{mensaje.contenido || "Mensaje sin contenido."}</p>
                                                </div>
                                            </article>
                                        );
                                    })
                                )}

                                {typingUserId && typingUserId !== usuarioId && (
                                    <div className="comunidad-conversacion-typing">
                                        <FaUserPen />
                                        <span>El usuario {typingUserId} está escribiendo...</span>
                                    </div>
                                )}
                            </div>

                            <div className="comunidad-conversacion-chat__composer">
                                {!estaAbierta || !puedeEscribir ? (
                                    <div className="comunidad-conversacion-chat__blocked">
                                        <FaCircleExclamation />
                                        <span>
                                            {!estaAbierta
                                                ? "La conversación está cerrada. Solo se permite lectura hasta que se reabra."
                                                : "Tu usuario no tiene permiso de escritura en esta conversación."}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <textarea
                                            className="comunidad-conversacion-chat__input"
                                            rows={3}
                                            value={input}
                                            onChange={(e) => handleTyping(e.target.value)}
                                            placeholder="Escribe un mensaje para probar el WebSocket nuevo..."
                                            disabled={
                                                socketStatus !== "connected" ||
                                                sending ||
                                                refreshing ||
                                                stateAction !== null
                                            }
                                        />

                                        <div className="comunidad-conversacion-chat__actions">
                                            <small>
                                                Esta iteración inicial envía texto en tiempo real. Los
                                                adjuntos se integran después.
                                            </small>

                                            <button
                                                type="button"
                                                className="nur-btn nur-btn--primary"
                                                onClick={() => void handleSendMessage()}
                                                disabled={
                                                    sending ||
                                                    refreshing ||
                                                    stateAction !== null ||
                                                    socketStatus !== "connected" ||
                                                    normalizeText(input).length === 0
                                                }
                                            >
                                                {sending ? (
                                                    <>
                                                        <Spinner size="sm" />
                                                        <span>Enviando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaPaperPlane />
                                                        <span>Enviar</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ComunidadConversacionPage;