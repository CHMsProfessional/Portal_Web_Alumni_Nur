import React, { useEffect, useMemo, useState } from "react";
import "animate.css";
import {
    FaBookOpen,
    FaCalendarAlt,
    FaDownload,
    FaFilter,
    FaFolderOpen,
    FaSearch,
    FaUserEdit,
} from "react-icons/fa";

import "./DocumentosPage.css";

import { DocumentoService } from "../../services/alumni/DocumentoService";
import { CarreraService } from "../../services/alumni/CarreraService";

import { Documento } from "../../models/Documento/Documento";
import { Carrera } from "../../models/Carrera/Carrera";

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
    if (!fecha) return "Fecha no disponible";

    try {
        return new Date(fecha).toLocaleDateString("es-BO", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return fecha;
    }
};

const descripcionCorta = (texto?: string | null, max = 170): string => {
    if (!texto?.trim()) {
        return "Este documento aún no cuenta con una descripción registrada.";
    }

    const limpio = texto.trim();
    if (limpio.length <= max) return limpio;
    return `${limpio.slice(0, max).trim()}...`;
};

const tiposOrdenados: Array<Documento["tipo"]> = [
    "TESIS",
    "INVESTIGACION",
    "INFORME",
    "CERTIFICADO",
    "OTRO",
];

const DocumentosPage: React.FC = () => {
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingCarreras, setLoadingCarreras] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const [filtroNombre, setFiltroNombre] = useState<string>("");
    const [filtroTipo, setFiltroTipo] = useState<string>("");
    const [filtroCarreraId, setFiltroCarreraId] = useState<string>("");

    const cargarCarreras = async (): Promise<void> => {
        try {
            setLoadingCarreras(true);
            const carrerasData = await CarreraService.list();
            setCarreras(carrerasData ?? []);
        } catch (loadError) {
            console.error("Error al cargar carreras:", loadError);
        } finally {
            setLoadingCarreras(false);
        }
    };

    const cargarDocumentos = async (): Promise<void> => {
        try {
            setLoading(true);
            setError("");

            const docs = await DocumentoService.list({
                tipo: filtroTipo
                    ? (filtroTipo as NonNullable<Documento["tipo"]>)
                    : null,
                carrera: filtroCarreraId ? Number(filtroCarreraId) : null,
            });

            setDocumentos(docs ?? []);
        } catch (loadError) {
            console.error("Error al cargar documentos:", loadError);
            setError("No se pudieron cargar los documentos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarCarreras();
    }, []);

    useEffect(() => {
        void cargarDocumentos();
    }, [filtroTipo, filtroCarreraId]);

    const documentosFiltrados = useMemo(() => {
        const termino = filtroNombre.trim().toLowerCase();

        if (!termino) return documentos;

        return documentos.filter((doc) =>
            (doc.nombre ?? "").toLowerCase().includes(termino)
        );
    }, [documentos, filtroNombre]);

    const documentosAgrupados = useMemo(() => {
        return tiposOrdenados.reduce<Record<string, Documento[]>>((acc, tipo) => {
            acc[tipo ?? "OTRO"] = documentosFiltrados.filter((doc) => doc.tipo === tipo);
            return acc;
        }, {});
    }, [documentosFiltrados]);

    const resumen = useMemo(() => {
        return {
            cargados: documentos.length,
            visibles: documentosFiltrados.length,
            tesis: documentosFiltrados.filter((doc) => doc.tipo === "TESIS").length,
            investigacion: documentosFiltrados.filter((doc) => doc.tipo === "INVESTIGACION").length,
        };
    }, [documentos, documentosFiltrados]);

    const hayFiltros = Boolean(filtroNombre || filtroTipo || filtroCarreraId);

    const limpiarFiltros = (): void => {
        setFiltroNombre("");
        setFiltroTipo("");
        setFiltroCarreraId("");
    };

    return (
        <div className="documentos-home-nur-page animate__animated animate__fadeIn">
            <section className="documentos-home-nur-hero">
                <div className="container">
                    <div className="documentos-home-nur-hero__content">
                        <div className="documentos-home-nur-hero__copy">
                            <span className="documentos-home-nur-hero__eyebrow">
                                <FaFolderOpen />
                                Repositorio Alumni NUR
                            </span>

                            <h1 className="documentos-home-nur-hero__title">
                                Documentos institucionales
                            </h1>

                            <p className="documentos-home-nur-hero__text">
                                Explora tesis, investigaciones, informes y documentos publicados
                                para la comunidad Alumni de la Universidad NUR. Usa los filtros
                                para encontrar contenido por nombre, tipo o carrera.
                            </p>
                        </div>
                    </div>

                    <div className="documentos-home-nur-stats">
                        <div className="documentos-home-nur-stat-card">
                            <span className="documentos-home-nur-stat-card__label">
                                Cargados
                            </span>
                            <strong className="documentos-home-nur-stat-card__value">
                                {resumen.cargados}
                            </strong>
                        </div>

                        <div className="documentos-home-nur-stat-card">
                            <span className="documentos-home-nur-stat-card__label">
                                Coincidencias
                            </span>
                            <strong className="documentos-home-nur-stat-card__value">
                                {resumen.visibles}
                            </strong>
                        </div>

                        <div className="documentos-home-nur-stat-card">
                            <span className="documentos-home-nur-stat-card__label">
                                Tesis visibles
                            </span>
                            <strong className="documentos-home-nur-stat-card__value">
                                {resumen.tesis}
                            </strong>
                        </div>

                        <div className="documentos-home-nur-stat-card">
                            <span className="documentos-home-nur-stat-card__label">
                                Investigación visible
                            </span>
                            <strong className="documentos-home-nur-stat-card__value">
                                {resumen.investigacion}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="documentos-home-nur-content">
                <div className="container">
                    <div className="documentos-home-nur-filters animate__animated animate__fadeInUp">
                        <div className="documentos-home-nur-filters__header">
                            <div className="documentos-home-nur-filters__titleWrap">
                                <FaFilter />
                                <div>
                                    <h3>Filtros del repositorio</h3>
                                    <p>
                                        Refina la búsqueda por nombre, tipo documental o carrera.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="documentos-home-nur-filters__grid">
                            <div className="documentos-home-nur-field">
                                <label className="form-label">
                                    <FaSearch />
                                    <span>Buscar por nombre</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Ej. Tesis de sistemas"
                                    value={filtroNombre}
                                    onChange={(e) => setFiltroNombre(e.target.value)}
                                />
                            </div>

                            <div className="documentos-home-nur-field">
                                <label className="form-label">
                                    <FaBookOpen />
                                    <span>Tipo</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={filtroTipo}
                                    onChange={(e) => setFiltroTipo(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="TESIS">Tesis</option>
                                    <option value="CERTIFICADO">Certificado</option>
                                    <option value="INVESTIGACION">Investigación</option>
                                    <option value="INFORME">Informe</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>

                            <div className="documentos-home-nur-field">
                                <label className="form-label">
                                    <FaFolderOpen />
                                    <span>Carrera</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={filtroCarreraId}
                                    onChange={(e) => setFiltroCarreraId(e.target.value)}
                                    disabled={loadingCarreras}
                                >
                                    <option value="">
                                        {loadingCarreras ? "Cargando carreras..." : "Todas"}
                                    </option>
                                    {carreras.map((carrera) => (
                                        <option key={carrera.id} value={String(carrera.id)}>
                                            {carrera.nombre} ({carrera.codigo})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="documentos-home-nur-field documentos-home-nur-field--actions">
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--ghost"
                                    onClick={limpiarFiltros}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="documentos-home-nur-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mt-3 mb-0">Cargando documentos...</p>
                        </div>
                    ) : error ? (
                        <div className="documentos-home-nur-alert">
                            {error}
                        </div>
                    ) : documentosFiltrados.length === 0 ? (
                        <div className="documentos-home-nur-empty">
                            <FaFolderOpen />
                            <h3>No hay documentos para mostrar</h3>
                            <p>
                                {hayFiltros
                                    ? "No se encontraron resultados con los filtros aplicados."
                                    : "Todavía no hay documentos publicados en el repositorio."}
                            </p>

                            {hayFiltros && (
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={limpiarFiltros}
                                >
                                    Restablecer filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        tiposOrdenados.map((tipo) => {
                            const docs = documentosAgrupados[tipo ?? "OTRO"] ?? [];
                            if (!docs.length) return null;

                            return (
                                <section key={tipo} className="documentos-home-nur-section">
                                    <div className="documentos-home-nur-section__header">
                                        <div>
                                            <span className="documentos-home-nur-section__eyebrow">
                                                Clasificación documental
                                            </span>
                                            <h2 className="documentos-home-nur-section__title">
                                                {getTipoLabel(tipo)}
                                            </h2>
                                        </div>

                                        <span className="documentos-home-nur-section__count">
                                            {docs.length} documento{docs.length === 1 ? "" : "s"}
                                        </span>
                                    </div>

                                    <div className="documentos-home-nur-grid">
                                        {docs.map((doc) => (
                                            <article
                                                key={doc.id}
                                                className="documento-home-nur-card animate__animated animate__fadeInUp"
                                            >
                                                <div className="documento-home-nur-card__media">
                                                    <img
                                                        src={doc.imagen_portada || placeholderImg}
                                                        alt={doc.nombre || "Documento"}
                                                        className="documento-home-nur-card__image"
                                                    />
                                                    <div className="documento-home-nur-card__overlay" />

                                                    <div className="documento-home-nur-card__badges">
                                                        <span className="documento-home-nur-card__badge">
                                                            {doc.tipo_display || getTipoLabel(doc.tipo)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="documento-home-nur-card__body">
                                                    <h3 className="documento-home-nur-card__title">
                                                        {doc.nombre || "Documento sin nombre"}
                                                    </h3>

                                                    <p className="documento-home-nur-card__description">
                                                        {descripcionCorta(doc.descripcion)}
                                                    </p>

                                                    <div className="documento-home-nur-card__meta">
                                                        <div className="documento-home-nur-card__metaItem">
                                                            <FaUserEdit />
                                                            <span>{doc.autor || "Autor no definido"}</span>
                                                        </div>

                                                        <div className="documento-home-nur-card__metaItem">
                                                            <FaFolderOpen />
                                                            <span>{doc.carrera_nombre || "Sin carrera"}</span>
                                                        </div>

                                                        <div className="documento-home-nur-card__metaItem">
                                                            <FaCalendarAlt />
                                                            <span>{formatearFecha(doc.fecha_subida)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="documento-home-nur-card__footer">
                                                        {doc.archivo_documento ? (
                                                            <a
                                                                href={doc.archivo_documento}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="nur-btn nur-btn--secondary documento-home-nur-card__link"
                                                            >
                                                                <FaDownload />
                                                                <span>Ver / Descargar</span>
                                                            </a>
                                                        ) : (
                                                            <div className="documento-home-nur-card__notice">
                                                                Sin archivo disponible
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
};

export default DocumentosPage;