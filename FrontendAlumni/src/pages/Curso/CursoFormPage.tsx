/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "animate.css";
import "./CursoFormPage.css";

import { CursoRequest } from "../../models/Curso/CursoRequest";
import { Curso } from "../../models/Curso/Curso";
import { CursoService } from "../../services/alumni/CursoService";
import { Routes } from "../../routes/CONSTANTS";
import { notifyAdminError, notifySuccess } from "../../services/ui/AlertService";

import {
    FaArrowLeft,
    FaBook,
    FaCalendarAlt,
    FaChalkboardTeacher,
    FaFileAlt,
    FaImage,
    FaInfoCircle,
    FaLayerGroup,
    FaSave,
    FaUndo,
    FaUpload,
} from "react-icons/fa";

const resolveCursosListRoute = (): string => {
    const routesAny = Routes as any;

    return (
        routesAny?.ADMIN?.CURSOS?.LIST ||
        routesAny?.CURSOS?.LIST ||
        routesAny?.CURSO?.LIST ||
        "/admin/cursos"
    );
};

const getErrorMessage = (error: unknown): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object"
    ) {
        const response = (error as { response?: { data?: unknown } }).response;
        const data = response?.data;

        if (typeof data === "string") return data;

        if (typeof data === "object" && data !== null) {
            if ("error" in data && typeof (data as { error?: unknown }).error === "string") {
                return (data as { error: string }).error;
            }

            if ("detail" in data && typeof (data as { detail?: unknown }).detail === "string") {
                return (data as { detail: string }).detail;
            }

            try {
                return JSON.stringify(data, null, 2);
            } catch {
                return "Ocurrió un error inesperado al procesar la respuesta del servidor.";
            }
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado.";
};

const getFileNameFromUrl = (value?: string | null): string => {
    if (!value) return "Sin imagen";

    try {
        const clean = value.split("?")[0];
        const parts = clean.split("/");
        return decodeURIComponent(parts[parts.length - 1] || "imagen");
    } catch {
        return "Imagen actual";
    }
};

const CursoFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const isEdit = useMemo(() => Boolean(id), [id]);

    const [form, setForm] = useState<CursoRequest>({
        titulo: "",
        descripcion: "",
        responsable: "",
        modalidad: "PRESENCIAL",
        estado: "ACTIVO",
        fecha_inicio: "",
        fecha_fin: "",
        imagen_portada: null,
        inscritos: [],
    });

    const [loading, setLoading] = useState<boolean>(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);
    const [error, setError] = useState<string>("");

    const [previewImg, setPreviewImg] = useState<string | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        const cargarCurso = async (): Promise<void> => {
            if (!isEdit || !id) {
                setInitialLoading(false);
                return;
            }

            try {
                setInitialLoading(true);
                setError("");

                const data: Curso = await CursoService.get(Number(id));

                setForm({
                    id: data.id,
                    titulo: data.titulo ?? "",
                    descripcion: data.descripcion ?? "",
                    responsable: data.responsable ?? "",
                    modalidad: data.modalidad ?? "PRESENCIAL",
                    estado: data.estado ?? "ACTIVO",
                    fecha_inicio: data.fecha_inicio ?? "",
                    fecha_fin: data.fecha_fin ?? "",
                    imagen_portada: data.imagen_portada ?? null,
                    inscritos: data.inscritos ?? [],
                });

                setCurrentImageUrl(data.imagen_portada ?? null);
                setPreviewImg(data.imagen_portada ?? null);
            } catch (loadError) {
                console.error("Error al cargar el curso.", loadError);
                const detail = notifyAdminError("Error al cargar el curso para edicion.", loadError);
                setError(detail);
            } finally {
                setInitialLoading(false);
            }
        };

        void cargarCurso();
    }, [id, isEdit]);

    useEffect(() => {
        return () => {
            if (previewImg && imageFile) {
                URL.revokeObjectURL(previewImg);
            }
        };
    }, [previewImg, imageFile]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ): void => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0] ?? null;

        if (previewImg && imageFile) {
            URL.revokeObjectURL(previewImg);
        }

        setImageFile(file);

        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreviewImg(objectUrl);
        } else {
            setPreviewImg(currentImageUrl);
        }
    };

    const validateForm = (): string | null => {
        if (!form.titulo.trim()) return "El título del curso es obligatorio.";
        if (!form.responsable.trim()) return "El responsable del curso es obligatorio.";
        if (!form.fecha_inicio) return "La fecha de inicio es obligatoria.";

        if (form.fecha_fin && form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
            return "La fecha de finalización no puede ser anterior a la fecha de inicio.";
        }

        return null;
    };

    const buildPayload = (): FormData => {
        const data = new FormData();

        data.append("titulo", form.titulo.trim());
        data.append("descripcion", form.descripcion?.trim() || "");
        data.append("responsable", form.responsable.trim());
        data.append("modalidad", form.modalidad);
        data.append("estado", form.estado);
        data.append("fecha_inicio", form.fecha_inicio);
        data.append("fecha_fin", form.fecha_fin || "");

        const inscritos = form.inscritos ?? [];
        data.append("inscritos", JSON.stringify(inscritos));

        if (imageFile) {
            data.append("imagen_portada", imageFile);
        }

        return data;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError("");

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);

            const payload = buildPayload();

            if (isEdit && id) {
                await CursoService.update(Number(id), payload);
            } else {
                await CursoService.create(payload);
            }

            notifySuccess(isEdit ? "Curso actualizado correctamente." : "Curso creado correctamente.");
            navigate(resolveCursosListRoute());
        } catch (submitError) {
            console.error("Error al guardar el curso.", submitError);
            const detail = notifyAdminError("No se pudo guardar el curso.", submitError);
            setError(detail || getErrorMessage(submitError));
        } finally {
            setLoading(false);
        }
    };

    const heroTitle = isEdit ? "Editar curso" : "Registrar curso";
    const heroText = isEdit
        ? "Actualiza la información académica, fechas, estado, modalidad y material visual del curso."
        : "Crea un nuevo curso para el portal Alumni, definiendo responsable, modalidad, estado y fechas clave.";

    const modalidadLabel =
        form.modalidad === "PRESENCIAL"
            ? "Presencial"
            : form.modalidad === "VIRTUAL"
            ? "Virtual"
            : "Mixto";

    const estadoLabel =
        form.estado === "ACTIVO"
            ? "Activo"
            : form.estado === "INACTIVO"
            ? "Inactivo"
            : form.estado === "FINALIZADO"
            ? "Finalizado"
            : "Cancelado";

    if (initialLoading) {
        return (
            <div className="curso-form-page animate__animated animate__fadeIn">
                <section className="curso-form-content">
                    <div className="container">
                        <div className="curso-form-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando curso...</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="curso-form-page animate__animated animate__fadeIn">
            <section className="curso-form-hero">
                <div className="container">
                    <div className="curso-form-hero__content">
                        <div className="curso-form-hero__copy">
                            <span className="curso-form-hero__eyebrow">
                                <FaBook />
                                Gestión de cursos
                            </span>

                            <h1 className="curso-form-hero__title">{heroTitle}</h1>

                            <p className="curso-form-hero__text">{heroText}</p>

                            <div className="curso-form-hero__chips">
                                <span className="curso-form-hero__chip">
                                    <FaLayerGroup />
                                    <span>{modalidadLabel}</span>
                                </span>

                                <span className="curso-form-hero__chip">
                                    <FaCalendarAlt />
                                    <span>
                                        {form.fecha_inicio
                                            ? `Inicio: ${form.fecha_inicio}`
                                            : "Sin fecha de inicio"}
                                    </span>
                                </span>

                                <span className="curso-form-hero__chip">
                                    <FaFileAlt />
                                    <span>{estadoLabel}</span>
                                </span>
                            </div>
                        </div>

                        <div className="curso-form-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => navigate(resolveCursosListRoute())}
                                disabled={loading}
                            >
                                <FaArrowLeft />
                                <span>Volver al listado</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="curso-form-content">
                <div className="container">
                    <form onSubmit={handleSubmit}>
                        <div className="curso-form-card">
                            <div className="curso-form-card__header">
                                <div>
                                    <span className="curso-form-card__eyebrow">Panel administrativo</span>
                                    <h2 className="curso-form-card__title">Configuración del curso</h2>
                                </div>

                                <div className="curso-form-card__icon">
                                    <FaBook />
                                </div>
                            </div>

                            {error && (
                                <div className="curso-form-alert">
                                    <FaInfoCircle />
                                    <pre>{error}</pre>
                                </div>
                            )}

                            <div className="curso-form-grid">
                                <div className="curso-form-main">
                                    <section className="curso-form-section">
                                        <div className="curso-form-section__header">
                                            <h3>Información general</h3>
                                            <p>
                                                Define el contenido principal del curso y los metadatos
                                                necesarios para publicarlo correctamente.
                                            </p>
                                        </div>

                                        <div className="curso-form-fields">
                                            <div className="curso-form-field curso-form-field--full">
                                                <label htmlFor="titulo">
                                                    <FaFileAlt />
                                                    <span>Título del curso</span>
                                                </label>
                                                <input
                                                    id="titulo"
                                                    name="titulo"
                                                    type="text"
                                                    className="form-control"
                                                    value={form.titulo}
                                                    onChange={handleChange}
                                                    placeholder="Ej. Introducción a React para Alumni"
                                                    disabled={loading}
                                                />
                                            </div>

                                            <div className="curso-form-field">
                                                <label htmlFor="responsable">
                                                    <FaChalkboardTeacher />
                                                    <span>Responsable</span>
                                                </label>
                                                <input
                                                    id="responsable"
                                                    name="responsable"
                                                    type="text"
                                                    className="form-control"
                                                    value={form.responsable}
                                                    onChange={handleChange}
                                                    placeholder="Nombre del docente o encargado"
                                                    disabled={loading}
                                                />
                                            </div>

                                            <div className="curso-form-field">
                                                <label htmlFor="modalidad">
                                                    <FaLayerGroup />
                                                    <span>Modalidad</span>
                                                </label>
                                                <select
                                                    id="modalidad"
                                                    name="modalidad"
                                                    className="form-select"
                                                    value={form.modalidad}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                >
                                                    <option value="PRESENCIAL">Presencial</option>
                                                    <option value="VIRTUAL">Virtual</option>
                                                    <option value="MIXTO">Mixto</option>
                                                </select>
                                            </div>

                                            <div className="curso-form-field">
                                                <label htmlFor="estado">
                                                    <FaFileAlt />
                                                    <span>Estado</span>
                                                </label>
                                                <select
                                                    id="estado"
                                                    name="estado"
                                                    className="form-select"
                                                    value={form.estado}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                >
                                                    <option value="ACTIVO">Activo</option>
                                                    <option value="INACTIVO">Inactivo</option>
                                                    <option value="FINALIZADO">Finalizado</option>
                                                    <option value="CANCELADO">Cancelado</option>
                                                </select>
                                            </div>

                                            <div className="curso-form-field">
                                                <label htmlFor="fecha_inicio">
                                                    <FaCalendarAlt />
                                                    <span>Fecha de inicio</span>
                                                </label>
                                                <input
                                                    id="fecha_inicio"
                                                    name="fecha_inicio"
                                                    type="date"
                                                    className="form-control"
                                                    value={form.fecha_inicio}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                />
                                            </div>

                                            <div className="curso-form-field">
                                                <label htmlFor="fecha_fin">
                                                    <FaCalendarAlt />
                                                    <span>Fecha de finalización</span>
                                                </label>
                                                <input
                                                    id="fecha_fin"
                                                    name="fecha_fin"
                                                    type="date"
                                                    className="form-control"
                                                    value={form.fecha_fin || ""}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                />
                                            </div>

                                            <div className="curso-form-field curso-form-field--full">
                                                <label htmlFor="descripcion">
                                                    <FaFileAlt />
                                                    <span>Descripción</span>
                                                </label>
                                                <textarea
                                                    id="descripcion"
                                                    name="descripcion"
                                                    className="form-control"
                                                    rows={6}
                                                    value={form.descripcion || ""}
                                                    onChange={handleChange}
                                                    placeholder="Describe el alcance, contenidos, objetivos o beneficios del curso"
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="curso-form-section">
                                        <div className="curso-form-section__header">
                                            <h3>Portada visual</h3>
                                            <p>
                                                Adjunta una imagen que represente el curso dentro del
                                                catálogo y del detalle de visualización.
                                            </p>
                                        </div>

                                        <div className="curso-form-fields">
                                            <div className="curso-form-field curso-form-field--full">
                                                <label htmlFor="imagen_portada">
                                                    <FaImage />
                                                    <span>Imagen de portada</span>
                                                </label>

                                                <label className="curso-form-upload" htmlFor="imagen_portada">
                                                    <FaUpload />
                                                    <div>
                                                        <strong>
                                                            {imageFile?.name ||
                                                                getFileNameFromUrl(currentImageUrl) ||
                                                                "Seleccionar imagen"}
                                                        </strong>
                                                        <span>
                                                            JPG, PNG o WEBP para enriquecer la visualización del curso.
                                                        </span>
                                                    </div>
                                                </label>

                                                <input
                                                    id="imagen_portada"
                                                    name="imagen_portada"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    disabled={loading}
                                                    hidden
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <aside className="curso-form-side">
                                    <section className="curso-form-section">
                                        <div className="curso-form-section__header">
                                            <h3>Vista previa</h3>
                                            <p>Comprueba la portada y el resumen general del curso.</p>
                                        </div>

                                        <div className="curso-form-preview">
                                            {previewImg ? (
                                                <img
                                                    src={previewImg}
                                                    alt={form.titulo || "Vista previa del curso"}
                                                    className="curso-form-preview__image"
                                                />
                                            ) : (
                                                <div className="curso-form-preview--empty">
                                                    <FaImage />
                                                    <span>Sin imagen de portada</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="curso-form-summary">
                                            <div className="curso-form-summary__item">
                                                <span className="curso-form-summary__label">Título</span>
                                                <strong>{form.titulo || "Sin título"}</strong>
                                            </div>

                                            <div className="curso-form-summary__item">
                                                <span className="curso-form-summary__label">Responsable</span>
                                                <strong>{form.responsable || "No definido"}</strong>
                                            </div>

                                            <div className="curso-form-summary__item">
                                                <span className="curso-form-summary__label">Modalidad</span>
                                                <strong>{modalidadLabel}</strong>
                                            </div>

                                            <div className="curso-form-summary__item">
                                                <span className="curso-form-summary__label">Estado</span>
                                                <strong>{estadoLabel}</strong>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="curso-form-actions">
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--ghost"
                                            onClick={() => navigate(resolveCursosListRoute())}
                                            disabled={loading}
                                        >
                                            <FaUndo />
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
                                                    : "Guardar curso"}
                                            </span>
                                        </button>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default CursoFormPage;