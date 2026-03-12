import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "animate.css";
import {
    FaEdit,
    FaExternalLinkAlt,
    FaFileAlt,
    FaPlusCircle,
    FaRedo,
    FaSearch,
    FaTrash,
    FaUserEdit,
    FaFolderOpen,
    FaCalendarAlt,
} from "react-icons/fa";

import "./DocumentosListPage.css";

import { DocumentoService } from "../../services/alumni/DocumentoService";
import { Documento } from "../../models/Documento/Documento";
import { Routes } from "../../routes/CONSTANTS";

const placeholderImg = "/placeholder-comunidad.png";

const getTipoLabel = (tipo?: Documento["tipo"]): string => {
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
            return "Otro";
        default:
            return "Sin tipo";
    }
};

const formatearFecha = (fecha?: string | null): string => {
    if (!fecha) return "Sin fecha";

    try {
        return new Date(fecha).toLocaleDateString("es-BO", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return fecha;
    }
};

const descripcionCorta = (texto?: string | null, max = 140): string => {
    if (!texto?.trim()) return "Sin descripción registrada.";
    const limpio = texto.trim();
    if (limpio.length <= max) return limpio;
    return `${limpio.slice(0, max).trim()}...`;
};

const DocumentosListPage = () => {
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    const navigate = useNavigate();

    const cargarDocumentos = async (): Promise<void> => {
        try {
            setLoading(true);
            setError("");
            const data = await DocumentoService.list();
            setDocumentos(data ?? []);
        } catch (loadError) {
            console.error("Error al cargar documentos.", loadError);
            setError("Error al cargar documentos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarDocumentos();
    }, []);

    const documentosOrdenados = useMemo(() => {
        return [...documentos].sort((a, b) => {
            const fechaA = a.fecha_subida ? new Date(a.fecha_subida).getTime() : 0;
            const fechaB = b.fecha_subida ? new Date(b.fecha_subida).getTime() : 0;
            return fechaB - fechaA;
        });
    }, [documentos]);

    const documentosFiltrados = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return documentosOrdenados;

        return documentosOrdenados.filter((doc) => {
            const nombre = doc.nombre?.toLowerCase() ?? "";
            const autor = doc.autor?.toLowerCase() ?? "";
            const carrera = doc.carrera_nombre?.toLowerCase() ?? "";
            const tipo = (doc.tipo_display || getTipoLabel(doc.tipo)).toLowerCase();

            return (
                nombre.includes(term) ||
                autor.includes(term) ||
                carrera.includes(term) ||
                tipo.includes(term)
            );
        });
    }, [documentosOrdenados, search]);

    const resumen = useMemo(() => {
        return {
            total: documentos.length,
            visibles: documentosFiltrados.length,
            conArchivo: documentos.filter((doc) => Boolean(doc.archivo_documento)).length,
        };
    }, [documentos, documentosFiltrados]);

    const eliminarDocumento = async (id?: number): Promise<void> => {
        if (!id) return;

        const confirmado = window.confirm(
            "¿Estás seguro de que deseas eliminar este documento?"
        );

        if (!confirmado) return;

        try {
            setDeletingId(id);
            await DocumentoService.delete(id);
            setDocumentos((prev) => prev.filter((doc) => doc.id !== id));
        } catch (deleteError) {
            console.error("Error al eliminar el documento.", deleteError);
            alert("Error al eliminar el documento.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="documentos-admin-nur-page animate__animated animate__fadeIn">
            <section className="documentos-admin-nur-hero">
                <div className="container">
                    <div className="documentos-admin-nur-hero__content">
                        <div className="documentos-admin-nur-hero__copy">
                            <span className="documentos-admin-nur-hero__eyebrow">
                                <FaFileAlt />
                                Panel administrativo
                            </span>

                            <h1 className="documentos-admin-nur-hero__title">
                                Gestión del repositorio Alumni
                            </h1>

                            <p className="documentos-admin-nur-hero__text">
                                Administra documentos del portal, revisa metadatos,
                                archivos asociados y mantén organizado el repositorio institucional.
                            </p>
                        </div>

                        <div className="documentos-admin-nur-hero__actions">
                            <button
                                className="nur-btn nur-btn--ghost"
                                onClick={() => void cargarDocumentos()}
                                disabled={loading}
                                type="button"
                            >
                                <FaRedo />
                                <span>{loading ? "Actualizando..." : "Recargar"}</span>
                            </button>

                            <button
                                className="nur-btn nur-btn--primary"
                                onClick={() => navigate(Routes.ADMIN.DOCUMENTOS.CREATE)}
                                type="button"
                            >
                                <FaPlusCircle />
                                <span>Nuevo documento</span>
                            </button>
                        </div>
                    </div>

                    <div className="documentos-admin-nur-stats">
                        <div className="documentos-admin-nur-stat">
                            <span className="documentos-admin-nur-stat__label">Total</span>
                            <strong className="documentos-admin-nur-stat__value">
                                {resumen.total}
                            </strong>
                        </div>

                        <div className="documentos-admin-nur-stat">
                            <span className="documentos-admin-nur-stat__label">Visibles</span>
                            <strong className="documentos-admin-nur-stat__value">
                                {resumen.visibles}
                            </strong>
                        </div>

                        <div className="documentos-admin-nur-stat">
                            <span className="documentos-admin-nur-stat__label">Con archivo</span>
                            <strong className="documentos-admin-nur-stat__value">
                                {resumen.conArchivo}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="documentos-admin-nur-content">
                <div className="container">
                    <div className="documentos-admin-nur-toolbar">
                        <label className="documentos-admin-nur-toolbar__label" htmlFor="documento-search">
                            <FaSearch />
                            <span>Buscar documento</span>
                        </label>

                        <input
                            id="documento-search"
                            type="text"
                            className="form-control"
                            placeholder="Nombre, autor, carrera o tipo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="documentos-admin-nur-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando documentos...</p>
                        </div>
                    ) : error ? (
                        <div className="documentos-admin-nur-alert">{error}</div>
                    ) : documentosFiltrados.length === 0 ? (
                        <div className="documentos-admin-nur-empty">
                            <FaFileAlt />
                            <h3>No hay documentos registrados</h3>
                            <p>No existen documentos que coincidan con el filtro actual.</p>
                        </div>
                    ) : (
                        <div className="documentos-admin-nur-grid">
                            {documentosFiltrados.map((doc) => (
                                <article
                                    key={doc.id}
                                    className="documento-admin-nur-card animate__animated animate__fadeInUp"
                                >
                                    <div className="documento-admin-nur-card__media">
                                        <img
                                            src={doc.imagen_portada || placeholderImg}
                                            alt={doc.nombre || "Documento"}
                                            className="documento-admin-nur-card__image"
                                        />
                                        <div className="documento-admin-nur-card__overlay" />

                                        <div className="documento-admin-nur-card__badges">
                                            <span className="documento-admin-nur-card__badge">
                                                {doc.tipo_display || getTipoLabel(doc.tipo)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="documento-admin-nur-card__body">
                                        <h3 className="documento-admin-nur-card__title">
                                            {doc.nombre || "Documento sin nombre"}
                                        </h3>

                                        <p className="documento-admin-nur-card__description">
                                            {descripcionCorta(doc.descripcion)}
                                        </p>

                                        <div className="documento-admin-nur-card__meta">
                                            <div className="documento-admin-nur-card__metaItem">
                                                <FaUserEdit />
                                                <span>{doc.autor || "Autor no definido"}</span>
                                            </div>

                                            <div className="documento-admin-nur-card__metaItem">
                                                <FaFolderOpen />
                                                <span>{doc.carrera_nombre || "Sin carrera"}</span>
                                            </div>

                                            <div className="documento-admin-nur-card__metaItem">
                                                <FaCalendarAlt />
                                                <span>{formatearFecha(doc.fecha_subida)}</span>
                                            </div>
                                        </div>

                                        <div className="documento-admin-nur-card__links">
                                            {doc.archivo_documento ? (
                                                <a
                                                    href={doc.archivo_documento}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="documento-admin-nur-card__fileLink"
                                                >
                                                    <FaExternalLinkAlt />
                                                    <span>Ver archivo</span>
                                                </a>
                                            ) : (
                                                <span className="documento-admin-nur-card__muted">
                                                    Sin archivo
                                                </span>
                                            )}
                                        </div>

                                        <div className="documento-admin-nur-card__actions">
                                            <button
                                                className="nur-btn nur-btn--ghost"
                                                onClick={() =>
                                                    navigate(
                                                        Routes.ADMIN.DOCUMENTOS.EDIT_PARAM(doc.id)
                                                    )
                                                }
                                                disabled={!doc.id}
                                                type="button"
                                            >
                                                <FaEdit />
                                                <span>Editar</span>
                                            </button>

                                            <button
                                                className="nur-btn nur-btn--ghost-danger"
                                                onClick={() => void eliminarDocumento(doc.id)}
                                                disabled={!doc.id || deletingId === doc.id}
                                                type="button"
                                            >
                                                <FaTrash />
                                                <span>
                                                    {deletingId === doc.id
                                                        ? "Eliminando..."
                                                        : "Eliminar"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default DocumentosListPage;