import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Select, { MultiValue } from "react-select";
import "animate.css";
import {
    FaArrowLeft,
    FaCamera,
    FaComments,
    FaGraduationCap,
    FaImage,
    FaInfoCircle,
    FaSave,
    FaUpload,
    FaUserFriends,
    FaUsers,
} from "react-icons/fa";

import "./ComunidadForm.css";

import { ComunidadRequest } from "../../models/Comunidad/ComunidadRequest";
import { Comunidad } from "../../models/Comunidad/Comunidad";
import { Carrera } from "../../models/Carrera/Carrera";
import { Usuario } from "../../models/Usuario/Usuario";

import { ComunidadService } from "../../services/alumni/ComunidadService";
import { CarreraService } from "../../services/alumni/CarreraService";
import UserAlumniService from "../../services/alumni/UserAlumniService";

import { Routes } from "../../routes/CONSTANTS";
import { notifyAdminError, notifySuccess } from "../../services/ui/AlertService";

type SelectOption = {
    value: number;
    label: string;
};

type FieldErrors = {
    nombre?: string;
    descripcion?: string;
};

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

const ComunidadForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [form, setForm] = useState<ComunidadRequest>({
        nombre: "",
        carreras: [],
        usuarios: [],
        descripcion: "",
        imagen_portada: null,
        activo: true,
        slug: "",
    });

    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);

    const [initialLoading, setInitialLoading] = useState<boolean>(isEditing);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    useEffect(() => {
        const cargarBase = async (): Promise<void> => {
            try {
                const [carrerasData, usuariosData] = await Promise.all([
                    CarreraService.list(),
                    UserAlumniService.getAll(),
                ]);

                setCarreras(carrerasData ?? []);
                setUsuarios(usuariosData ?? []);
            } catch (err) {
                console.error("No se pudieron cargar carreras o usuarios.", err);
                const detail = notifyAdminError("Error al cargar datos base de comunidades.", err);
                setError(detail);
            }
        };

        void cargarBase();
    }, []);

    useEffect(() => {
        const cargarComunidad = async (): Promise<void> => {
            if (!isEditing || !id) return;

            try {
                setInitialLoading(true);
                const data: Comunidad = await ComunidadService.get(Number(id));

                setForm({
                    id: data.id,
                    nombre: data.nombre ?? "",
                    carreras: Array.isArray(data.carreras) ? data.carreras : [],
                    usuarios: Array.isArray(data.usuarios) ? data.usuarios : [],
                    descripcion: data.descripcion ?? "",
                    imagen_portada: data.imagen_portada ?? null,
                    activo: data.activo ?? true,
                    slug: data.slug ?? "",
                });

                setImagenPreview(data.imagen_portada ?? null);
            } catch (err) {
                console.error("No se pudo cargar la comunidad.", err);
                const detail = notifyAdminError("Error al cargar la comunidad para edicion.", err);
                setError(detail);
            } finally {
                setInitialLoading(false);
            }
        };

        void cargarComunidad();
    }, [id, isEditing]);

    useEffect(() => {
        return () => {
            if (imagenPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(imagenPreview);
            }
        };
    }, [imagenPreview]);

    const carreraOptions = useMemo<SelectOption[]>(
        () =>
            carreras.map((carrera) => ({
                value: carrera.id,
                label: carrera.codigo
                    ? `${carrera.nombre} (${carrera.codigo})`
                    : carrera.nombre,
            })),
        [carreras]
    );

    const usuarioOptions = useMemo<SelectOption[]>(
        () =>
            usuarios.map((usuario) => {
                const firstName = usuario.user?.first_name?.trim() ?? "";
                const lastName = usuario.user?.last_name?.trim() ?? "";
                const username = usuario.user?.username?.trim() ?? "";
                const carreraNombre = usuario.carrera_nombre?.trim() ?? "";

                const nombreVisible =
                    `${firstName} ${lastName}`.trim() || username || `Usuario ${usuario.id}`;

                return {
                    value: usuario.id as number,
                    label: carreraNombre
                        ? `${nombreVisible} — ${carreraNombre}`
                        : nombreVisible,
                };
            }),
        [usuarios]
    );

    const selectedCarreras = useMemo<SelectOption[]>(
        () =>
            carreraOptions.filter((option) =>
                (form.carreras ?? []).includes(option.value)
            ),
        [carreraOptions, form.carreras]
    );

    const selectedUsuarios = useMemo<SelectOption[]>(
        () =>
            usuarioOptions.filter((option) =>
                (form.usuarios ?? []).includes(option.value)
            ),
        [usuarioOptions, form.usuarios]
    );

    const totalUsuariosSeleccionados = form.usuarios?.length ?? 0;
    const totalCarrerasSeleccionadas = form.carreras?.length ?? 0;

    const clearFieldError = (field: keyof FieldErrors) => {
        setFieldErrors((prev) => ({
            ...prev,
            [field]: undefined,
        }));
    };

    const handleInputChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (name === "nombre" || name === "descripcion") {
            clearFieldError(name);
        }

        if (error) {
            setError("");
        }
    };

    const handleActivoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setForm((prev) => ({
            ...prev,
            activo: checked,
        }));
    };

    const handleCarrerasChange = (selectedOptions: MultiValue<SelectOption>) => {
        const selectedIds = selectedOptions.map((option) => option.value);
        setForm((prev) => ({
            ...prev,
            carreras: selectedIds,
        }));
    };

    const handleUsuariosChange = (selectedOptions: MultiValue<SelectOption>) => {
        const selectedIds = selectedOptions.map((option) => option.value);
        setForm((prev) => ({
            ...prev,
            usuarios: selectedIds,
        }));
    };

    const handleImagenChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (imagenPreview?.startsWith("blob:")) {
            URL.revokeObjectURL(imagenPreview);
        }

        const blobUrl = URL.createObjectURL(file);
        setSelectedImageFile(file);
        setImagenPreview(blobUrl);

        setForm((prev) => ({
            ...prev,
            imagen_portada: file,
        }));
    };

    const validateForm = (): boolean => {
        const nextErrors: FieldErrors = {};

        if (!form.nombre?.trim()) {
            nextErrors.nombre = "El nombre de la comunidad es obligatorio.";
        } else if (form.nombre.trim().length < 4) {
            nextErrors.nombre = "El nombre debe tener al menos 4 caracteres.";
        }

        if (!form.descripcion?.trim()) {
            nextErrors.descripcion = "La descripción es obligatoria.";
        } else if (form.descripcion.trim().length < 12) {
            nextErrors.descripcion =
                "La descripción debe tener al menos 12 caracteres.";
        }

        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const buildJsonPayload = (): ComunidadRequest => ({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() ?? "",
        carreras: form.carreras ?? [],
        usuarios: form.usuarios ?? [],
        activo: form.activo ?? true,
    });

    const buildFormDataPayload = (): FormData => {
        const formData = new FormData();
        formData.append("nombre", form.nombre.trim());
        formData.append("descripcion", form.descripcion?.trim() ?? "");
        formData.append("activo", String(form.activo ?? true));

        (form.carreras ?? []).forEach((carreraId) => {
            formData.append("carreras", String(carreraId));
        });

        (form.usuarios ?? []).forEach((usuarioId) => {
            formData.append("usuarios", String(usuarioId));
        });

        if (selectedImageFile) {
            formData.append("imagen_portada", selectedImageFile);
        }

        return formData;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const payload = selectedImageFile ? buildFormDataPayload() : buildJsonPayload();

            if (isEditing && id) {
                await ComunidadService.patch(Number(id), payload);
            } else {
                await ComunidadService.create(payload);
            }

            notifySuccess(isEditing ? "Comunidad actualizada correctamente." : "Comunidad creada correctamente.");
            navigate(Routes.ADMIN.COMUNIDADES.LIST);
        } catch (err) {
            console.error("No se pudo guardar la comunidad.", err);
            const detail = notifyAdminError("No se pudo guardar la comunidad.", err);
            setError(detail || getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="comunidad-form-page">
                <div className="container py-5">
                    <div className="comunidad-form-state animate__animated animate__fadeIn">
                        <div className="spinner-border text-warning" role="status" />
                        <h3>Cargando comunidad</h3>
                        <p className="mb-0">
                            Estamos preparando la información del formulario.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="comunidad-form-page">
            <section className="comunidad-form-hero animate__animated animate__fadeIn">
                <div className="container">
                    <div className="comunidad-form-hero__grid">
                        <div className="comunidad-form-hero__content">
                            <span className="comunidad-form-hero__eyebrow">
                                <FaComments />
                                Panel administrativo de comunidades
                            </span>

                            <h1 className="comunidad-form-hero__title">
                                {isEditing ? "Editar comunidad" : "Crear nueva comunidad"}
                            </h1>

                            <p className="comunidad-form-hero__text">
                                Configura la identidad de la comunidad, define carreras
                                relacionadas, asigna miembros iniciales y gestiona su portada
                                dentro del portal Alumni NUR.
                            </p>

                            <div className="comunidad-form-hero__chips">
                                <span className="comunidad-form-hero__chip">
                                    <FaGraduationCap />
                                    {totalCarrerasSeleccionadas} carrera
                                    {totalCarrerasSeleccionadas !== 1 ? "s" : ""}
                                </span>

                                <span className="comunidad-form-hero__chip comunidad-form-hero__chip--soft">
                                    <FaUsers />
                                    {totalUsuariosSeleccionados} miembro
                                    {totalUsuariosSeleccionados !== 1 ? "s" : ""}
                                </span>

                                <span className="comunidad-form-hero__chip comunidad-form-hero__chip--soft">
                                    <FaInfoCircle />
                                    {form.activo ? "Activa" : "Inactiva"}
                                </span>
                            </div>
                        </div>

                        <div className="comunidad-form-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost-light"
                                onClick={() => navigate(Routes.ADMIN.COMUNIDADES.LIST)}
                                disabled={loading}
                            >
                                <FaArrowLeft />
                                <span>Volver al listado</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="comunidad-form-content">
                <div className="container">
                    <form
                        onSubmit={handleSubmit}
                        encType="multipart/form-data"
                        className="comunidad-form-card animate__animated animate__fadeInUp"
                    >
                        <div className="comunidad-form-card__header">
                            <div>
                                <span className="comunidad-form-card__eyebrow">
                                    Formulario administrativo
                                </span>
                                <h3 className="comunidad-form-card__title">
                                    {isEditing
                                        ? "Actualizar configuración de la comunidad"
                                        : "Registrar una nueva comunidad Alumni"}
                                </h3>
                            </div>
                        </div>

                        {error && (
                            <div className="comunidad-form-alert" role="alert">
                                <strong>No se pudo guardar la comunidad.</strong>
                                <pre>{error}</pre>
                            </div>
                        )}

                        <div className="comunidad-form-grid">
                            <div className="comunidad-form-main">
                                <div className="comunidad-form-section">
                                    <div className="comunidad-form-section__title">
                                        <FaComments />
                                        <span>Información general</span>
                                    </div>

                                    <div className="comunidad-form-fields">
                                        <div className="comunidad-form-field comunidad-form-field--full">
                                            <label htmlFor="nombre">Nombre de la comunidad</label>
                                            <input
                                                id="nombre"
                                                name="nombre"
                                                type="text"
                                                className={`form-control ${fieldErrors.nombre ? "is-invalid" : ""}`}
                                                value={form.nombre}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Ej. Comunidad de Ingeniería de Sistemas"
                                            />
                                            {fieldErrors.nombre ? (
                                                <small className="comunidad-form-error">
                                                    {fieldErrors.nombre}
                                                </small>
                                            ) : (
                                                <small className="comunidad-form-help">
                                                    Usa un nombre claro, visible y consistente con el
                                                    enfoque de la comunidad.
                                                </small>
                                            )}
                                        </div>

                                        <div className="comunidad-form-field comunidad-form-field--full">
                                            <label htmlFor="descripcion">
                                                <FaInfoCircle />
                                                <span>Descripción</span>
                                            </label>
                                            <textarea
                                                id="descripcion"
                                                name="descripcion"
                                                className={`form-control ${fieldErrors.descripcion ? "is-invalid" : ""}`}
                                                value={form.descripcion ?? ""}
                                                onChange={handleInputChange}
                                                rows={6}
                                                required
                                                placeholder="Describe el propósito, enfoque o valor de esta comunidad..."
                                            />
                                            {fieldErrors.descripcion ? (
                                                <small className="comunidad-form-error">
                                                    {fieldErrors.descripcion}
                                                </small>
                                            ) : (
                                                <small className="comunidad-form-help">
                                                    Explica brevemente el objetivo, el público y la
                                                    utilidad de la comunidad.
                                                </small>
                                            )}
                                        </div>

                                        <div className="comunidad-form-field comunidad-form-field--full">
                                            <label className="comunidad-form-toggle" htmlFor="activo">
                                                <input
                                                    id="activo"
                                                    type="checkbox"
                                                    checked={Boolean(form.activo)}
                                                    onChange={handleActivoChange}
                                                />
                                                <span className="comunidad-form-toggle__slider" />
                                                <span className="comunidad-form-toggle__text">
                                                    Comunidad activa
                                                </span>
                                            </label>
                                            <small className="comunidad-form-help">
                                                Una comunidad inactiva deja de estar disponible como
                                                espacio vigente dentro del portal.
                                            </small>
                                        </div>

                                        {isEditing && form.slug ? (
                                            <div className="comunidad-form-field comunidad-form-field--full">
                                                <label htmlFor="slug">
                                                    <FaInfoCircle />
                                                    <span>Slug generado</span>
                                                </label>
                                                <input
                                                    id="slug"
                                                    type="text"
                                                    className="form-control"
                                                    value={form.slug}
                                                    readOnly
                                                />
                                                <small className="comunidad-form-help">
                                                    Este valor lo administra el backend y se usa para
                                                    identificación amigable del recurso.
                                                </small>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="comunidad-form-section">
                                    <div className="comunidad-form-section__title">
                                        <FaGraduationCap />
                                        <span>Carreras vinculadas</span>
                                    </div>

                                    <div className="comunidad-form-field comunidad-form-field--full">
                                        <label>
                                            <FaGraduationCap />
                                            <span>Selecciona una o varias carreras</span>
                                        </label>
                                        <Select
                                            isMulti
                                            options={carreraOptions}
                                            value={selectedCarreras}
                                            onChange={handleCarrerasChange}
                                            placeholder="Buscar carreras..."
                                            classNamePrefix="comunidad-select"
                                            closeMenuOnSelect={false}
                                            noOptionsMessage={() => "No se encontraron carreras"}
                                        />
                                        <small className="comunidad-form-help">
                                            Las comunidades pueden asociarse a una o varias carreras
                                            para mejorar la navegación y las sugerencias.
                                        </small>
                                    </div>
                                </div>

                                <div className="comunidad-form-section">
                                    <div className="comunidad-form-section__title">
                                        <FaUserFriends />
                                        <span>Miembros iniciales</span>
                                    </div>

                                    <div className="comunidad-form-field comunidad-form-field--full">
                                        <label>
                                            <FaUsers />
                                            <span>Usuarios asignados</span>
                                        </label>
                                        <Select
                                            isMulti
                                            options={usuarioOptions}
                                            value={selectedUsuarios}
                                            onChange={handleUsuariosChange}
                                            placeholder="Buscar usuarios alumni..."
                                            classNamePrefix="comunidad-select"
                                            closeMenuOnSelect={false}
                                            noOptionsMessage={() => "No se encontraron usuarios"}
                                        />
                                        <small className="comunidad-form-help">
                                            Puedes dejar la comunidad sin miembros y permitir que los
                                            usuarios se incorporen después según tu flujo funcional.
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <aside className="comunidad-form-side">
                                <div className="comunidad-form-section">
                                    <div className="comunidad-form-section__title">
                                        <FaImage />
                                        <span>Portada de la comunidad</span>
                                    </div>

                                    <div className="comunidad-form-field comunidad-form-field--full">
                                        <label htmlFor="imagen_portada">
                                            <FaUpload />
                                            <span>Subir imagen</span>
                                        </label>
                                        <input
                                            id="imagen_portada"
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={handleImagenChange}
                                        />
                                        <small className="comunidad-form-help">
                                            Usa una imagen representativa para mejorar la presencia
                                            visual en listados, hubs y sugerencias.
                                        </small>
                                    </div>

                                    {imagenPreview ? (
                                        <div className="comunidad-form-preview">
                                            <img
                                                src={imagenPreview}
                                                alt="Vista previa de la portada"
                                                className="comunidad-form-preview__image"
                                            />
                                            <div className="comunidad-form-preview__badge">
                                                <FaCamera />
                                                <span>Vista previa</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="comunidad-form-preview comunidad-form-preview--empty">
                                            <FaImage />
                                            <p>Aún no se ha seleccionado una portada.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="comunidad-form-section">
                                    <div className="comunidad-form-section__title">
                                        <FaUsers />
                                        <span>Resumen rápido</span>
                                    </div>

                                    <div className="comunidad-form-summary">
                                        <div className="comunidad-form-summary__item">
                                            <span className="comunidad-form-summary__label">
                                                Nombre
                                            </span>
                                            <span className="comunidad-form-summary__value">
                                                {form.nombre?.trim() || "Sin definir"}
                                            </span>
                                        </div>

                                        <div className="comunidad-form-summary__item">
                                            <span className="comunidad-form-summary__label">
                                                Carreras
                                            </span>
                                            <span className="comunidad-form-summary__value">
                                                {totalCarrerasSeleccionadas}
                                            </span>
                                        </div>

                                        <div className="comunidad-form-summary__item">
                                            <span className="comunidad-form-summary__label">
                                                Miembros
                                            </span>
                                            <span className="comunidad-form-summary__value">
                                                {totalUsuariosSeleccionados}
                                            </span>
                                        </div>

                                        <div className="comunidad-form-summary__item">
                                            <span className="comunidad-form-summary__label">
                                                Estado
                                            </span>
                                            <span className="comunidad-form-summary__value">
                                                {form.activo ? "Activa" : "Inactiva"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="comunidad-form-actions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={() => navigate(Routes.ADMIN.COMUNIDADES.LIST)}
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
                                                    : "Crear comunidad"}
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

export default ComunidadForm;