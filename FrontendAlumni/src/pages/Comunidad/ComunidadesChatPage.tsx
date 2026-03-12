import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "animate.css";
import "./ComunidadesChatPage.css";

import {
    FaArrowDown,
    // FaCircleCheck,
    FaCircleDot,
    FaFileArrowDown,
    FaImage,
    FaPaperclip,
    FaPaperPlane,
    // FaPen,
    FaPeopleGroup,
    FaTriangleExclamation,
    // FaUser,
    FaUsers,
    FaWifi,
    FaXmark,
} from "react-icons/fa6";

import { MensajeComunidad } from "../../models/Comunidad/MensajeComunidad";
import { Comunidad } from "../../models/Comunidad/Comunidad";
import { Usuario } from "../../models/Usuario/Usuario";
import { MensajeComunidadService } from "../../services/alumni/MensajeComunidadService";
import { ComunidadService } from "../../services/alumni/ComunidadService";
import UserAlumniService from "../../services/alumni/UserAlumniService";
import { ComunidadWebSocketService } from "../../services/alumni/ComunidadWebSocketService";

const TYPING_VISIBLE_MS = 2500;
const TYPING_THROTTLE_MS = 2500;
const BOTTOM_THRESHOLD_PX = 120;

type MiembrosDetalleResponse =
    | { usuarios: Usuario[] }
    | { usuarios: { encontrados?: Usuario[]; faltantes?: number[] } };

const normalizeUsuarios = (payload: MiembrosDetalleResponse["usuarios"]): Usuario[] => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && Array.isArray(payload.encontrados)) {
        return payload.encontrados;
    }

    return [];
};

const dedupeMensajes = (mensajes: MensajeComunidad[]): MensajeComunidad[] => {
    const seen = new Set<number>();
    const resultado: MensajeComunidad[] = [];

    for (const mensaje of mensajes) {
        if (typeof mensaje.id === "number") {
            if (seen.has(mensaje.id)) continue;
            seen.add(mensaje.id);
        }
        resultado.push(mensaje);
    }

    return resultado;
};

const buildUsuariosMap = (usuarios: Usuario[]): Record<number, Usuario> => {
    return usuarios.reduce<Record<number, Usuario>>((acc, usuario) => {
        if (typeof usuario.id === "number") {
            acc[usuario.id] = usuario;
        }
        return acc;
    }, {});
};

const appendMensajeSeguro = (
    prev: MensajeComunidad[],
    nuevo: MensajeComunidad
): MensajeComunidad[] => {
    if (typeof nuevo.id === "number" && prev.some((m) => m.id === nuevo.id)) {
        return prev;
    }

    return [...prev, nuevo].sort((a, b) => {
        const fa = a.fecha_envio ? new Date(a.fecha_envio).getTime() : 0;
        const fb = b.fecha_envio ? new Date(b.fecha_envio).getTime() : 0;
        return fa - fb;
    });
};

const formatDateTime = (value?: string): string => {
    if (!value) return "";
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

const getUserDisplayName = (usuario?: Usuario | null): string => {
    if (!usuario) return "Usuario";

    const firstName = usuario.user?.first_name?.trim() ?? "";
    const lastName = usuario.user?.last_name?.trim() ?? "";
    const username = usuario.user?.username?.trim() ?? "";

    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || username || `Usuario ${usuario.id ?? ""}`.trim();
};

const getInitials = (name: string): string => {
    const parts = name
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) return "U";
    return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const getAttachmentLabel = (mensaje: MensajeComunidad): string => {
    if (mensaje.archivo) return "Archivo adjunto";
    if (mensaje.imagen) return "Imagen adjunta";
    return "Adjunto";
};

const ComunidadesChatPage: React.FC = () => {
    const { id } = useParams();
    const comunidadId = Number(id);

    const [archivo, setArchivo] = useState<File | null>(null);
    const [imagen, setImagen] = useState<File | null>(null);
    const [archivoNombre, setArchivoNombre] = useState("");

    const [enviando, setEnviando] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [wsConectado, setWsConectado] = useState(false);

    const [comunidad, setComunidad] = useState<Comunidad | null>(null);
    const [integrantes, setIntegrantes] = useState<Usuario[]>([]);
    const [usuariosMap, setUsuariosMap] = useState<Record<number, Usuario>>({});
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [mensajes, setMensajes] = useState<MensajeComunidad[]>([]);
    const [contenido, setContenido] = useState("");
    const [error, setError] = useState("");
    const [usuarioEscribiendoId, setUsuarioEscribiendoId] = useState<number | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const socketServiceRef = useRef<ComunidadWebSocketService | null>(null);
    const typingHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldAutoScrollRef = useRef(true);
    const didInitialScrollRef = useRef(false);

    const archivos = useMemo(
        () => mensajes.filter((m) => m.archivo || m.imagen),
        [mensajes]
    );

    const usuarioEscribiendoNombre = useMemo(() => {
        if (!usuarioEscribiendoId) return "";
        const user = usuariosMap[usuarioEscribiendoId];
        return getUserDisplayName(user);
    }, [usuarioEscribiendoId, usuariosMap]);

    const comunidadNombre = comunidad?.nombre || "Chat de comunidad";
    const totalMiembros = integrantes.length;
    const totalMensajes = mensajes.length;
    const totalAdjuntos = archivos.length;
    const tieneAdjuntoSeleccionado = Boolean(archivo || imagen);

    const scrollToBottom = (behavior: ScrollBehavior = "smooth"): void => {
        chatEndRef.current?.scrollIntoView({ behavior, block: "end" });
    };

    const actualizarEstadoScroll = (): void => {
        const container = chatContainerRef.current;
        if (!container) return;

        const distanceToBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;

        shouldAutoScrollRef.current = distanceToBottom <= BOTTOM_THRESHOLD_PX;
    };

    const cargarDatosIniciales = async (): Promise<void> => {
        if (!Number.isFinite(comunidadId) || comunidadId <= 0) {
            setError("ID de comunidad inválido.");
            setCargando(false);
            setCargandoInicial(false);
            return;
        }

        setCargando(true);
        setError("");

        try {
            const perfil = await UserAlumniService.loadPerfilCompleto();
            const usuarioActual = perfil?.usuario ?? null;

            if (!usuarioActual?.id) {
                setError("No se pudo identificar al usuario autenticado.");
                setCargando(false);
                setCargandoInicial(false);
                return;
            }

            setUsuario(usuarioActual);

            const [comunidadData, miembrosResp, mensajesData] = await Promise.all([
                ComunidadService.get(comunidadId),
                ComunidadService.miembrosDetalle(comunidadId) as Promise<MiembrosDetalleResponse>,
                MensajeComunidadService.listByComunidad(comunidadId),
            ]);

            const miembros = normalizeUsuarios(miembrosResp.usuarios);

            setComunidad(comunidadData);
            setIntegrantes(miembros);
            setUsuariosMap(buildUsuariosMap(miembros));
            setMensajes(dedupeMensajes(mensajesData));
        } catch (err) {
            console.error("Error al cargar la página del chat:", err);
            setError("No se pudo cargar el chat de la comunidad.");
        } finally {
            setCargando(false);
            setCargandoInicial(false);
        }
    };

    useEffect(() => {
        void cargarDatosIniciales();

        return () => {
            socketServiceRef.current?.disconnect();

            if (typingHideTimeoutRef.current) {
                clearTimeout(typingHideTimeoutRef.current);
            }

            if (typingThrottleRef.current) {
                clearTimeout(typingThrottleRef.current);
            }
        };
    }, [comunidadId]);

    useEffect(() => {
        if (!usuario?.id || !comunidadId || error) {
            return;
        }

        const socketService = new ComunidadWebSocketService();
        socketServiceRef.current = socketService;

        try {
            socketService.connect(comunidadId, {
                onOpen: () => {
                    setWsConectado(true);
                },
                onClose: () => {
                    setWsConectado(false);
                },
                onError: (event) => {
                    console.error("Error de WebSocket:", event);
                    setWsConectado(false);
                },
                onMensaje: (mensaje) => {
                    setMensajes((prev) => appendMensajeSeguro(prev, mensaje));
                },
                onEscribiendo: (userId) => {
                    if (!userId || userId === usuario.id) {
                        return;
                    }

                    setUsuarioEscribiendoId(userId);

                    if (typingHideTimeoutRef.current) {
                        clearTimeout(typingHideTimeoutRef.current);
                    }

                    typingHideTimeoutRef.current = setTimeout(() => {
                        setUsuarioEscribiendoId(null);
                    }, TYPING_VISIBLE_MS);
                },
            });
        } catch (wsError) {
            console.error("No se pudo inicializar el WebSocket:", wsError);
            setWsConectado(false);
        }

        return () => {
            socketService.disconnect();
        };
    }, [comunidadId, usuario?.id, error]);

    useEffect(() => {
        if (cargandoInicial || mensajes.length === 0) {
            return;
        }

        if (!didInitialScrollRef.current) {
            didInitialScrollRef.current = true;
            scrollToBottom("auto");
            return;
        }

        if (shouldAutoScrollRef.current) {
            scrollToBottom("smooth");
        }
    }, [mensajes, cargandoInicial]);

    const handleTyping = (): void => {
        if (typingThrottleRef.current) {
            return;
        }

        socketServiceRef.current?.enviarEscribiendo();
        typingThrottleRef.current = setTimeout(() => {
            typingThrottleRef.current = null;
        }, TYPING_THROTTLE_MS);
    };

    const limpiarAdjunto = (): void => {
        setArchivo(null);
        setImagen(null);
        setArchivoNombre("");
    };

    const handleSend = async (): Promise<void> => {
        if (!usuario?.id || enviando) {
            return;
        }

        const texto = contenido.trim();
        const hayTexto = texto.length > 0;
        const hayAdjunto = Boolean(archivo || imagen);

        if (!hayTexto && !hayAdjunto) {
            return;
        }

        setEnviando(true);

        try {
            if (hayAdjunto) {
                const formData = new FormData();
                formData.append("comunidad", String(comunidadId));
                formData.append("contenido", texto);

                if (archivo) {
                    formData.append("archivo", archivo);
                }

                if (imagen) {
                    formData.append("imagen", imagen);
                }

                const creado = await MensajeComunidadService.create(formData);
                setMensajes((prev) => appendMensajeSeguro(prev, creado));
            } else if (socketServiceRef.current?.isOpen()) {
                socketServiceRef.current.enviarMensaje(texto);
            } else {
                const creado = await MensajeComunidadService.create({
                    comunidad: comunidadId,
                    contenido: texto,
                });
                setMensajes((prev) => appendMensajeSeguro(prev, creado));
            }

            setContenido("");
            limpiarAdjunto();
            setUsuarioEscribiendoId(null);
        } catch (err) {
            console.error("Error al enviar mensaje:", err);
        } finally {
            setEnviando(false);
        }
    };

    if (cargando) {
        return (
            <div className="comunidad-chat-page">
                <div className="container py-5">
                    <div className="comunidad-chat-state animate__animated animate__fadeIn">
                        <div className="spinner-border text-warning" role="status" />
                        <h3>Cargando chat de la comunidad</h3>
                        <p className="mb-0">
                            Estamos recuperando mensajes, miembros y estado de conexión.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="comunidad-chat-page">
                <div className="container py-5">
                    <div className="comunidad-chat-state comunidad-chat-state--error animate__animated animate__fadeIn">
                        <FaTriangleExclamation />
                        <h3>No fue posible cargar el chat</h3>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="comunidad-chat-page">
            <section className="comunidad-chat-hero animate__animated animate__fadeIn">
                <div className="container">
                    <div className="comunidad-chat-hero__grid">
                        <div className="comunidad-chat-hero__content">
                            <span className="comunidad-chat-hero__eyebrow">
                                <FaPeopleGroup />
                                Comunidad Alumni NUR
                            </span>

                            <h1 className="comunidad-chat-hero__title">{comunidadNombre}</h1>

                            <p className="comunidad-chat-hero__text">
                                Conversa en tiempo real, comparte archivos e imágenes y mantén la
                                interacción activa con los miembros de tu comunidad.
                            </p>

                            <div className="comunidad-chat-hero__chips">
                                <span className="comunidad-chat-hero__chip">
                                    <FaUsers />
                                    {totalMiembros} miembro{totalMiembros !== 1 ? "s" : ""}
                                </span>

                                <span className="comunidad-chat-hero__chip comunidad-chat-hero__chip--soft">
                                    <FaPaperPlane />
                                    {totalMensajes} mensaje{totalMensajes !== 1 ? "s" : ""}
                                </span>

                                <span className="comunidad-chat-hero__chip comunidad-chat-hero__chip--soft">
                                    <FaPaperclip />
                                    {totalAdjuntos} adjunto{totalAdjuntos !== 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>

                        <div className="comunidad-chat-hero__statusCard">
                            <div className="comunidad-chat-hero__statusTop">
                                <span className="comunidad-chat-hero__statusLabel">Conectividad</span>
                                <span
                                    className={`comunidad-chat-hero__statusBadge ${
                                        wsConectado
                                            ? "comunidad-chat-hero__statusBadge--online"
                                            : "comunidad-chat-hero__statusBadge--offline"
                                    }`}
                                >
                                    <FaWifi />
                                    {wsConectado ? "WebSocket activo" : "Sin socket"}
                                </span>
                            </div>

                            <div className="comunidad-chat-hero__statusMeta">
                                <div className="comunidad-chat-hero__statusItem">
                                    <span>Comunidad</span>
                                    <strong>#{comunidad?.id ?? comunidadId}</strong>
                                </div>
                                <div className="comunidad-chat-hero__statusItem">
                                    <span>Tu usuario</span>
                                    <strong>{getUserDisplayName(usuario)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="comunidad-chat-content">
                <div className="container">
                    <div className="comunidad-chat-layout">
                        <aside className="comunidad-chat-sidebar comunidad-chat-sidebar--members">
                            <div className="comunidad-chat-panel animate__animated animate__fadeInLeft">
                                <div className="comunidad-chat-panel__header">
                                    <div>
                                        <span className="comunidad-chat-panel__eyebrow">
                                            Participantes
                                        </span>
                                        <h3 className="comunidad-chat-panel__title">
                                            Miembros
                                        </h3>
                                    </div>

                                    <span
                                        className={`comunidad-chat-panel__live ${
                                            wsConectado
                                                ? "comunidad-chat-panel__live--ok"
                                                : "comunidad-chat-panel__live--off"
                                        }`}
                                    >
                                        <FaCircleDot />
                                        {wsConectado ? "En línea" : "Sin socket"}
                                    </span>
                                </div>

                                <div className="comunidad-chat-members">
                                    {integrantes.length === 0 ? (
                                        <div className="comunidad-chat-sidebarEmpty">
                                            <FaUsers />
                                            <p>No hay miembros para mostrar.</p>
                                        </div>
                                    ) : (
                                        integrantes.map((u) => {
                                            const nombre = getUserDisplayName(u);
                                            const initials = getInitials(nombre);
                                            const esYo = usuario?.id === u.id;

                                            return (
                                                <div
                                                    key={u.id}
                                                    className="comunidad-chat-member animate__animated animate__fadeIn"
                                                >
                                                    <div className="comunidad-chat-member__avatar">
                                                        {initials}
                                                    </div>

                                                    <div className="comunidad-chat-member__info">
                                                        <strong>{nombre}</strong>
                                                        <span>
                                                            {u.carrera_nombre ||
                                                                u.user?.username ||
                                                                `Usuario ${u.id}`}
                                                        </span>
                                                    </div>

                                                    {esYo && (
                                                        <span className="comunidad-chat-member__badge">
                                                            Tú
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </aside>

                        <main className="comunidad-chat-main">
                            <div className="comunidad-chat-card animate__animated animate__fadeInUp">
                                <div className="comunidad-chat-card__header">
                                    <div className="comunidad-chat-card__headerCopy">
                                        <h2>{comunidadNombre}</h2>
                                        <p>
                                            Canal principal de conversación de la comunidad.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="comunidad-chat-card__scrollBtn"
                                        onClick={() => scrollToBottom("smooth")}
                                        title="Ir al último mensaje"
                                    >
                                        <FaArrowDown />
                                        <span>Último mensaje</span>
                                    </button>
                                </div>

                                <div
                                    ref={chatContainerRef}
                                    className="comunidad-chat-messages"
                                    onScroll={actualizarEstadoScroll}
                                >
                                    {mensajes.length === 0 ? (
                                        <div className="comunidad-chat-empty">
                                            <div className="comunidad-chat-empty__icon">
                                                <FaPaperPlane />
                                            </div>
                                            <h3>Aún no hay mensajes</h3>
                                            <p>
                                                Inicia la conversación y comparte el primer mensaje
                                                de esta comunidad.
                                            </p>
                                        </div>
                                    ) : (
                                        mensajes.map((msg) => {
                                            const autor = msg.autor_id
                                                ? usuariosMap[msg.autor_id]
                                                : undefined;
                                            const esMio = usuario?.id === msg.autor_id;
                                            const autorNombre = getUserDisplayName(autor);
                                            const initials = getInitials(autorNombre);

                                            return (
                                                <div
                                                    key={msg.id ?? `${msg.autor_id}-${msg.fecha_envio}`}
                                                    className={`comunidad-chat-messageRow ${
                                                        esMio
                                                            ? "comunidad-chat-messageRow--own"
                                                            : ""
                                                    }`}
                                                >
                                                    {!esMio && (
                                                        <div className="comunidad-chat-messageAvatar">
                                                            {initials}
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`comunidad-chat-bubble ${
                                                            esMio
                                                                ? "comunidad-chat-bubble--own"
                                                                : "comunidad-chat-bubble--other"
                                                        } animate__animated animate__fadeInUp`}
                                                    >
                                                        <div className="comunidad-chat-bubble__header">
                                                            <strong>{autorNombre}</strong>
                                                            {msg.fecha_envio && (
                                                                <span>
                                                                    {formatDateTime(msg.fecha_envio)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {msg.contenido && (
                                                            <p className="comunidad-chat-bubble__text">
                                                                {msg.contenido}
                                                            </p>
                                                        )}

                                                        {msg.imagen && (
                                                            <div className="comunidad-chat-bubble__imageWrap">
                                                                <img
                                                                    src={msg.imagen}
                                                                    alt="Imagen enviada"
                                                                    className="comunidad-chat-bubble__image"
                                                                />
                                                            </div>
                                                        )}

                                                        {msg.archivo && (
                                                            <a
                                                                href={msg.archivo}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="comunidad-chat-bubble__file"
                                                            >
                                                                <FaFileArrowDown />
                                                                <span>Descargar archivo</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}

                                    {usuarioEscribiendoId && (
                                        <div className="comunidad-chat-typing animate__animated animate__fadeIn">
                                            <div className="comunidad-chat-typing__dots">
                                                <span />
                                                <span />
                                                <span />
                                            </div>
                                            <span>{usuarioEscribiendoNombre} está escribiendo...</span>
                                        </div>
                                    )}

                                    <div ref={chatEndRef} />
                                </div>

                                <div className="comunidad-chat-composer">
                                    {tieneAdjuntoSeleccionado && (
                                        <div className="comunidad-chat-composer__attachment">
                                            <div className="comunidad-chat-composer__attachmentInfo">
                                                {imagen ? <FaImage /> : <FaPaperclip />}
                                                <span>{archivoNombre}</span>
                                            </div>

                                            <button
                                                type="button"
                                                className="comunidad-chat-composer__removeAttachment"
                                                onClick={limpiarAdjunto}
                                                title="Quitar adjunto"
                                            >
                                                <FaXmark />
                                            </button>
                                        </div>
                                    )}

                                    <div className="comunidad-chat-composer__row">
                                        <label className="comunidad-chat-composer__attachBtn">
                                            <FaPaperclip />
                                            <span>Adjuntar</span>
                                            <input
                                                type="file"
                                                hidden
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;

                                                    if (!file) {
                                                        limpiarAdjunto();
                                                        return;
                                                    }

                                                    if (file.type.startsWith("image/")) {
                                                        setImagen(file);
                                                        setArchivo(null);
                                                    } else {
                                                        setArchivo(file);
                                                        setImagen(null);
                                                    }

                                                    setArchivoNombre(file.name);
                                                }}
                                            />
                                        </label>

                                        <input
                                            type="text"
                                            className="comunidad-chat-composer__input"
                                            value={contenido}
                                            onChange={(e) => {
                                                setContenido(e.target.value);
                                                handleTyping();
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    void handleSend();
                                                }
                                            }}
                                            placeholder="Escribe un mensaje... (Enter para enviar)"
                                            disabled={enviando}
                                        />

                                        <button
                                            onClick={() => void handleSend()}
                                            className="comunidad-chat-composer__sendBtn"
                                            disabled={enviando}
                                            type="button"
                                        >
                                            {enviando ? (
                                                <span className="spinner-border spinner-border-sm" />
                                            ) : (
                                                <>
                                                    <FaPaperPlane />
                                                    <span>Enviar</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </main>

                        <aside className="comunidad-chat-sidebar comunidad-chat-sidebar--files">
                            <div className="comunidad-chat-panel animate__animated animate__fadeInRight">
                                <div className="comunidad-chat-panel__header">
                                    <div>
                                        <span className="comunidad-chat-panel__eyebrow">
                                            Recursos compartidos
                                        </span>
                                        <h3 className="comunidad-chat-panel__title">
                                            Archivos
                                        </h3>
                                    </div>

                                    <span className="comunidad-chat-panel__count">
                                        {archivos.length}
                                    </span>
                                </div>

                                <div className="comunidad-chat-files">
                                    {archivos.length === 0 ? (
                                        <div className="comunidad-chat-sidebarEmpty">
                                            <FaPaperclip />
                                            <p>Aún no se han compartido adjuntos.</p>
                                        </div>
                                    ) : (
                                        archivos.map((m) => (
                                            <div
                                                key={`archivo-${m.id ?? `${m.fecha_envio}-${m.autor_id}`}`}
                                                className="comunidad-chat-fileItem animate__animated animate__fadeInRight"
                                            >
                                                <div className="comunidad-chat-fileItem__icon">
                                                    {m.imagen ? <FaImage /> : <FaFileArrowDown />}
                                                </div>

                                                <div className="comunidad-chat-fileItem__content">
                                                    <strong>{getAttachmentLabel(m)}</strong>
                                                    <span>{formatDateTime(m.fecha_envio)}</span>
                                                </div>

                                                <a
                                                    href={m.archivo || m.imagen || "#"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="comunidad-chat-fileItem__link"
                                                >
                                                    Abrir
                                                </a>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ComunidadesChatPage;