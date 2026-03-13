import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "animate.css";
import {
    FaArrowLeft,
    FaBullhorn,
    FaCalendarDays,
    FaCircleInfo,
    FaImage,
    FaLayerGroup,
    FaLink,
    FaListCheck,
    FaNewspaper,
    FaPeopleGroup,
    FaTrashCan,
    FaUpRightFromSquare,
} from "react-icons/fa6";
import { FaSave } from "react-icons/fa";

import "./NoticiaForm.css";
import { Routes } from "../../routes/CONSTANTS";

import type { Noticia } from "../../models/Noticia/Noticia";
import type { NoticiaRequest } from "../../models/Noticia/NoticiaRequest";
import type { TipoNoticia } from "../../models/Noticia/TipoNoticia";
import type { DestinoNoticia } from "../../models/Noticia/DestinoNoticia";
import type { Comunidad } from "../../models/Comunidad/Comunidad";
import type { Evento } from "../../models/Evento/Evento";

import { NoticiaService } from "../../services/alumni/NoticiaService";
import { ComunidadService } from "../../services/alumni/ComunidadService";
import { EventoService } from "../../services/alumni/EventoService";
import { notifyAdminError, notifySuccess } from "../../services/ui/AlertService";

type FormState = {
    titulo: string;
    resumen: string;
    contenido: string;
    tipo: TipoNoticia;
    destino: DestinoNoticia;
    comunidad: string;
    evento: string;
    boton_texto: string;
    boton_url: string;
    publicado: boolean;
    destacado: boolean;
    orden: string;
    fecha_inicio_publicacion: string;
    fecha_fin_publicacion: string;
};

type LocationState = {
    comunidadId?: number;
    origen?: string;
    destino?: DestinoNoticia;
} | null;

const TIPOS: Array<{ value: TipoNoticia; label: string; help: string }> = [
    {
        value: "NORMAL",
        label: "Normal",
        help: "Solo muestra contenido informativo sin acción adicional.",
    },
    {
        value: "BOTON",
        label: "Con botón",
        help: "Incluye una acción manual mediante texto y URL.",
    },
    {
        value: "EVENTO",
        label: "Relacionado a evento",
        help: "Conecta la noticia con un evento interno del portal.",
    },
    {
        value: "BOTON_EVENTO",
        label: "Botón + evento",
        help: "Combina acción manual y relación con un evento.",
    },
];

const DESTINOS: Array<{
    value: DestinoNoticia;
    label: string;
    help: string;
}> = [
    {
        value: "HOME",
        label: "Home",
        help: "La noticia aparecerá en el inicio público del portal.",
    },
    {
        value: "COMUNIDAD",
        label: "Comunidad",
        help: "La noticia aparecerá dentro del hub de una comunidad específica.",
    },
];

const initialFormState: FormState = {
    titulo: "",
    resumen: "",
    contenido: "",
    tipo: "NORMAL",
    destino: "HOME",
    comunidad: "",
    evento: "",
    boton_texto: "",
    boton_url: "",
    publicado: true,
    destacado: false,
    orden: "0",
    fecha_inicio_publicacion: "",
    fecha_fin_publicacion: "",
};

const formatDateTimeLocal = (value?: string | null): string => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const pad = (n: number) => String(n).padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const sanitizeOptionalUrl = (value: string): string => {
    const raw = value.trim();
    if (!raw) return "";

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

const revokePreviewIfNeeded = (value: string) => {
    if (value.startsWith("blob:")) {
        URL.revokeObjectURL(value);
    }
};

const NoticiaForm = () => {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();

    const id = params.id ? Number(params.id) : undefined;
    const isEditing = Boolean(id);
    const navigationState = (location.state as LocationState) ?? null;

    const [form, setForm] = useState<FormState>(initialFormState);
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState<string>("");
    const [removeCurrentImage, setRemoveCurrentImage] = useState<boolean>(false);
    const [notifyRegistered, setNotifyRegistered] = useState<boolean>(false);

    const [comunidades, setComunidades] = useState<Comunidad[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loadedNoticia, setLoadedNoticia] = useState<Noticia | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [loadingCatalogs, setLoadingCatalogs] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const requiresCommunity = form.destino === "COMUNIDAD";
    const requiresEvent = form.tipo === "EVENTO" || form.tipo === "BOTON_EVENTO";
    const requiresButton = form.tipo === "BOTON" || form.tipo === "BOTON_EVENTO";

    useEffect(() => {
        return () => {
            if (imagenPreview) {
                revokePreviewIfNeeded(imagenPreview);
            }
        };
    }, [imagenPreview]);

    useEffect(() => {
        let mounted = true;

        const loadCatalogs = async () => {
            setLoadingCatalogs(true);

            try {
                const [comunidadesResp, eventosResp] = await Promise.all([
                    ComunidadService.list(),
                    EventoService.list(),
                ]);

                if (!mounted) return;

                setComunidades(Array.isArray(comunidadesResp) ? comunidadesResp : []);
                setEventos(Array.isArray(eventosResp) ? eventosResp : []);
            } catch (err) {
                console.warn("No se pudieron cargar los catálogos del formulario.", err);
                if (mounted) {
                    const detail = notifyAdminError("Error al cargar catalogos de noticias.", err);
                    setError(detail);
                }
            } finally {
                if (mounted) {
                    setLoadingCatalogs(false);
                }
            }
        };

        const loadNoticia = async () => {
            if (!isEditing || !id) {
                setInitialLoading(false);
                return;
            }

            try {
                const noticia = await NoticiaService.get(id);

                if (!mounted) return;

                setLoadedNoticia(noticia);

                setForm({
                    titulo: noticia.titulo ?? "",
                    resumen: noticia.resumen ?? "",
                    contenido: noticia.contenido ?? "",
                    tipo: noticia.tipo ?? "NORMAL",
                    destino: noticia.destino ?? "HOME",
                    comunidad:
                        noticia.comunidad !== null && noticia.comunidad !== undefined
                            ? String(noticia.comunidad)
                            : "",
                    evento:
                        noticia.evento !== null && noticia.evento !== undefined
                            ? String(noticia.evento)
                            : "",
                    boton_texto: noticia.boton_texto ?? "",
                    boton_url: noticia.boton_url ?? "",
                    publicado: noticia.publicado ?? true,
                    destacado: noticia.destacado ?? false,
                    orden:
                        noticia.orden !== null && noticia.orden !== undefined
                            ? String(noticia.orden)
                            : "0",
                    fecha_inicio_publicacion: formatDateTimeLocal(
                        noticia.fecha_inicio_publicacion
                    ),
                    fecha_fin_publicacion: formatDateTimeLocal(
                        noticia.fecha_fin_publicacion
                    ),
                });

                setImagenPreview(noticia.imagen ?? "");
                setRemoveCurrentImage(false);
                setNotifyRegistered(false);
            } catch (err) {
                console.error("Error cargando noticia:", err);
                if (mounted) {
                    const detail = notifyAdminError("Error al cargar la noticia para edicion.", err);
                    setError(detail || getErrorMessage(err));
                }
            } finally {
                if (mounted) {
                    setInitialLoading(false);
                }
            }
        };

        const applyInitialContext = () => {
            if (isEditing) return;

            const comunidadIdFromState = navigationState?.comunidadId;
            const destinoFromState = navigationState?.destino;

            setForm((prev) => ({
                ...prev,
                destino:
                    destinoFromState === "COMUNIDAD" || comunidadIdFromState
                        ? "COMUNIDAD"
                        : prev.destino,
                comunidad: comunidadIdFromState
                    ? String(comunidadIdFromState)
                    : prev.comunidad,
            }));
        };

        applyInitialContext();
        void loadCatalogs();
        void loadNoticia();

        return () => {
            mounted = false;
        };
    }, [id, isEditing, navigationState]);

    useEffect(() => {
        if (!requiresCommunity && form.comunidad) {
            setForm((prev) => ({
                ...prev,
                comunidad: "",
            }));
        }
    }, [requiresCommunity, form.comunidad]);

    useEffect(() => {
        if (!requiresEvent && form.evento) {
            setForm((prev) => ({
                ...prev,
                evento: "",
            }));
        }
    }, [requiresEvent, form.evento]);

    useEffect(() => {
        if (!requiresButton && (form.boton_texto || form.boton_url)) {
            setForm((prev) => ({
                ...prev,
                boton_texto: "",
                boton_url: "",
            }));
        }
    }, [requiresButton, form.boton_texto, form.boton_url]);

    const comunidadesOrdenadas = useMemo(() => {
        return [...comunidades].sort((a, b) =>
            (a.nombre ?? "").localeCompare(b.nombre ?? "", "es", {
                sensitivity: "base",
            })
        );
    }, [comunidades]);

    const eventosOrdenados = useMemo(() => {
        return [...eventos].sort((a, b) =>
            (a.titulo ?? "").localeCompare(b.titulo ?? "", "es", {
                sensitivity: "base",
            })
        );
    }, [eventos]);

    const comunidadSeleccionada = useMemo(
        () =>
            comunidadesOrdenadas.find((item) => String(item.id) === form.comunidad) ??
            null,
        [comunidadesOrdenadas, form.comunidad]
    );

    const eventoSeleccionado = useMemo(
        () => eventosOrdenados.find((item) => String(item.id) === form.evento) ?? null,
        [eventosOrdenados, form.evento]
    );

    const tipoSeleccionado = useMemo(
        () => TIPOS.find((item) => item.value === form.tipo) ?? TIPOS[0],
        [form.tipo]
    );

    const destinoSeleccionado = useMemo(
        () => DESTINOS.find((item) => item.value === form.destino) ?? DESTINOS[0],
        [form.destino]
    );

    const contextualCommunityId = useMemo(() => {
        if (form.destino === "COMUNIDAD" && form.comunidad) {
            return Number(form.comunidad);
        }

        if (navigationState?.comunidadId) {
            return navigationState.comunidadId;
        }

        return undefined;
    }, [form.comunidad, form.destino, navigationState?.comunidadId]);

    const cancelRoute = useMemo(() => {
        if (contextualCommunityId) {
            return Routes.ADMIN.NOTICIAS.COMUNIDAD_LIST_PARAM(contextualCommunityId);
        }

        return Routes.ADMIN.NOTICIAS.LIST;
    }, [contextualCommunityId]);

    const publicHubRoute = useMemo(() => {
        if (!contextualCommunityId) return null;
        return Routes.COMUNIDAD.HUB_PARAM(contextualCommunityId);
    }, [contextualCommunityId]);

    const previewScopeLabel = useMemo(() => {
        if (requiresCommunity) {
            return comunidadSeleccionada?.nombre || "Comunidad aún no seleccionada";
        }

        return "Home del portal";
    }, [requiresCommunity, comunidadSeleccionada?.nombre]);

    const publicationWindowLabel = useMemo(() => {
        if (!form.fecha_inicio_publicacion && !form.fecha_fin_publicacion) {
            return "Sin ventana definida";
        }

        if (form.fecha_inicio_publicacion && !form.fecha_fin_publicacion) {
            return `Desde ${form.fecha_inicio_publicacion.replace("T", " ")}`;
        }

        if (!form.fecha_inicio_publicacion && form.fecha_fin_publicacion) {
            return `Hasta ${form.fecha_fin_publicacion.replace("T", " ")}`;
        }

        return `${form.fecha_inicio_publicacion.replace("T", " ")} → ${form.fecha_fin_publicacion.replace("T", " ")}`;
    }, [form.fecha_inicio_publicacion, form.fecha_fin_publicacion]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target as HTMLInputElement;

        if (error) {
            setError("");
        }

        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;

            setForm((prev) => ({
                ...prev,
                [name]: checked,
            }));
            return;
        }

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;

        if (imagenPreview) {
            revokePreviewIfNeeded(imagenPreview);
        }

        setImagenFile(file);
        setRemoveCurrentImage(false);

        if (!file) {
            setImagenPreview(loadedNoticia?.imagen ?? "");
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setImagenPreview(objectUrl);
    };

    const handleRemoveImage = () => {
        if (imagenPreview) {
            revokePreviewIfNeeded(imagenPreview);
        }

        setImagenFile(null);
        setImagenPreview("");
        setRemoveCurrentImage(true);
    };

    const buildPayload = (): NoticiaRequest => {
        const payload: NoticiaRequest = {
            titulo: form.titulo.trim(),
            resumen: form.resumen.trim() || "",
            contenido: form.contenido.trim(),
            tipo: form.tipo,
            destino: form.destino,
            comunidad: requiresCommunity && form.comunidad ? Number(form.comunidad) : null,
            evento: requiresEvent && form.evento ? Number(form.evento) : null,
            boton_texto: requiresButton ? form.boton_texto.trim() : "",
            boton_url: requiresButton ? sanitizeOptionalUrl(form.boton_url) : "",
            publicado: form.publicado,
            destacado: form.destacado,
            orden: Number(form.orden || 0),
            notify_registered: notifyRegistered,
            fecha_inicio_publicacion: form.fecha_inicio_publicacion || null,
            fecha_fin_publicacion: form.fecha_fin_publicacion || null,
        };

        if (removeCurrentImage) {
            payload.imagen = null;
        } else if (imagenFile) {
            payload.imagen = imagenFile;
        }

        return payload;
    };

    const validateForm = (): string | null => {
        if (!form.titulo.trim()) {
            return "El título es obligatorio.";
        }

        if (!form.contenido.trim()) {
            return "El contenido es obligatorio.";
        }

        if (requiresCommunity && !form.comunidad) {
            return "Debes seleccionar una comunidad cuando el destino es Comunidad.";
        }

        if (requiresEvent && !form.evento) {
            return "Debes seleccionar un evento para este tipo de noticia.";
        }

        if (requiresButton) {
            if (!form.boton_texto.trim()) {
                return "Debes definir el texto del botón para este tipo de noticia.";
            }

            if (!form.boton_url.trim()) {
                return "Debes definir la URL del botón para este tipo de noticia.";
            }
        }

        if (
            form.fecha_inicio_publicacion &&
            form.fecha_fin_publicacion &&
            new Date(form.fecha_inicio_publicacion).getTime() >
                new Date(form.fecha_fin_publicacion).getTime()
        ) {
            return "La fecha de inicio de publicación no puede ser mayor que la fecha de fin.";
        }

        return null;
    };

    const redirectAfterSave = (saved: Noticia) => {
        const communityId = saved.comunidad ?? contextualCommunityId;

        if (communityId) {
            navigate(Routes.ADMIN.NOTICIAS.COMUNIDAD_LIST_PARAM(communityId));
            return;
        }

        navigate(Routes.ADMIN.NOTICIAS.LIST);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loading) return;

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const payload = buildPayload();

            const saved = isEditing && id
                ? await NoticiaService.update(id, payload)
                : await NoticiaService.create(payload);

            notifySuccess(isEditing ? "Noticia actualizada correctamente." : "Noticia creada correctamente.");
            redirectAfterSave(saved);
        } catch (err) {
            console.error("Error al guardar la noticia:", err);
            const detail = notifyAdminError("No se pudo guardar la noticia.", err);
            setError(detail || getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="noticia-form-page animate__animated animate__fadeIn">
                <div className="container py-5">
                    <div className="noticia-form-feedback">
                        <div className="spinner-border text-warning" role="status" />
                        <p className="mt-3 mb-0">Cargando noticia...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="noticia-form-page animate__animated animate__fadeIn">
            <section className="noticia-form-hero">
                <div className="container">
                    <div className="noticia-form-hero__content">
                        <div className="noticia-form-hero__copy">
                            <span className="noticia-form-hero__eyebrow">
                                <FaNewspaper />
                                Panel administrativo NUR
                            </span>

                            <h1 className="noticia-form-hero__title">
                                {isEditing ? "Editar noticia" : "Nueva noticia"}
                            </h1>

                            <p className="noticia-form-hero__text">
                                Configura una publicación enriquecida alineada al dominio actual
                                de Noticias. El formulario construye el payload real esperado por
                                el backend y adapta el contexto para Home o Comunidad.
                            </p>

                            <div className="noticia-form-hero__pills">
                                <span className="noticia-form-pill">
                                    <FaLayerGroup />
                                    {tipoSeleccionado.label}
                                </span>
                                <span className="noticia-form-pill">
                                    <FaPeopleGroup />
                                    {destinoSeleccionado.label}
                                </span>
                                {requiresCommunity && (
                                    <span className="noticia-form-pill noticia-form-pill--accent">
                                        {comunidadSeleccionada?.nombre || "Comunidad pendiente"}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="noticia-form-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => navigate(cancelRoute)}
                                disabled={loading}
                            >
                                <FaArrowLeft />
                                <span>Volver</span>
                            </button>

                            {publicHubRoute && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--outline"
                                    onClick={() => navigate(publicHubRoute)}
                                    disabled={loading}
                                >
                                    <FaUpRightFromSquare />
                                    <span>Ver hub</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="noticia-form-content">
                <div className="container">
                    <form
                        onSubmit={handleSubmit}
                        className="noticia-form-card animate__animated animate__fadeInUp"
                    >
                        <div className="noticia-form-card__header">
                            <div>
                                <span className="noticia-form-card__eyebrow">
                                    <FaListCheck />
                                    Configuración de publicación
                                </span>

                                <h2 className="noticia-form-card__title">
                                    {isEditing
                                        ? "Actualiza la noticia"
                                        : "Completa los datos de la noticia"}
                                </h2>

                                <p className="noticia-form-card__text">
                                    La UI prioriza claridad editorial, mientras que el backend
                                    valida consistencia entre tipo, destino, comunidad, evento y
                                    acciones.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="noticia-form-alert noticia-form-alert--error">
                                <FaCircleInfo />
                                <div>
                                    <strong>No se pudo guardar la noticia.</strong>
                                    <p>{error}</p>
                                </div>
                            </div>
                        )}

                        <div className="noticia-form-grid">
                            <div className="noticia-form-main">
                                <div className="noticia-form-section">
                                    <div className="noticia-form-section__header">
                                        <h3>Contenido principal</h3>
                                        <p>
                                            Información editorial que el usuario final realmente leerá.
                                        </p>
                                    </div>

                                    <div className="row g-4">
                                        <div className="col-12">
                                            <label className="form-label" htmlFor="titulo">
                                                Título
                                            </label>
                                            <input
                                                id="titulo"
                                                name="titulo"
                                                type="text"
                                                className="form-control"
                                                value={form.titulo}
                                                onChange={handleChange}
                                                placeholder="Ej.: Convocatoria de networking alumni"
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label" htmlFor="resumen">
                                                Resumen
                                            </label>
                                            <textarea
                                                id="resumen"
                                                name="resumen"
                                                className="form-control"
                                                rows={3}
                                                value={form.resumen}
                                                onChange={handleChange}
                                                placeholder="Resumen breve para banners y tarjetas"
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label" htmlFor="contenido">
                                                Contenido
                                            </label>
                                            <textarea
                                                id="contenido"
                                                name="contenido"
                                                className="form-control noticia-form-textarea--lg"
                                                rows={9}
                                                value={form.contenido}
                                                onChange={handleChange}
                                                placeholder="Desarrolla el contenido principal de la noticia"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="noticia-form-section">
                                    <div className="noticia-form-section__header">
                                        <h3>Composición funcional</h3>
                                        <p>
                                            Define dónde vive la noticia y cómo se comporta dentro del
                                            portal.
                                        </p>
                                    </div>

                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label" htmlFor="tipo">
                                                Tipo de noticia
                                            </label>
                                            <select
                                                id="tipo"
                                                name="tipo"
                                                className="form-select"
                                                value={form.tipo}
                                                onChange={handleChange}
                                            >
                                                {TIPOS.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <small className="noticia-form-help">
                                                {tipoSeleccionado.help}
                                            </small>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label" htmlFor="destino">
                                                Destino
                                            </label>
                                            <select
                                                id="destino"
                                                name="destino"
                                                className="form-select"
                                                value={form.destino}
                                                onChange={handleChange}
                                            >
                                                {DESTINOS.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <small className="noticia-form-help">
                                                {destinoSeleccionado.help}
                                            </small>
                                        </div>

                                        {requiresCommunity && (
                                            <div className="col-12">
                                                <label className="form-label" htmlFor="comunidad">
                                                    Comunidad
                                                </label>
                                                <select
                                                    id="comunidad"
                                                    name="comunidad"
                                                    className="form-select"
                                                    value={form.comunidad}
                                                    onChange={handleChange}
                                                    disabled={loadingCatalogs}
                                                >
                                                    <option value="">Selecciona una comunidad</option>
                                                    {comunidadesOrdenadas.map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                                <small className="noticia-form-help">
                                                    {comunidadSeleccionada
                                                        ? `La noticia se publicará dentro del hub de ${comunidadSeleccionada.nombre}.`
                                                        : "Selecciona la comunidad donde debe aparecer la noticia."}
                                                </small>
                                            </div>
                                        )}

                                        {requiresEvent && (
                                            <div className="col-12">
                                                <label className="form-label" htmlFor="evento">
                                                    Evento relacionado
                                                </label>
                                                <select
                                                    id="evento"
                                                    name="evento"
                                                    className="form-select"
                                                    value={form.evento}
                                                    onChange={handleChange}
                                                    disabled={loadingCatalogs}
                                                >
                                                    <option value="">Selecciona un evento</option>
                                                    {eventosOrdenados.map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.titulo || `Evento #${item.id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <small className="noticia-form-help">
                                                    {eventoSeleccionado
                                                        ? `Se enlazará con el evento: ${eventoSeleccionado.titulo || `#${eventoSeleccionado.id}`}.`
                                                        : "Selecciona el evento que contextualiza la noticia."}
                                                </small>
                                            </div>
                                        )}

                                        {requiresButton && (
                                            <>
                                                <div className="col-md-5">
                                                    <label
                                                        className="form-label"
                                                        htmlFor="boton_texto"
                                                    >
                                                        Texto del botón
                                                    </label>
                                                    <input
                                                        id="boton_texto"
                                                        name="boton_texto"
                                                        type="text"
                                                        className="form-control"
                                                        value={form.boton_texto}
                                                        onChange={handleChange}
                                                        placeholder="Ej.: Inscribirme ahora"
                                                    />
                                                </div>

                                                <div className="col-md-7">
                                                    <label
                                                        className="form-label"
                                                        htmlFor="boton_url"
                                                    >
                                                        URL del botón
                                                    </label>
                                                    <input
                                                        id="boton_url"
                                                        name="boton_url"
                                                        type="text"
                                                        className="form-control"
                                                        value={form.boton_url}
                                                        onChange={handleChange}
                                                        placeholder="https://..."
                                                    />
                                                    <small className="noticia-form-help">
                                                        Admite enlaces web, mailto: y tel:
                                                    </small>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="noticia-form-section">
                                    <div className="noticia-form-section__header">
                                        <h3>Publicación y visibilidad</h3>
                                        <p>
                                            Controla prioridad, visibilidad y ventana de publicación.
                                        </p>
                                    </div>

                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <label className="form-label" htmlFor="orden">
                                                Orden
                                            </label>
                                            <input
                                                id="orden"
                                                name="orden"
                                                type="number"
                                                className="form-control"
                                                value={form.orden}
                                                onChange={handleChange}
                                                min="0"
                                            />
                                            <small className="noticia-form-help">
                                                Menor valor = mayor prioridad dentro del mismo grupo.
                                            </small>
                                        </div>

                                        <div className="col-md-4">
                                            <label
                                                className="form-label"
                                                htmlFor="fecha_inicio_publicacion"
                                            >
                                                Inicio de publicación
                                            </label>
                                            <input
                                                id="fecha_inicio_publicacion"
                                                name="fecha_inicio_publicacion"
                                                type="datetime-local"
                                                className="form-control"
                                                value={form.fecha_inicio_publicacion}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label
                                                className="form-label"
                                                htmlFor="fecha_fin_publicacion"
                                            >
                                                Fin de publicación
                                            </label>
                                            <input
                                                id="fecha_fin_publicacion"
                                                name="fecha_fin_publicacion"
                                                type="datetime-local"
                                                className="form-control"
                                                value={form.fecha_fin_publicacion}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="noticia-form-switch">
                                                <input
                                                    type="checkbox"
                                                    name="publicado"
                                                    checked={form.publicado}
                                                    onChange={handleChange}
                                                />
                                                <span>
                                                    <strong>Publicado</strong>
                                                    <small>
                                                        La noticia quedará habilitada para mostrarse
                                                        según su ventana de publicación.
                                                    </small>
                                                </span>
                                            </label>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="noticia-form-switch">
                                                <input
                                                    type="checkbox"
                                                    name="destacado"
                                                    checked={form.destacado}
                                                    onChange={handleChange}
                                                />
                                                <span>
                                                    <strong>Destacada</strong>
                                                    <small>
                                                        Tendrá prioridad visual en Home o en el hub
                                                        correspondiente.
                                                    </small>
                                                </span>
                                            </label>
                                        </div>

                                        <div className="col-12">
                                            <label className="noticia-form-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notifyRegistered}
                                                    onChange={(e) =>
                                                        setNotifyRegistered(e.target.checked)
                                                    }
                                                />
                                                <span>
                                                    <strong>Notificar a todos los registrados</strong>
                                                    <small>
                                                        Solo se enviará el aviso por correo si este check está marcado al guardar.
                                                    </small>
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <aside className="noticia-form-side">
                                <div className="noticia-form-sideCard">
                                    <div className="noticia-form-sideCard__header">
                                        <h3>
                                            <FaImage />
                                            Imagen de portada
                                        </h3>
                                        <p>
                                            Se mostrará en banners, tarjetas y vistas de lectura.
                                        </p>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="imagen">
                                            Imagen
                                        </label>
                                        <input
                                            id="imagen"
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={handleImageChange}
                                        />
                                    </div>

                                    {(loadedNoticia?.imagen || imagenFile || imagenPreview) && (
                                        <div className="noticia-form-inline-actions">
                                            <button
                                                type="button"
                                                className="noticia-form-inline-link"
                                                onClick={handleRemoveImage}
                                            >
                                                <FaTrashCan />
                                                <span>Quitar imagen</span>
                                            </button>
                                        </div>
                                    )}

                                    {removeCurrentImage && !imagenPreview && (
                                        <div className="noticia-form-helpBox">
                                            La imagen será removida al guardar.
                                        </div>
                                    )}

                                    {imagenPreview ? (
                                        <div className="noticia-form-preview">
                                            <img
                                                src={imagenPreview}
                                                alt="Vista previa de noticia"
                                                className="noticia-form-preview__image"
                                            />
                                        </div>
                                    ) : (
                                        <div className="noticia-form-preview noticia-form-preview--empty">
                                            <FaImage />
                                            <p>Aún no hay imagen seleccionada.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="noticia-form-sideCard">
                                    <div className="noticia-form-sideCard__header">
                                        <h3>
                                            <FaBullhorn />
                                            Resumen de configuración
                                        </h3>
                                        <p>
                                            Vista rápida del comportamiento configurado antes de guardar.
                                        </p>
                                    </div>

                                    <div className="noticia-form-summary">
                                        <div className="noticia-form-summary__item">
                                            <span>
                                                <FaLayerGroup />
                                                Tipo
                                            </span>
                                            <strong>{tipoSeleccionado.label}</strong>
                                        </div>

                                        <div className="noticia-form-summary__item">
                                            <span>
                                                <FaPeopleGroup />
                                                Destino
                                            </span>
                                            <strong>{destinoSeleccionado.label}</strong>
                                        </div>

                                        <div className="noticia-form-summary__item">
                                            <span>
                                                <FaNewspaper />
                                                Alcance
                                            </span>
                                            <strong>{previewScopeLabel}</strong>
                                        </div>

                                        {requiresEvent && (
                                            <div className="noticia-form-summary__item">
                                                <span>
                                                    <FaCalendarDays />
                                                    Evento
                                                </span>
                                                <strong>
                                                    {eventoSeleccionado?.titulo || "Sin seleccionar"}
                                                </strong>
                                            </div>
                                        )}

                                        {requiresButton && (
                                            <div className="noticia-form-summary__item">
                                                <span>
                                                    <FaLink />
                                                    Acción
                                                </span>
                                                <strong>
                                                    {form.boton_texto.trim() || "Sin texto definido"}
                                                </strong>
                                            </div>
                                        )}

                                        <div className="noticia-form-summary__item">
                                            <span>
                                                <FaCalendarDays />
                                                Ventana
                                            </span>
                                            <strong>{publicationWindowLabel}</strong>
                                        </div>

                                        <div className="noticia-form-summary__item">
                                            <span>Estado</span>
                                            <strong>
                                                {form.publicado ? "Publicada" : "Borrador"}
                                                {form.destacado ? " • Destacada" : ""}
                                            </strong>
                                        </div>

                                        <div className="noticia-form-summary__item">
                                            <span>
                                                <FaBullhorn />
                                                Notificación
                                            </span>
                                            <strong>
                                                {notifyRegistered
                                                    ? "Se notificará a registrados"
                                                    : "Sin notificación masiva"}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="noticia-form-actions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={() => navigate(cancelRoute)}
                                        disabled={loading}
                                    >
                                        <FaArrowLeft />
                                        <span>Cancelar</span>
                                    </button>

                                    <button
                                        type="submit"
                                        className="nur-btn nur-btn--primary"
                                        disabled={loading}
                                    >
                                        <FaSave />
                                        <span>
                                            {loading
                                                ? "Guardando..."
                                                : isEditing
                                                  ? "Guardar cambios"
                                                  : "Guardar noticia"}
                                        </span>
                                    </button>
                                </div>
                            </aside>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default NoticiaForm;