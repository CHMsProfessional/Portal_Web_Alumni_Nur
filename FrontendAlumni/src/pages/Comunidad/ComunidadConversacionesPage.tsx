/* eslint-disable react-hooks/exhaustive-deps */
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Modal, Spinner } from "react-bootstrap";
import "animate.css";
import {
    FaArrowLeft,
    FaArrowRight,
    FaCalendarDays,
    FaComments,
    FaDoorOpen,
    FaFilter,
    FaLayerGroup,
    FaLock,
    FaLockOpen,
    FaMessage,
    FaPenToSquare,
    FaPlus,
    FaRotateRight,
    FaTriangleExclamation,
    FaUserCheck,
    FaUsers,
    FaXmark,
} from "react-icons/fa6";

import "./ComunidadConversacionesPage.css";

import { Routes } from "../../routes/CONSTANTS";
import { Comunidad } from "../../models/Comunidad/Comunidad";
import {
    ConversacionComunidad,
    EstadoConversacion,
} from "../../models/Comunidad/ConversacionComunidad";
import { ConversacionComunidadRequest } from "../../models/Comunidad/ConversacionComunidadRequest";
import { UsuarioPerfil } from "../../models/Usuario/UsuarioPerfil";

import { ComunidadService } from "../../services/alumni/ComunidadService";
import { ConversacionComunidadService } from "../../services/alumni/ConversacionComunidadService";
import {UserAlumniService} from "../../services/alumni/UserAlumniService";

const placeholderImg = "/placeholder-comunidad.png";
const CONTENT_MEDIA_URL = import.meta.env.VITE_CONTENT_MEDIA_URL ?? "";

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

        if (typeof data === "object" && data !== null) {
            const detail = (data as Record<string, unknown>).detail;
            if (typeof detail === "string") {
                return detail;
            }

            try {
                return JSON.stringify(data, null, 2);
            } catch {
                return "Ocurrió un error inesperado al procesar la respuesta.";
            }
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

const truncate = (value?: string | null, max = 180): string => {
    if (!value) return "Sin descripción disponible.";
    if (value.length <= max) return value;
    return `${value.slice(0, max).trim()}...`;
};

const normalizeText = (value?: string | null): string => value?.trim() ?? "";

const resolveConversationImage = (value?: string | null): string => {
    const normalized = normalizeText(value);

    if (!normalized) return placeholderImg;
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
        return normalized;
    }
    if (normalized.startsWith("/placeholder")) return normalized;
    if (!CONTENT_MEDIA_URL) return normalized;

    return `${CONTENT_MEDIA_URL}${normalized}`;
};

type EstadoFiltro = "TODAS" | EstadoConversacion;

type FormState = {
    titulo: string;
    descripcion: string;
    imagen: File | null;
};

const initialFormState: FormState = {
    titulo: "",
    descripcion: "",
    imagen: null,
};

const ComunidadConversacionesPage = () => {
    const params = useParams();
    const navigate = useNavigate();

    const comunidadIdRaw = params.comunidadId ?? params.id;
    const comunidadId = Number(comunidadIdRaw);

    const [perfil, setPerfil] = useState<UsuarioPerfil | null>(() =>
        UserAlumniService.getCachedPerfilCompleto()
    );
    const [comunidad, setComunidad] = useState<Comunidad | null>(null);
    const [conversaciones, setConversaciones] = useState<ConversacionComunidad[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [pageError, setPageError] = useState<string>("");
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("TODAS");

    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [creating, setCreating] = useState<boolean>(false);
    const [createError, setCreateError] = useState<string>("");
    const [form, setForm] = useState<FormState>(initialFormState);

    const usuario = perfil?.usuario ?? null;
    const usuarioId = usuario?.id ?? null;

    const cargarDatos = async (silent = false): Promise<void> => {
        if (!Number.isFinite(comunidadId) || comunidadId <= 0) {
            setPageError("El identificador de la comunidad no es válido.");
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
            const [perfilData, comunidadData, conversacionesData] = await Promise.all([
                UserAlumniService.loadPerfilCompleto(false),
                ComunidadService.get(comunidadId),
                ComunidadService.conversaciones(comunidadId),
            ]);

            setPerfil(perfilData ?? null);
            setComunidad(comunidadData ?? null);
            setConversaciones(conversacionesData ?? []);
        } catch (error) {
            console.error("Error al cargar conversaciones:", error);
            const message = getErrorMessage(error);

            if (silent) {
                setCreateError("");
                setPageError((prev) => prev || "");
                console.warn("Actualización parcial falló:", message);
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
        void cargarDatos();
    }, [comunidadId]);

    const conversacionesFiltradas = useMemo(() => {
        let data = [...conversaciones];

        if (estadoFiltro !== "TODAS") {
            data = data.filter((item) => item.estado === estadoFiltro);
        }

        return data.sort((a, b) => {
            const fechaA = a.ultimo_mensaje_at
                ? new Date(a.ultimo_mensaje_at).getTime()
                : a.fecha_creacion
                    ? new Date(a.fecha_creacion).getTime()
                    : 0;

            const fechaB = b.ultimo_mensaje_at
                ? new Date(b.ultimo_mensaje_at).getTime()
                : b.fecha_creacion
                    ? new Date(b.fecha_creacion).getTime()
                    : 0;

            return fechaB - fechaA;
        });
    }, [conversaciones, estadoFiltro]);

    const resumen = useMemo(() => {
        const total = conversaciones.length;
        const abiertas = conversaciones.filter((item) => item.estado === "ABIERTA").length;
        const cerradas = conversaciones.filter((item) => item.estado === "CERRADA").length;

        return { total, abiertas, cerradas };
    }, [conversaciones]);

    const puedeCrearConversacion = useMemo(() => {
        if (!comunidad) return false;

        if (typeof comunidad.puede_crear_conversacion === "boolean") {
            return comunidad.puede_crear_conversacion;
        }

        if (!usuarioId) return false;
        return (comunidad.usuarios ?? []).includes(usuarioId) && comunidad.activo !== false;
    }, [comunidad, usuarioId]);

    const perteneceUsuario = useMemo(() => {
        if (!comunidad) return false;

        if (typeof comunidad.pertenece_usuario_actual === "boolean") {
            return comunidad.pertenece_usuario_actual;
        }

        if (!usuarioId) return false;
        return (comunidad.usuarios ?? []).includes(usuarioId);
    }, [comunidad, usuarioId]);

    const totalMiembros = comunidad?.total_miembros ?? comunidad?.usuarios?.length ?? 0;

    const openCreateModal = () => {
        setCreateError("");
        setForm(initialFormState);
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        if (creating) return;
        setShowCreateModal(false);
        setCreateError("");
        setForm(initialFormState);
    };

    const handleFormChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setForm((prev) => ({
            ...prev,
            imagen: file,
        }));
    };

    const handleCreateConversation = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const titulo = normalizeText(form.titulo);
        const descripcion = normalizeText(form.descripcion);

        if (!Number.isFinite(comunidadId) || comunidadId <= 0) {
            setCreateError("El identificador de la comunidad no es válido.");
            return;
        }

        if (!titulo) {
            setCreateError("Debes ingresar un título para la conversación.");
            return;
        }

        setCreating(true);
        setCreateError("");

        try {
            const payload: ConversacionComunidadRequest = {
                comunidad: comunidadId,
                titulo,
                descripcion,
                imagen: form.imagen ?? undefined,
                estado: "ABIERTA",
                activa: true,
            };

            const creada = await ConversacionComunidadService.create(payload);

            setShowCreateModal(false);
            setForm(initialFormState);

            setConversaciones((prev) => {
                const exists = prev.some((item) => item.id === creada.id);
                if (exists) return prev;
                return [creada, ...prev];
            });

            navigate(Routes.COMUNIDAD.CONVERSACION_PARAM(comunidadId, creada.id));
        } catch (error) {
            console.error("Error al crear conversación:", error);
            setCreateError(getErrorMessage(error));
        } finally {
            setCreating(false);
        }
    };

    const handleGoBack = () => {
        if (Number.isFinite(comunidadId) && comunidadId > 0) {
            navigate(Routes.COMUNIDAD.HUB_PARAM(comunidadId));
            return;
        }

        navigate(Routes.COMUNIDAD.HOME);
    };

    const handleOpenConversation = (conversacion: ConversacionComunidad) => {
        navigate(Routes.COMUNIDAD.CONVERSACION_PARAM(comunidadId, conversacion.id));
    };

    const handlePartialRefresh = async () => {
        if (loading || refreshing || creating) return;
        await cargarDatos(true);
    };

    if (loading) {
        return (
            <div className="comunidad-conversaciones-page">
                <div className="container py-5">
                    <div className="comunidad-conversaciones-state animate__animated animate__fadeIn">
                        <Spinner animation="border" role="status" />
                        <h3>Cargando conversaciones</h3>
                        <p className="mb-0">
                            Estamos obteniendo la comunidad y su listado de conversaciones.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (pageError || !comunidad) {
        return (
            <div className="comunidad-conversaciones-page">
                <div className="container py-5">
                    <div className="comunidad-conversaciones-state comunidad-conversaciones-state--error animate__animated animate__fadeIn">
                        <FaTriangleExclamation />
                        <h3>No fue posible cargar las conversaciones</h3>
                        <p>{pageError || "La comunidad solicitada no está disponible."}</p>

                        <div className="comunidad-conversaciones-state__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => navigate(Routes.COMUNIDAD.HOME)}
                            >
                                <FaArrowLeft />
                                <span>Volver a comunidades</span>
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={() => void cargarDatos()}
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
        <div className="comunidad-conversaciones-page">
            <section className="comunidad-conversaciones-hero animate__animated animate__fadeIn">
                <div className="container">
                    <div className="comunidad-conversaciones-hero__top">
                        <div className="comunidad-conversaciones-hero__left">
                            <span className="comunidad-conversaciones-hero__eyebrow">
                                <FaComments />
                                Conversaciones de comunidad
                            </span>

                            <h1 className="comunidad-conversaciones-hero__title">
                                {comunidad.nombre}
                            </h1>

                            <p className="comunidad-conversaciones-hero__text">
                                {normalizeText(comunidad.descripcion) ||
                                    "Explora los espacios temáticos y conversaciones activas de esta comunidad Alumni."}
                            </p>

                            <div className="comunidad-conversaciones-hero__chips">
                                <span className="comunidad-conversaciones-hero__chip">
                                    <FaUsers />
                                    {totalMiembros} miembro{totalMiembros !== 1 ? "s" : ""}
                                </span>

                                <span className="comunidad-conversaciones-hero__chip">
                                    <FaLayerGroup />
                                    {resumen.total} conversación{resumen.total !== 1 ? "es" : ""}
                                </span>

                                <span className="comunidad-conversaciones-hero__chip comunidad-conversaciones-hero__chip--soft">
                                    <FaUserCheck />
                                    {perteneceUsuario ? "Eres miembro" : "Sin membresía detectada"}
                                </span>
                            </div>
                        </div>

                        <div className="comunidad-conversaciones-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost-light"
                                onClick={handleGoBack}
                            >
                                <FaArrowLeft />
                                <span>Volver al hub</span>
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost-light"
                                onClick={() => void handlePartialRefresh()}
                                disabled={refreshing || creating}
                            >
                                {refreshing ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Actualizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaRotateRight />
                                        <span>Actualizar listado</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="nur-btn nur-btn--primary"
                                onClick={openCreateModal}
                                disabled={!puedeCrearConversacion || refreshing}
                            >
                                <FaPlus />
                                <span>Nueva conversación</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="comunidad-conversaciones-content">
                <div className="container">
                    <div className="comunidad-conversaciones-layout">
                        <aside className="comunidad-conversaciones-side animate__animated animate__fadeInLeft">
                            <div className="comunidad-conversaciones-sideCard">
                                <h3>Resumen del espacio</h3>

                                <div className="comunidad-conversaciones-sideCard__stats">
                                    <div className="comunidad-conversaciones-miniStat">
                                        <span className="label">Total</span>
                                        <strong>{resumen.total}</strong>
                                    </div>

                                    <div className="comunidad-conversaciones-miniStat">
                                        <span className="label">Abiertas</span>
                                        <strong>{resumen.abiertas}</strong>
                                    </div>

                                    <div className="comunidad-conversaciones-miniStat">
                                        <span className="label">Cerradas</span>
                                        <strong>{resumen.cerradas}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="comunidad-conversaciones-sideCard">
                                <h3>Filtros</h3>

                                <div className="comunidad-conversaciones-filterGroup">
                                    <label className="comunidad-conversaciones-label">
                                        <FaFilter />
                                        <span>Estado</span>
                                    </label>

                                    <Form.Select
                                        value={estadoFiltro}
                                        onChange={(e) =>
                                            setEstadoFiltro(e.target.value as EstadoFiltro)
                                        }
                                        className="comunidad-conversaciones-select"
                                    >
                                        <option value="TODAS">Todas</option>
                                        <option value="ABIERTA">Solo abiertas</option>
                                        <option value="CERRADA">Solo cerradas</option>
                                    </Form.Select>
                                </div>
                            </div>

                            {!puedeCrearConversacion && (
                                <div className="comunidad-conversaciones-sideCard comunidad-conversaciones-sideCard--notice">
                                    <h3>Creación restringida</h3>
                                    <p>
                                        Solo los miembros de la comunidad pueden crear nuevas
                                        conversaciones dentro de este espacio.
                                    </p>
                                </div>
                            )}
                        </aside>

                        <div className="comunidad-conversaciones-main animate__animated animate__fadeInUp">
                            <div className="comunidad-conversaciones-main__header">
                                <div>
                                    <h2>Listado de conversaciones</h2>
                                    <p>
                                        Selecciona una conversación para entrar al canal específico
                                        del nuevo flujo por conversación.
                                    </p>
                                </div>

                                <div className="comunidad-conversaciones-main__actions">
                                    <span className="comunidad-conversaciones-main__hint">
                                        {refreshing
                                            ? "Actualizando datos..."
                                            : "Estado sincronizado con el backend"}
                                    </span>
                                </div>
                            </div>

                            {conversacionesFiltradas.length === 0 ? (
                                <div className="comunidad-conversaciones-empty">
                                    <FaMessage />
                                    <h3>No hay conversaciones para mostrar</h3>
                                    <p>
                                        Todavía no existen conversaciones con el filtro actual.
                                        Puedes crear una nueva si perteneces a esta comunidad.
                                    </p>

                                    {puedeCrearConversacion && (
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--primary"
                                            onClick={openCreateModal}
                                        >
                                            <FaPlus />
                                            <span>Crear primera conversación</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="comunidad-conversaciones-grid">
                                    {conversacionesFiltradas.map((conversacion) => {
                                        const abierta = conversacion.estado === "ABIERTA";
                                        const imageUrl = resolveConversationImage(
                                            typeof conversacion.imagen === "string"
                                                ? conversacion.imagen
                                                : null
                                        );

                                        return (
                                            <article
                                                key={conversacion.id}
                                                className="comunidad-conversaciones-card"
                                            >
                                                <div className="comunidad-conversaciones-card__media">
                                                    <img
                                                        src={imageUrl}
                                                        alt={conversacion.titulo || "Conversación"}
                                                    />

                                                    <span
                                                        className={`comunidad-conversaciones-card__badge ${abierta
                                                                ? "comunidad-conversaciones-card__badge--open"
                                                                : "comunidad-conversaciones-card__badge--closed"
                                                            }`}
                                                    >
                                                        {abierta ? <FaLockOpen /> : <FaLock />}
                                                        <span>
                                                            {abierta ? "Abierta" : "Cerrada"}
                                                        </span>
                                                    </span>
                                                </div>

                                                <div className="comunidad-conversaciones-card__body">
                                                    <div className="comunidad-conversaciones-card__top">
                                                        <h3>{conversacion.titulo}</h3>
                                                        <p>
                                                            {truncate(conversacion.descripcion, 150)}
                                                        </p>
                                                    </div>

                                                    <div className="comunidad-conversaciones-card__meta">
                                                        <span>
                                                            <FaCalendarDays />
                                                            {formatDate(
                                                                conversacion.ultimo_mensaje_at ||
                                                                conversacion.fecha_creacion
                                                            )}
                                                        </span>

                                                        <span>
                                                            <FaComments />
                                                            {conversacion.total_mensajes ?? 0} mensaje
                                                            {(conversacion.total_mensajes ?? 0) !== 1
                                                                ? "s"
                                                                : ""}
                                                        </span>

                                                        <span>
                                                            <FaDoorOpen />
                                                            {conversacion.puede_escribir && abierta
                                                                ? "Puedes escribir"
                                                                : "Solo lectura"}
                                                        </span>
                                                    </div>

                                                    <div className="comunidad-conversaciones-card__actions">
                                                        <button
                                                            type="button"
                                                            className="nur-btn nur-btn--ghost"
                                                            onClick={() =>
                                                                handleOpenConversation(conversacion)
                                                            }
                                                        >
                                                            <FaArrowRight />
                                                            <span>Entrar</span>
                                                        </button>

                                                        <div className="comunidad-conversaciones-card__flags">
                                                            {conversacion.puede_cerrar && (
                                                                <span className="flag">
                                                                    <FaPenToSquare />
                                                                    Gestionable
                                                                </span>
                                                            )}

                                                            {conversacion.puede_reabrir && (
                                                                <span className="flag flag--muted">
                                                                    <FaLockOpen />
                                                                    Reabrible
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <Modal
                show={showCreateModal}
                onHide={closeCreateModal}
                centered
                backdrop="static"
                className="comunidad-conversaciones-modal"
            >
                <Modal.Header closeButton={!creating}>
                    <Modal.Title>Crear nueva conversación</Modal.Title>
                </Modal.Header>

                <Form onSubmit={handleCreateConversation}>
                    <Modal.Body>
                        <p className="comunidad-conversaciones-modal__intro">
                            Esta conversación se creará dentro de <strong>{comunidad.nombre}</strong>.
                        </p>

                        <Form.Group className="mb-3">
                            <Form.Label>Título</Form.Label>
                            <Form.Control
                                type="text"
                                name="titulo"
                                value={form.titulo}
                                onChange={handleFormChange}
                                placeholder="Ej.: Bolsa laboral de egresados NUR"
                                maxLength={180}
                                disabled={creating}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                name="descripcion"
                                value={form.descripcion}
                                onChange={handleFormChange}
                                placeholder="Describe el propósito de esta conversación..."
                                disabled={creating}
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Imagen (opcional)</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                disabled={creating}
                            />
                        </Form.Group>

                        {createError && (
                            <div className="comunidad-conversaciones-modal__error mt-3">
                                <FaTriangleExclamation />
                                <span>{createError}</span>
                            </div>
                        )}
                    </Modal.Body>

                    <Modal.Footer>
                        <button
                            type="button"
                            className="nur-btn nur-btn--ghost"
                            onClick={closeCreateModal}
                            disabled={creating}
                        >
                            <FaXmark />
                            <span>Cancelar</span>
                        </button>

                        <button
                            type="submit"
                            className="nur-btn nur-btn--primary"
                            disabled={creating}
                        >
                            {creating ? (
                                <>
                                    <Spinner size="sm" />
                                    <span>Creando...</span>
                                </>
                            ) : (
                                <>
                                    <FaPlus />
                                    <span>Crear conversación</span>
                                </>
                            )}
                        </button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default ComunidadConversacionesPage;