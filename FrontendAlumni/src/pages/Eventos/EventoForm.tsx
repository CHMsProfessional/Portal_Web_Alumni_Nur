/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import Select, { MultiValue } from "react-select";
import "animate.css";
import { useNavigate, useParams } from "react-router-dom";
import {
    FaAlignLeft,
    FaArrowLeft,
    FaCalendarAlt,
    FaClock,
    FaGlobeAmericas,
    FaImage,
    FaInfoCircle,
    FaLayerGroup,
    FaListAlt,
    FaSave,
    FaToggleOn,
    FaUniversity,
    FaUsers,
} from "react-icons/fa";

import "./EventoForm.css";

import { EventoRequest } from "../../models/Evento/EventoRequest";
import { Evento } from "../../models/Evento/Evento";
import { EventoService } from "../../services/alumni/EventoService";
import { CarreraService } from "../../services/alumni/CarreraService";
import { Carrera } from "../../models/Carrera/Carrera";
import { Routes } from "../../routes/CONSTANTS";
import { notifyAdminError, notifySuccess } from "../../services/ui/AlertService";

type CarreraOption = {
    value: number;
    label: string;
};

type FormErrors = {
    titulo?: string;
    descripcion?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    estado?: string;
    carreras?: string;
    general?: string;
};

const createInitialForm = (): EventoRequest => ({
    titulo: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: "",
    carreras: [],
    usuarios: [],
    requiere_registro: false,
    estado: "ACTIVO",
    imagen_portada: null,
});

const toDateTimeLocalInput = (value?: string | null): string => {
    if (!value) return "";

    const normalized = String(value).trim();
    if (!normalized) return "";

    if (normalized.length >= 16 && normalized.includes("T")) {
        const parsed = new Date(normalized);
        if (!Number.isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, "0");
            const day = String(parsed.getDate()).padStart(2, "0");
            const hours = String(parsed.getHours()).padStart(2, "0");
            const minutes = String(parsed.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        return normalized.slice(0, 16);
    }

    return normalized;
};

const toApiDateTime = (value?: string | null): string => {
    if (!value) return "";

    const trimmed = value.trim();
    if (!trimmed) return "";

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed}:00`;
    }

    return trimmed;
};

const formatApiError = (err: any): string => {
    const data = err?.response?.data;

    if (!data) {
        return err?.message || "Ocurrió un error inesperado al guardar el evento.";
    }

    if (typeof data === "string") {
        return data;
    }

    if (typeof data === "object") {
        const lines: string[] = [];

        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                lines.push(`${key}: ${value.join(", ")}`);
                return;
            }

            if (typeof value === "string") {
                lines.push(`${key}: ${value}`);
                return;
            }

            lines.push(`${key}: ${JSON.stringify(value)}`);
        });

        return lines.join("\n");
    }

    return "No se pudo interpretar la respuesta del servidor.";
};

const EventoForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState<EventoRequest>(createInitialForm());
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);
    const [baseLoading, setBaseLoading] = useState<boolean>(true);

    const [apiError, setApiError] = useState<string>("");
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const carreraOptions: CarreraOption[] = useMemo(() => {
        return carreras.map((carrera) => ({
            value: Number(carrera.id),
            label: `${carrera.nombre}${carrera.codigo ? ` (${carrera.codigo})` : ""}`,
        }));
    }, [carreras]);

    const selectedCarreras = useMemo(() => {
        return carreraOptions.filter((option) => form.carreras?.includes(option.value));
    }, [carreraOptions, form.carreras]);

    const alcanceLabel = useMemo(() => {
        const count = form.carreras?.length ?? 0;
        if (!count) return "Evento global para toda la comunidad Alumni";
        if (count === 1) return "Evento segmentado para una carrera";
        return `Evento segmentado para ${count} carreras`;
    }, [form.carreras]);

    const inscritosActuales = useMemo(() => {
        return Array.isArray(form.usuarios) ? form.usuarios.length : 0;
    }, [form.usuarios]);

    useEffect(() => {
        const cargarBase = async (): Promise<void> => {
            try {
                setBaseLoading(true);
                const carrerasData = await CarreraService.list();
                setCarreras(Array.isArray(carrerasData) ? carrerasData : []);
            } catch (err) {
                console.error("No se pudieron cargar las carreras.", err);
                const detail = notifyAdminError("Error al cargar carreras del formulario de eventos.", err);
                setApiError(detail);
            } finally {
                setBaseLoading(false);
            }
        };

        void cargarBase();
    }, []);

    useEffect(() => {
        const cargarEvento = async (): Promise<void> => {
            if (!id) {
                setInitialLoading(false);
                return;
            }

            try {
                setInitialLoading(true);

                const data: Evento = await EventoService.get(Number(id));

                setForm({
                    id: data.id,
                    titulo: data.titulo ?? "",
                    descripcion: data.descripcion ?? "",
                    fecha_inicio: toDateTimeLocalInput(data.fecha_inicio),
                    fecha_fin: toDateTimeLocalInput(data.fecha_fin),
                    carreras: Array.isArray(data.carreras)
                        ? data.carreras.map((carreraId) => Number(carreraId))
                        : [],
                    usuarios: Array.isArray(data.usuarios) ? data.usuarios : [],
                    requiere_registro: Boolean(data.requiere_registro),
                    estado: data.estado ?? "ACTIVO",
                    imagen_portada: data.imagen_portada ?? null,
                });

                if (data.imagen_portada) {
                    setImagenPreview(String(data.imagen_portada));
                }
            } catch (err) {
                console.error("No se pudo cargar el evento.", err);
                const detail = notifyAdminError("Error al cargar el evento para edicion.", err);
                setApiError(detail);
            } finally {
                setInitialLoading(false);
            }
        };

        void cargarEvento();
    }, [id]);

    useEffect(() => {
        return () => {
            if (imagenPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(imagenPreview);
            }
        };
    }, [imagenPreview]);

    const setFieldError = (field: keyof FormErrors, message?: string) => {
        setFormErrors((prev) => ({
            ...prev,
            [field]: message,
        }));
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;

        const normalizedValue =
            type === "checkbox" && e.target instanceof HTMLInputElement
                ? e.target.checked
                : value;

        setForm((prev) => ({
            ...prev,
            [name]: normalizedValue,
        }));

        if (name in formErrors) {
            setFieldError(name as keyof FormErrors, undefined);
        }

        if (name === "fecha_inicio" || name === "fecha_fin") {
            setFieldError("fecha_inicio", undefined);
            setFieldError("fecha_fin", undefined);
        }

        setApiError("");
    };

    const handleCarrerasChange = (selectedOptions: MultiValue<CarreraOption>) => {
        setForm((prev) => ({
            ...prev,
            carreras: selectedOptions.map((option) => option.value),
        }));

        setFieldError("carreras", undefined);
        setApiError("");
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (imagenPreview?.startsWith("blob:")) {
            URL.revokeObjectURL(imagenPreview);
        }

        setForm((prev) => ({
            ...prev,
            imagen_portada: file,
        }));

        setImagenPreview(URL.createObjectURL(file));
        setApiError("");
    };

    const validateForm = (): boolean => {
        const nextErrors: FormErrors = {};

        if (!form.titulo.trim()) {
            nextErrors.titulo = "El título del evento es obligatorio.";
        } else if (form.titulo.trim().length < 4) {
            nextErrors.titulo = "El título debe tener al menos 4 caracteres.";
        }

        if (!form.descripcion?.trim()) {
            nextErrors.descripcion = "La descripción del evento es obligatoria.";
        } else if (form.descripcion.trim().length < 12) {
            nextErrors.descripcion = "La descripción debe aportar un poco más de contexto.";
        }

        if (!form.fecha_inicio) {
            nextErrors.fecha_inicio = "La fecha y hora de inicio son obligatorias.";
        }

        if (form.fecha_inicio && form.fecha_fin) {
            const inicio = new Date(form.fecha_inicio);
            const fin = new Date(form.fecha_fin);

            if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime()) && fin < inicio) {
                nextErrors.fecha_fin =
                    "La fecha y hora de finalización no pueden ser anteriores al inicio.";
            }
        }

        if (!form.estado) {
            nextErrors.estado = "Debes seleccionar un estado para el evento.";
        }

        setFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const construirPayload = (): FormData => {
        const formData = new FormData();

        formData.append("titulo", form.titulo.trim());
        formData.append("descripcion", (form.descripcion ?? "").trim());
        formData.append("fecha_inicio", toApiDateTime(form.fecha_inicio));
        formData.append("estado", form.estado);
        formData.append("requiere_registro", String(form.requiere_registro));
        formData.append("carreras", JSON.stringify((form.carreras ?? []).map(Number)));
        formData.append("usuarios", JSON.stringify(form.usuarios ?? []));

        if (form.fecha_fin?.trim()) {
            formData.append("fecha_fin", toApiDateTime(form.fecha_fin));
        }

        if (form.imagen_portada instanceof File) {
            formData.append("imagen_portada", form.imagen_portada);
        }

        return formData;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;

        setApiError("");

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const payload = construirPayload();

            if (form.id) {
                await EventoService.update(form.id, payload);
            } else {
                await EventoService.create(payload);
            }

            notifySuccess(form.id ? "Evento actualizado correctamente." : "Evento creado correctamente.");
            navigate(Routes.ADMIN.EVENTOS.LIST);
        } catch (err: any) {
            console.error("Error al guardar el evento.", err);
            const detail = notifyAdminError("No se pudo guardar el evento.", err);
            setApiError(detail || formatApiError(err));
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading || baseLoading) {
        return (
            <div className="evento-form-page">
                <div className="container py-5">
                    <div className="evento-form-feedback animate__animated animate__fadeIn">
                        <div className="spinner-border text-warning" role="status" />
                        <p className="mt-3 mb-0">
                            {initialLoading ? "Cargando evento..." : "Cargando catálogos..."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="evento-form-page">
            <section className="evento-form-hero animate__animated animate__fadeIn">
                <div className="container">
                    <div className="evento-form-hero__content">
                        <div className="evento-form-hero__copy">
                            <span className="evento-form-hero__eyebrow">
                                <FaUniversity />
                                Panel administrativo NUR
                            </span>

                            <h1 className="evento-form-hero__title">
                                {isEdit ? "Editar evento" : "Nuevo evento"}
                            </h1>

                            <p className="evento-form-hero__text">
                                Configura el evento con fechas y horas reales, alcance por carrera,
                                estado operativo, visibilidad institucional y soporte visual de
                                portada, manteniendo una edición clara y consistente con la línea
                                sobria del sistema.
                            </p>
                        </div>

                        <div className="evento-form-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => navigate(Routes.ADMIN.EVENTOS.LIST)}
                                disabled={loading}
                            >
                                <FaArrowLeft />
                                <span>Volver al listado</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="evento-form-content">
                <div className="container">
                    <form
                        onSubmit={handleSubmit}
                        className="evento-form-card animate__animated animate__fadeInUp"
                    >
                        <div className="evento-form-card__header">
                            <div>
                                <span className="evento-form-card__eyebrow">
                                    Formulario institucional
                                </span>
                                <h3 className="evento-form-card__title">
                                    {isEdit
                                        ? "Actualizar información del evento"
                                        : "Registrar nuevo evento"}
                                </h3>
                            </div>

                            <div className="evento-form-card__status">
                                <span className="evento-form-status-chip">
                                    {form.id ? "Modo edición" : "Modo creación"}
                                </span>
                            </div>
                        </div>

                        {apiError && (
                            <div className="evento-form-alert">
                                <strong>No se pudo guardar el evento</strong>
                                <pre>{apiError}</pre>
                            </div>
                        )}

                        <div className="evento-form-grid">
                            <div className="evento-form-main">
                                <div className="evento-form-section">
                                    <div className="evento-form-section__title">
                                        <FaInfoCircle />
                                        <span>Información general</span>
                                    </div>

                                    <div className="evento-form-fields">
                                        <div className="evento-form-field evento-form-field--full">
                                            <label htmlFor="titulo">
                                                <FaListAlt />
                                                <span>Título del evento</span>
                                            </label>
                                            <input
                                                id="titulo"
                                                type="text"
                                                name="titulo"
                                                value={form.titulo}
                                                onChange={handleChange}
                                                className={`form-control ${
                                                    formErrors.titulo ? "is-invalid" : ""
                                                }`}
                                                placeholder="Ej. Encuentro Alumni de Ingeniería de Sistemas"
                                                maxLength={180}
                                                required
                                            />
                                            {formErrors.titulo && (
                                                <small className="evento-form-field__error">
                                                    {formErrors.titulo}
                                                </small>
                                            )}
                                        </div>

                                        <div className="evento-form-field evento-form-field--full">
                                            <label htmlFor="descripcion">
                                                <FaAlignLeft />
                                                <span>Descripción</span>
                                            </label>
                                            <textarea
                                                id="descripcion"
                                                name="descripcion"
                                                value={form.descripcion ?? ""}
                                                onChange={handleChange}
                                                className={`form-control ${
                                                    formErrors.descripcion ? "is-invalid" : ""
                                                }`}
                                                rows={5}
                                                placeholder="Describe el objetivo, público, dinámica y alcance del evento..."
                                                required
                                            />
                                            {formErrors.descripcion && (
                                                <small className="evento-form-field__error">
                                                    {formErrors.descripcion}
                                                </small>
                                            )}
                                        </div>

                                        <div className="evento-form-field">
                                            <label htmlFor="fecha_inicio">
                                                <FaCalendarAlt />
                                                <span>Inicio</span>
                                            </label>
                                            <input
                                                id="fecha_inicio"
                                                type="datetime-local"
                                                name="fecha_inicio"
                                                value={form.fecha_inicio}
                                                onChange={handleChange}
                                                className={`form-control ${
                                                    formErrors.fecha_inicio ? "is-invalid" : ""
                                                }`}
                                                required
                                            />
                                            {formErrors.fecha_inicio && (
                                                <small className="evento-form-field__error">
                                                    {formErrors.fecha_inicio}
                                                </small>
                                            )}
                                        </div>

                                        <div className="evento-form-field">
                                            <label htmlFor="fecha_fin">
                                                <FaClock />
                                                <span>Finalización</span>
                                            </label>
                                            <input
                                                id="fecha_fin"
                                                type="datetime-local"
                                                name="fecha_fin"
                                                value={form.fecha_fin || ""}
                                                onChange={handleChange}
                                                className={`form-control ${
                                                    formErrors.fecha_fin ? "is-invalid" : ""
                                                }`}
                                            />
                                            {formErrors.fecha_fin && (
                                                <small className="evento-form-field__error">
                                                    {formErrors.fecha_fin}
                                                </small>
                                            )}
                                        </div>

                                        <div className="evento-form-field">
                                            <label htmlFor="estado">
                                                <FaLayerGroup />
                                                <span>Estado</span>
                                            </label>
                                            <select
                                                id="estado"
                                                name="estado"
                                                value={form.estado}
                                                onChange={handleChange}
                                                className={`form-select ${
                                                    formErrors.estado ? "is-invalid" : ""
                                                }`}
                                            >
                                                <option value="ACTIVO">Activo</option>
                                                <option value="FINALIZADO">Finalizado</option>
                                                <option value="CANCELADO">Cancelado</option>
                                            </select>
                                            {formErrors.estado && (
                                                <small className="evento-form-field__error">
                                                    {formErrors.estado}
                                                </small>
                                            )}
                                        </div>

                                        <div className="evento-form-field evento-form-field--full">
                                            <label>
                                                <FaUsers />
                                                <span>Carreras destino</span>
                                            </label>

                                            <Select
                                                isMulti
                                                name="carreras"
                                                options={carreraOptions}
                                                classNamePrefix="evento-select"
                                                value={selectedCarreras}
                                                onChange={handleCarrerasChange}
                                                placeholder="Selecciona una o más carreras o déjalo vacío para evento global"
                                                noOptionsMessage={() => "No hay carreras disponibles"}
                                            />

                                            <small className="evento-form-field__help">
                                                Si no seleccionas carreras, el evento se considera
                                                global y visible para toda la comunidad Alumni.
                                            </small>

                                            {formErrors.carreras && (
                                                <small className="evento-form-field__error">
                                                    {formErrors.carreras}
                                                </small>
                                            )}
                                        </div>

                                        <div className="evento-form-field evento-form-field--full">
                                            <div className="evento-form-switch">
                                                <label className="form-check form-switch mb-0">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        name="requiere_registro"
                                                        checked={form.requiere_registro}
                                                        onChange={handleChange}
                                                    />
                                                    <span className="evento-form-switch__label">
                                                        <FaToggleOn />
                                                        ¿Requiere inscripción previa?
                                                    </span>
                                                </label>

                                                <p className="evento-form-switch__help">
                                                    Actívalo cuando los usuarios deban registrarse
                                                    antes de participar en la actividad.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <aside className="evento-form-side">
                                <div className="evento-form-section">
                                    <div className="evento-form-section__title">
                                        <FaImage />
                                        <span>Portada visual</span>
                                    </div>

                                    <div className="evento-form-field evento-form-field--full">
                                        <label htmlFor="imagen_portada">Seleccionar imagen</label>
                                        <input
                                            id="imagen_portada"
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={handleImageChange}
                                        />
                                        <small className="evento-form-field__help">
                                            Usa una imagen clara y sobria para representar el evento.
                                        </small>
                                    </div>

                                    {imagenPreview ? (
                                        <div className="evento-form-preview">
                                            <img
                                                src={imagenPreview}
                                                alt="Vista previa del evento"
                                                className="evento-form-preview__image"
                                            />
                                        </div>
                                    ) : (
                                        <div className="evento-form-preview evento-form-preview--empty">
                                            <FaImage />
                                            <p>Aún no hay imagen seleccionada.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="evento-form-section">
                                    <div className="evento-form-section__title">
                                        <FaGlobeAmericas />
                                        <span>Resumen operativo</span>
                                    </div>

                                    <div className="evento-form-summary">
                                        <div className="evento-form-summary__item">
                                            <span className="evento-form-summary__label">Alcance</span>
                                            <strong className="evento-form-summary__value">
                                                {alcanceLabel}
                                            </strong>
                                        </div>

                                        <div className="evento-form-summary__item">
                                            <span className="evento-form-summary__label">
                                                Tipo de acceso
                                            </span>
                                            <strong className="evento-form-summary__value">
                                                {form.requiere_registro
                                                    ? "Con inscripción previa"
                                                    : "Acceso libre"}
                                            </strong>
                                        </div>

                                        <div className="evento-form-summary__item">
                                            <span className="evento-form-summary__label">
                                                Estado actual
                                            </span>
                                            <strong className="evento-form-summary__value">
                                                {form.estado}
                                            </strong>
                                        </div>

                                        {isEdit && (
                                            <div className="evento-form-summary__item">
                                                <span className="evento-form-summary__label">
                                                    Inscritos actuales
                                                </span>
                                                <strong className="evento-form-summary__value">
                                                    {inscritosActuales}
                                                </strong>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="evento-form-actions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={() => navigate(Routes.ADMIN.EVENTOS.LIST)}
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
                                                : isEdit
                                                ? "Guardar cambios"
                                                : "Guardar evento"}
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

export default EventoForm;