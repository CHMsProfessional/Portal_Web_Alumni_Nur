import { ChangeEvent, FormEvent, JSX, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "animate.css";
import {
    FaArrowLeft,
    FaBook,
    FaDumbbell,
    FaExternalLinkAlt,
    FaFileAlt,
    FaGraduationCap,
    FaInfoCircle,
    FaSave,
    FaToolbox,
} from "react-icons/fa";

import "./ServicioAlumniForm.css";

import { ServicioAlumni } from "../../models/ServicioAlumni/ServicioAlumni";
import { ServicioAlumniRequest } from "../../models/ServicioAlumni/ServicioAlumniRequest";
import { ServicioAlumniService } from "../../services/alumni/ServicioAlumniService";
import { Routes } from "../../routes/CONSTANTS";

const opcionesTipo: Array<{
    value: ServicioAlumniRequest["tipo"];
    label: string;
    icon: JSX.Element;
    description: string;
}> = [
        {
            value: "educacion",
            label: "Educación",
            icon: <FaGraduationCap />,
            description:
                "Beneficios académicos, formación continua y oportunidades educativas.",
        },
        {
            value: "biblioteca",
            label: "Biblioteca",
            icon: <FaBook />,
            description:
                "Recursos bibliográficos, consulta y acceso a material institucional.",
        },
        {
            value: "deporte",
            label: "Deporte",
            icon: <FaDumbbell />,
            description:
                "Actividades deportivas, bienestar y beneficios de recreación física.",
        },
        {
            value: "otros",
            label: "Otros",
            icon: <FaToolbox />,
            description:
                "Servicios complementarios y beneficios adicionales para Alumni.",
        },
    ];

type FieldErrors = {
    nombre?: string;
    descripcion?: string;
    link?: string;
};

const obtenerTipoInfo = (tipo?: ServicioAlumniRequest["tipo"]) => {
    return (
        opcionesTipo.find((opcion) => opcion.value === tipo) ??
        opcionesTipo.find((opcion) => opcion.value === "otros")!
    );
};

const safeNumber = (value?: string): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const prettyBackendError = (err: unknown): string => {
    const error = err as {
        response?: { data?: unknown };
        message?: string;
    };

    const data = error?.response?.data;

    if (!data) {
        return error?.message || "Ocurrió un error inesperado.";
    }

    if (typeof data === "string") {
        return data;
    }

    if (typeof data === "object") {
        try {
            return JSON.stringify(data, null, 2);
        } catch {
            return "No se pudo interpretar la respuesta de error del servidor.";
        }
    }

    return "Ocurrió un error inesperado.";
};

const isValidOptionalUrl = (value?: string | null): boolean => {
    const trimmed = value?.trim();
    if (!trimmed) return true;

    try {
        const url = new URL(trimmed);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const ServicioAlumniForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const servicioId = useMemo(() => safeNumber(id), [id]);
    const isEditing = useMemo(() => Boolean(id), [id]);

    const [formData, setFormData] = useState<ServicioAlumniRequest>({
        nombre: "",
        tipo: "educacion",
        descripcion: "",
        icono: "",
        link: "",
    });

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [initialLoading, setInitialLoading] = useState<boolean>(isEditing);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const cargarServicio = async (): Promise<void> => {
            if (!isEditing) return;

            if (!servicioId) {
                setError("El identificador del servicio no es válido.");
                setInitialLoading(false);
                return;
            }

            try {
                setInitialLoading(true);
                setError("");

                const data: ServicioAlumni = await ServicioAlumniService.get(servicioId);

                setFormData({
                    id: data.id,
                    nombre: data.nombre ?? "",
                    tipo: data.tipo ?? "educacion",
                    descripcion: data.descripcion ?? "",
                    icono: data.icono ?? "",
                    link: data.link ?? "",
                });
            } catch (err) {
                console.error("No se pudo cargar el servicio.", err);
                setError("No se pudo cargar el servicio solicitado.");
            } finally {
                setInitialLoading(false);
            }
        };

        void cargarServicio();
    }, [isEditing, servicioId]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setFieldErrors((prev) => ({
            ...prev,
            [name]: undefined,
        }));

        if (error) {
            setError("");
        }
    };

    const validateForm = (): boolean => {
        const nextErrors: FieldErrors = {};

        if (!formData.nombre?.trim()) {
            nextErrors.nombre = "El nombre del servicio es obligatorio.";
        } else if (formData.nombre.trim().length < 4) {
            nextErrors.nombre = "El nombre debe tener al menos 4 caracteres.";
        }

        if (!formData.descripcion?.trim()) {
            nextErrors.descripcion = "La descripción es obligatoria.";
        } else if (formData.descripcion.trim().length < 10) {
            nextErrors.descripcion =
                "La descripción debe tener al menos 10 caracteres.";
        }

        if (!isValidOptionalUrl(formData.link)) {
            nextErrors.link =
                "El enlace debe comenzar con http:// o https:// y ser válido.";
        }

        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const construirPayload = (): ServicioAlumniRequest => {
        return {
            nombre: formData.nombre.trim(),
            tipo: formData.tipo,
            descripcion: formData.descripcion.trim(),
            icono: formData.icono?.trim() || null,
            link: formData.link?.trim() || null,
        };
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (loading) return;

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const payload = construirPayload();

            if (isEditing) {
                if (!servicioId) {
                    throw new Error("No se puede editar el servicio: ID inválido.");
                }

                await ServicioAlumniService.update(servicioId, payload);
            } else {
                await ServicioAlumniService.create(payload);
            }

            navigate(Routes.ADMIN.SERVICIOS.LIST);
        } catch (err) {
            console.error("No se pudo guardar el servicio.", err);
            setError(prettyBackendError(err));
        } finally {
            setLoading(false);
        }
    };

    const tipoSeleccionado = obtenerTipoInfo(formData.tipo);
    const tieneLinkValido = isValidOptionalUrl(formData.link) && Boolean(formData.link?.trim());

    if (initialLoading) {
        return (
            <div className="servicio-form-page animate__animated animate__fadeIn">
                <div className="container py-5">
                    <div className="servicio-form-feedback">
                        <div className="spinner-border text-warning" role="status" />
                        <p className="mt-3 mb-0">Cargando servicio...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="servicio-form-page animate__animated animate__fadeIn">
            <section className="servicio-form-hero">
                <div className="container">
                    <div className="servicio-form-hero__content">
                        <div className="servicio-form-hero__copy">
                            <span className="servicio-form-hero__eyebrow">
                                <FaToolbox />
                                Panel administrativo NUR
                            </span>

                            <h1 className="servicio-form-hero__title">
                                {isEditing ? "Editar servicio Alumni" : "Nuevo servicio Alumni"}
                            </h1>

                            <p className="servicio-form-hero__text">
                                Registra beneficios y servicios disponibles para la comunidad
                                Alumni de la Universidad NUR. El formulario mantiene el contrato
                                actual del dominio, con mejor validación y feedback de edición.
                            </p>
                        </div>

                        <div className="servicio-form-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => navigate(Routes.ADMIN.SERVICIOS.LIST)}
                                disabled={loading}
                            >
                                <FaArrowLeft />
                                <span>Volver al listado</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="servicio-form-content">
                <div className="container">
                    <form
                        onSubmit={handleSubmit}
                        className="servicio-form-card animate__animated animate__fadeInUp"
                    >
                        <div className="servicio-form-card__header">
                            <div>
                                <span className="servicio-form-card__eyebrow">
                                    Formulario institucional
                                </span>
                                <h3 className="servicio-form-card__title">
                                    {isEditing
                                        ? "Actualizar información del servicio"
                                        : "Registrar nuevo servicio"}
                                </h3>
                            </div>

                            {isEditing && servicioId ? (
                                <span className="servicio-form-card__id">ID #{servicioId}</span>
                            ) : null}
                        </div>

                        {error && (
                            <div className="servicio-form-alert" role="alert">
                                <strong>No se pudo guardar el servicio.</strong>
                                <pre>{error}</pre>
                            </div>
                        )}

                        <div className="servicio-form-grid">
                            <div className="servicio-form-main">
                                <div className="servicio-form-section">
                                    <div className="servicio-form-section__title">
                                        <FaFileAlt />
                                        <span>Información principal</span>
                                    </div>

                                    <div className="servicio-form-fields">
                                        <div className="servicio-form-field servicio-form-field--full">
                                            <label htmlFor="nombre">
                                                <FaToolbox />
                                                <span>Nombre del servicio</span>
                                            </label>
                                            <input
                                                id="nombre"
                                                type="text"
                                                name="nombre"
                                                className={`form-control ${fieldErrors.nombre ? "is-invalid" : ""}`}
                                                value={formData.nombre}
                                                onChange={handleChange}
                                                placeholder="Ej. Acceso a biblioteca digital"
                                                required
                                            />
                                            {fieldErrors.nombre ? (
                                                <small className="servicio-form-field__error">
                                                    {fieldErrors.nombre}
                                                </small>
                                            ) : (
                                                <small className="servicio-form-field__help">
                                                    Usa un nombre claro y reconocible para el usuario final.
                                                </small>
                                            )}
                                        </div>

                                        <div className="servicio-form-field">
                                            <label htmlFor="tipo">
                                                <FaInfoCircle />
                                                <span>Tipo</span>
                                            </label>
                                            <select
                                                id="tipo"
                                                name="tipo"
                                                className="form-select"
                                                value={formData.tipo}
                                                onChange={handleChange}
                                                required
                                            >
                                                {opcionesTipo.map((opcion) => (
                                                    <option key={opcion.value} value={opcion.value}>
                                                        {opcion.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <small className="servicio-form-field__help">
                                                Define la categoría funcional del beneficio.
                                            </small>
                                        </div>

                                        <div className="servicio-form-field">
                                            <label htmlFor="icono">
                                                <FaToolbox />
                                                <span>Ícono (opcional)</span>
                                            </label>
                                            <input
                                                id="icono"
                                                type="text"
                                                name="icono"
                                                className="form-control"
                                                value={formData.icono ?? ""}
                                                onChange={handleChange}
                                                placeholder="Ej. fa-book-open"
                                            />
                                            <small className="servicio-form-field__help">
                                                Texto de referencia para identificar el ícono configurado.
                                            </small>
                                        </div>

                                        <div className="servicio-form-field servicio-form-field--full">
                                            <label htmlFor="descripcion">
                                                <FaFileAlt />
                                                <span>Descripción</span>
                                            </label>
                                            <textarea
                                                id="descripcion"
                                                name="descripcion"
                                                className={`form-control ${fieldErrors.descripcion ? "is-invalid" : ""}`}
                                                rows={7}
                                                value={formData.descripcion}
                                                onChange={handleChange}
                                                placeholder="Describe claramente el beneficio, alcance o utilidad del servicio..."
                                                required
                                            />
                                            {fieldErrors.descripcion ? (
                                                <small className="servicio-form-field__error">
                                                    {fieldErrors.descripcion}
                                                </small>
                                            ) : (
                                                <small className="servicio-form-field__help">
                                                    Explica el beneficio, alcance, condiciones o utilidad.
                                                </small>
                                            )}
                                        </div>

                                        <div className="servicio-form-field servicio-form-field--full">
                                            <label htmlFor="link">
                                                <FaExternalLinkAlt />
                                                <span>Enlace externo (opcional)</span>
                                            </label>
                                            <input
                                                id="link"
                                                type="url"
                                                name="link"
                                                className={`form-control ${fieldErrors.link ? "is-invalid" : ""}`}
                                                value={formData.link ?? ""}
                                                onChange={handleChange}
                                                placeholder="https://..."
                                            />
                                            {fieldErrors.link ? (
                                                <small className="servicio-form-field__error">
                                                    {fieldErrors.link}
                                                </small>
                                            ) : (
                                                <small className="servicio-form-field__help">
                                                    Inclúyelo solo si existe una página o recurso oficial.
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <aside className="servicio-form-side">
                                <div className="servicio-form-section servicio-form-section--highlight">
                                    <div className="servicio-form-section__title">
                                        {tipoSeleccionado.icon}
                                        <span>Resumen del tipo</span>
                                    </div>

                                    <div className="servicio-form-typeCard">
                                        <div className="servicio-form-typeCard__icon">
                                            {tipoSeleccionado.icon}
                                        </div>

                                        <div className="servicio-form-typeCard__content">
                                            <h4>{tipoSeleccionado.label}</h4>
                                            <p>{tipoSeleccionado.description}</p>
                                        </div>
                                    </div>

                                    <div className="servicio-form-summary">
                                        <div className="servicio-form-summary__item">
                                            <span className="servicio-form-summary__label">Nombre</span>
                                            <strong className="servicio-form-summary__value">
                                                {formData.nombre?.trim() || "Pendiente"}
                                            </strong>
                                        </div>

                                        <div className="servicio-form-summary__item">
                                            <span className="servicio-form-summary__label">Tipo</span>
                                            <strong className="servicio-form-summary__value">
                                                {tipoSeleccionado.label}
                                            </strong>
                                        </div>

                                        <div className="servicio-form-summary__item">
                                            <span className="servicio-form-summary__label">Estado del enlace</span>
                                            <strong className="servicio-form-summary__value">
                                                {tieneLinkValido ? "Configurado" : "No configurado"}
                                            </strong>
                                        </div>
                                    </div>

                                    {tieneLinkValido ? (
                                        <a
                                            href={formData.link ?? ""}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="servicio-form-previewLink"
                                        >
                                            <FaExternalLinkAlt />
                                            <span>Probar enlace configurado</span>
                                        </a>
                                    ) : null}

                                    <div className="servicio-form-hints">
                                        <div className="servicio-form-hint">
                                            <strong>Nombre</strong>
                                            <span>
                                                Usa un título claro y reconocible para el usuario final.
                                            </span>
                                        </div>
                                        <div className="servicio-form-hint">
                                            <strong>Descripción</strong>
                                            <span>
                                                Explica el beneficio, condiciones o alcance del servicio.
                                            </span>
                                        </div>
                                        <div className="servicio-form-hint">
                                            <strong>Enlace</strong>
                                            <span>
                                                Inclúyelo solo si existe una página o recurso oficial externo.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="servicio-form-actions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={() => navigate(Routes.ADMIN.SERVICIOS.LIST)}
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
                                                    : "Guardar servicio"}
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

export default ServicioAlumniForm;