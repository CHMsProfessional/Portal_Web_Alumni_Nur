import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import "animate.css";
import {
    FaArrowLeft,
    FaBookOpen,
    FaFileAlt,
    FaFilePdf,
    FaImage,
    FaInfoCircle,
    FaSave,
    FaTag,
    FaUniversity,
    FaUpload,
    FaUserEdit,
} from "react-icons/fa";

import "./DocumentosFormPage.css";

import { DocumentoService } from "../../services/alumni/DocumentoService";
import { CarreraService } from "../../services/alumni/CarreraService";
import { Documento } from "../../models/Documento/Documento";
import { DocumentoRequest } from "../../models/Documento/DocumentoRequest";
import { Carrera } from "../../models/Carrera/Carrera";
import { Routes } from "../../routes/CONSTANTS";

type CarreraOption = {
    value: number | null;
    label: string;
};

const tiposDocumento: Array<DocumentoRequest["tipo"]> = [
    "TESIS",
    "CERTIFICADO",
    "INVESTIGACION",
    "INFORME",
    "OTRO",
];

const getTipoLabel = (tipo: DocumentoRequest["tipo"]): string => {
    switch (tipo) {
        case "TESIS":
            return "Tesis";
        case "CERTIFICADO":
            return "Certificado";
        case "INVESTIGACION":
            return "Investigación";
        case "INFORME":
            return "Informe";
        case "OTRO":
        default:
            return "Otro";
    }
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
            return "Ocurrió un error inesperado al procesar la respuesta del servidor.";
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado.";
};

const getFileNameFromUrl = (value?: string | null): string => {
    if (!value) return "Archivo existente";

    try {
        const clean = value.split("?")[0];
        const parts = clean.split("/");
        return decodeURIComponent(parts[parts.length - 1] || "archivo");
    } catch {
        return "Archivo existente";
    }
};

const DocumentosFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const editMode = Boolean(id);

    const [form, setForm] = useState<DocumentoRequest>({
        nombre: "",
        tipo: "OTRO",
        carrera: null,
        descripcion: "",
        autor: "",
        archivo_documento: null,
        imagen_portada: null,
    });

    const [fileDoc, setFileDoc] = useState<File | null>(null);
    const [fileImg, setFileImg] = useState<File | null>(null);

    const [previewImg, setPreviewImg] = useState<string | null>(null);
    const [currentDocUrl, setCurrentDocUrl] = useState<string | null>(null);
    const [currentDocName, setCurrentDocName] = useState<string>("");
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [initialLoading, setInitialLoading] = useState<boolean>(editMode);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const loadCarreras = async (): Promise<void> => {
            try {
                const data = await CarreraService.list();
                setCarreras(data ?? []);
            } catch (loadError) {
                console.error("No se pudieron cargar las carreras.", loadError);
                setError("No se pudieron cargar las carreras.");
            }
        };

        void loadCarreras();
    }, []);

    useEffect(() => {
        if (!editMode || !id) {
            setInitialLoading(false);
            return;
        }

        const loadDocumento = async (): Promise<void> => {
            try {
                setInitialLoading(true);
                setError("");

                const documento: Documento = await DocumentoService.get(Number(id));

                setForm({
                    nombre: documento.nombre ?? "",
                    tipo: (documento.tipo as DocumentoRequest["tipo"]) ?? "OTRO",
                    carrera: documento.carrera_id ?? null,
                    descripcion: documento.descripcion ?? "",
                    autor: documento.autor ?? "",
                    archivo_documento: null,
                    imagen_portada: null,
                });

                setCurrentDocUrl(documento.archivo_documento ?? null);
                setCurrentDocName(getFileNameFromUrl(documento.archivo_documento));
                setCurrentImageUrl(documento.imagen_portada ?? null);
                setPreviewImg(documento.imagen_portada ?? null);
            } catch (loadError) {
                console.error("No se pudo cargar el documento.", loadError);
                setError("No se pudo cargar el documento para edición.");
            } finally {
                setInitialLoading(false);
            }
        };

        void loadDocumento();
    }, [editMode, id]);

    useEffect(() => {
        return () => {
            if (previewImg && fileImg) {
                URL.revokeObjectURL(previewImg);
            }
        };
    }, [previewImg, fileImg]);

    const carreraOptions = useMemo<CarreraOption[]>(() => {
        return carreras.map((carrera) => ({
            value: carrera.id ?? null,
            label: `${carrera.nombre} (${carrera.codigo})`,
        }));
    }, [carreras]);

    const selectedCarrera = useMemo<CarreraOption | null>(() => {
        if (!form.carrera) return null;
        return (
            carreraOptions.find((option) => option.value === form.carrera) ?? null
        );
    }, [carreraOptions, form.carrera]);

    const heroTitle = editMode ? "Editar documento" : "Registrar documento";
    const heroText = editMode
        ? "Actualiza metadatos, carrera asociada, archivo principal o portada del documento."
        : "Publica un nuevo documento para el repositorio Alumni, asociándolo a su carrera y material visual correspondiente.";

    const heroChips = [
        {
            icon: <FaTag />,
            text: `Tipo: ${getTipoLabel(form.tipo)}`,
        },
        {
            icon: <FaUniversity />,
            text: selectedCarrera?.label ?? "Sin carrera específica",
        },
        {
            icon: <FaFilePdf />,
            text: fileDoc?.name || currentDocName || "Sin PDF cargado",
        },
    ];

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ): void => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        const value = e.target.value as DocumentoRequest["tipo"];
        setForm((prev) => ({
            ...prev,
            tipo: value,
        }));
    };

    const handleCarreraChange = (option: CarreraOption | null): void => {
        setForm((prev) => ({
            ...prev,
            carrera: option?.value ?? null,
        }));
    };

    const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const selectedFile = e.target.files?.[0] ?? null;
        setFileDoc(selectedFile);
    };

    const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const selectedFile = e.target.files?.[0] ?? null;
        setFileImg(selectedFile);

        if (previewImg && fileImg) {
            URL.revokeObjectURL(previewImg);
        }

        if (selectedFile) {
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreviewImg(objectUrl);
        } else {
            setPreviewImg(currentImageUrl);
        }
    };

    const buildPayload = (): FormData => {
        const data = new FormData();
        data.append("nombre", form.nombre.trim());
        data.append("tipo", form.tipo);
        data.append("descripcion", form.descripcion?.trim() || "");
        data.append("autor", form.autor.trim());

        if (form.carrera) {
            data.append("carrera", String(form.carrera));
        }

        if (fileDoc) {
            data.append("archivo_documento", fileDoc);
        }

        if (fileImg) {
            data.append("imagen_portada", fileImg);
        }

        return data;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError("");

        if (!form.nombre.trim()) {
            setError("El nombre del documento es obligatorio.");
            return;
        }

        if (!form.autor.trim()) {
            setError("El autor del documento es obligatorio.");
            return;
        }

        if (!editMode && !fileDoc) {
            setError("Debes seleccionar un archivo PDF para registrar el documento.");
            return;
        }

        try {
            setLoading(true);
            const payload = buildPayload();

            if (editMode && id) {
                await DocumentoService.update(Number(id), payload);
            } else {
                await DocumentoService.create(payload);
            }

            navigate(Routes.ADMIN.DOCUMENTOS.LIST);
        } catch (submitError) {
            console.error("Error al guardar el documento.", submitError);
            setError(getErrorMessage(submitError));
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="documento-form-page animate__animated animate__fadeIn">
                <section className="documento-form-content">
                    <div className="container">
                        <div className="documento-form-card documento-form-card--loading">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando documento...</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="documento-form-page animate__animated animate__fadeIn">
            <section className="documento-form-hero">
                <div className="container">
                    <div className="documento-form-hero__content">
                        <div className="documento-form-hero__copy">
                            <span className="documento-form-hero__eyebrow">
                                <FaBookOpen />
                                Gestión documental
                            </span>

                            <h1 className="documento-form-hero__title">{heroTitle}</h1>

                            <p className="documento-form-hero__text">{heroText}</p>

                            <div className="documento-form-hero__chips">
                                {heroChips.map((chip, index) => (
                                    <span key={`${chip.text}-${index}`} className="documento-form-hero__chip">
                                        {chip.icon}
                                        <span>{chip.text}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="documento-form-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => navigate(Routes.ADMIN.DOCUMENTOS.LIST)}
                                disabled={loading}
                            >
                                <FaArrowLeft />
                                <span>Volver al listado</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="documento-form-content">
                <div className="container">
                    <form onSubmit={handleSubmit}>
                        <div className="documento-form-card">
                            <div className="documento-form-card__header">
                                <div>
                                    <span className="documento-form-card__eyebrow">
                                        Panel de edición
                                    </span>
                                    <h2 className="documento-form-card__title">
                                        Datos del documento
                                    </h2>
                                </div>

                                <div className="documento-form-card__icon">
                                    <FaFileAlt />
                                </div>
                            </div>

                            {error && (
                                <div className="documento-form-alert">
                                    <FaInfoCircle />
                                    <pre>{error}</pre>
                                </div>
                            )}

                            <div className="documento-form-grid">
                                <div className="documento-form-main">
                                    <section className="documento-form-section">
                                        <div className="documento-form-section__header">
                                            <h3>Información general</h3>
                                            <p>
                                                Completa los metadatos principales del documento.
                                            </p>
                                        </div>

                                        <div className="documento-form-fields">
                                            <div className="documento-form-field documento-form-field--full">
                                                <label htmlFor="nombre">
                                                    <FaFileAlt />
                                                    <span>Nombre del documento</span>
                                                </label>
                                                <input
                                                    id="nombre"
                                                    name="nombre"
                                                    type="text"
                                                    className="form-control"
                                                    value={form.nombre}
                                                    onChange={handleChange}
                                                    placeholder="Ej. Proyecto de grado Portal Alumni NUR"
                                                    disabled={loading}
                                                />
                                            </div>

                                            <div className="documento-form-field">
                                                <label htmlFor="tipo">
                                                    <FaTag />
                                                    <span>Tipo</span>
                                                </label>
                                                <select
                                                    id="tipo"
                                                    name="tipo"
                                                    className="form-select"
                                                    value={form.tipo}
                                                    onChange={handleTipoChange}
                                                    disabled={loading}
                                                >
                                                    {tiposDocumento.map((tipo) => (
                                                        <option key={tipo} value={tipo}>
                                                            {getTipoLabel(tipo)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="documento-form-field">
                                                <label>
                                                    <FaUniversity />
                                                    <span>Carrera</span>
                                                </label>
                                                <Select<CarreraOption, false>
                                                    classNamePrefix="documento-select"
                                                    options={carreraOptions}
                                                    value={selectedCarrera}
                                                    onChange={(option) => handleCarreraChange(option)}
                                                    isClearable
                                                    isDisabled={loading}
                                                    placeholder="Selecciona una carrera"
                                                    noOptionsMessage={() => "No hay carreras disponibles"}
                                                />
                                            </div>

                                            <div className="documento-form-field">
                                                <label htmlFor="autor">
                                                    <FaUserEdit />
                                                    <span>Autor</span>
                                                </label>
                                                <input
                                                    id="autor"
                                                    name="autor"
                                                    type="text"
                                                    className="form-control"
                                                    value={form.autor}
                                                    onChange={handleChange}
                                                    placeholder="Nombre del autor"
                                                    disabled={loading}
                                                />
                                            </div>

                                            <div className="documento-form-field documento-form-field--full">
                                                <label htmlFor="descripcion">
                                                    <FaInfoCircle />
                                                    <span>Descripción</span>
                                                </label>
                                                <textarea
                                                    id="descripcion"
                                                    name="descripcion"
                                                    className="form-control"
                                                    rows={5}
                                                    value={form.descripcion?.trim() || ""}
                                                    onChange={handleChange}
                                                    placeholder="Describe el propósito, alcance o contenido del documento"
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="documento-form-section">
                                        <div className="documento-form-section__header">
                                            <h3>Archivos del documento</h3>
                                            <p>
                                                Adjunta el archivo principal y, si corresponde, una imagen de portada.
                                            </p>
                                        </div>

                                        <div className="documento-form-fields">
                                            <div className="documento-form-field">
                                                <label htmlFor="archivo_documento">
                                                    <FaFilePdf />
                                                    <span>Archivo PDF</span>
                                                </label>

                                                <label className="documento-form-uploadArea" htmlFor="archivo_documento">
                                                    <FaUpload />
                                                    <div>
                                                        <strong>
                                                            {fileDoc?.name ||
                                                                currentDocName ||
                                                                "Seleccionar archivo PDF"}
                                                        </strong>
                                                        <span>
                                                            {editMode
                                                                ? "Puedes reemplazar el archivo actual si lo deseas."
                                                                : "El archivo PDF es obligatorio para registrar el documento."}
                                                        </span>
                                                    </div>
                                                </label>

                                                <input
                                                    id="archivo_documento"
                                                    name="archivo_documento"
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={handleDocChange}
                                                    disabled={loading}
                                                    hidden
                                                />
                                            </div>

                                            <div className="documento-form-field">
                                                <label htmlFor="imagen_portada">
                                                    <FaImage />
                                                    <span>Imagen de portada</span>
                                                </label>

                                                <label className="documento-form-uploadArea" htmlFor="imagen_portada">
                                                    <FaUpload />
                                                    <div>
                                                        <strong>
                                                            {fileImg?.name ||
                                                                (currentImageUrl ? "Imagen actual cargada" : "Seleccionar imagen")}
                                                        </strong>
                                                        <span>
                                                            JPG, PNG o WEBP para enriquecer la visualización del repositorio.
                                                        </span>
                                                    </div>
                                                </label>

                                                <input
                                                    id="imagen_portada"
                                                    name="imagen_portada"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImgChange}
                                                    disabled={loading}
                                                    hidden
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <aside className="documento-form-side">
                                    <section className="documento-form-section">
                                        <div className="documento-form-section__header">
                                            <h3>Vista previa</h3>
                                            <p>Comprueba rápidamente los archivos asociados.</p>
                                        </div>

                                        <div className="documento-form-preview">
                                            {previewImg ? (
                                                <img
                                                    src={previewImg}
                                                    alt="Vista previa de portada"
                                                    className="documento-form-preview__image"
                                                />
                                            ) : (
                                                <div className="documento-form-preview__placeholder">
                                                    <FaImage />
                                                    <span>Sin imagen de portada</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="documento-form-docCard">
                                            <div className="documento-form-docCard__icon">
                                                <FaFilePdf />
                                            </div>

                                            <div className="documento-form-docCard__content">
                                                <strong>
                                                    {fileDoc?.name ||
                                                        currentDocName ||
                                                        "Sin archivo PDF asociado"}
                                                </strong>
                                                <span>
                                                    {fileDoc
                                                        ? "Archivo nuevo seleccionado"
                                                        : currentDocUrl
                                                        ? "Archivo actualmente publicado"
                                                        : "No existe archivo cargado"}
                                                </span>
                                            </div>

                                            {currentDocUrl && !fileDoc && (
                                                <a
                                                    href={currentDocUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="documento-form-docCard__link"
                                                >
                                                    Ver actual
                                                </a>
                                            )}
                                        </div>
                                    </section>

                                    <div className="documento-form-actions">
                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--ghost"
                                            onClick={() => navigate(Routes.ADMIN.DOCUMENTOS.LIST)}
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
                                                    : editMode
                                                    ? "Guardar cambios"
                                                    : "Guardar documento"}
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

export default DocumentosFormPage;