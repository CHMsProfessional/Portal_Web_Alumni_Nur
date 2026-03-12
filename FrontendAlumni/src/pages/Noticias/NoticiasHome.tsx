import { useEffect, useMemo, useState } from "react";
import "animate.css";
import {
    FaCalendarAlt,
    FaNewspaper,
    FaRedo,
    FaRegClock,
} from "react-icons/fa";

import "./NoticiasHome.css";

import { Noticia } from "../../models/Noticia/Noticia";
import { NoticiaService } from "../../services/alumni/NoticiaService";

const placeholderImg = "/placeholder-comunidad.png";

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

const recortarTexto = (texto?: string, max = 180): string => {
    if (!texto) return "Sin contenido disponible.";
    if (texto.length <= max) return texto;
    return `${texto.slice(0, max).trim()}...`;
};

const NoticiasHome = () => {
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const cargarNoticias = async (): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const data = await NoticiaService.list();
            setNoticias(data);
        } catch (err) {
            console.error("Error al cargar noticias:", err);
            setError("No se pudieron cargar las noticias.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarNoticias();
    }, []);

    const noticiasOrdenadas = useMemo(() => {
        return [...noticias].sort((a, b) => {
            const fechaA = a.fecha_publicacion ? new Date(a.fecha_publicacion).getTime() : 0;
            const fechaB = b.fecha_publicacion ? new Date(b.fecha_publicacion).getTime() : 0;
            return fechaB - fechaA;
        });
    }, [noticias]);

    const noticiaDestacada = noticiasOrdenadas[0];
    const noticiasSecundarias = noticiasOrdenadas.slice(1);

    return (
        <div className="noticias-home-nur-page animate__animated animate__fadeIn">
            <section className="noticias-home-nur-hero">
                <div className="container">
                    <div className="noticias-home-nur-hero__content">
                        <div className="noticias-home-nur-hero__copy">
                            <span className="noticias-home-nur-hero__eyebrow">
                                <FaNewspaper />
                                Comunicación institucional Alumni
                            </span>

                            <h1 className="noticias-home-nur-hero__title">
                                Noticias y novedades para la comunidad NUR
                            </h1>

                            <p className="noticias-home-nur-hero__text">
                                Consulta publicaciones institucionales, novedades relevantes y
                                comunicados dirigidos a graduados. La carga, el ordenamiento y la
                                visualización siguen la lógica ya saneada del módulo actual.
                            </p>
                        </div>

                        <div className="noticias-home-nur-hero__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={() => void cargarNoticias()}
                                disabled={loading}
                            >
                                <FaRedo />
                                <span>{loading ? "Actualizando..." : "Recargar noticias"}</span>
                            </button>
                        </div>
                    </div>

                    <div className="noticias-home-nur-stats">
                        <div className="noticias-home-nur-stat-card">
                            <span className="noticias-home-nur-stat-card__label">Publicaciones</span>
                            <strong className="noticias-home-nur-stat-card__value">
                                {noticiasOrdenadas.length}
                            </strong>
                        </div>

                        <div className="noticias-home-nur-stat-card">
                            <span className="noticias-home-nur-stat-card__label">Más reciente</span>
                            <strong className="noticias-home-nur-stat-card__value noticias-home-nur-stat-card__value--small">
                                {noticiaDestacada?.fecha_publicacion
                                    ? formatearFecha(noticiaDestacada.fecha_publicacion)
                                    : "Sin fecha"}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="noticias-home-nur-content">
                <div className="container">
                    {loading ? (
                        <div className="noticias-home-nur-feedback">
                            <div className="spinner-border text-warning" role="status" />
                            <p className="mb-0 mt-3">Cargando noticias...</p>
                        </div>
                    ) : error ? (
                        <div className="noticias-home-nur-alert noticias-home-nur-alert--error">
                            {error}
                        </div>
                    ) : noticiasOrdenadas.length === 0 ? (
                        <div className="noticias-home-nur-empty">
                            <FaNewspaper />
                            <h3>No hay noticias publicadas</h3>
                            <p>
                                Cuando existan nuevas publicaciones institucionales, aparecerán en esta sección.
                            </p>
                        </div>
                    ) : (
                        <>
                            {noticiaDestacada && (
                                <section className="noticias-home-nur-featured animate__animated animate__fadeInUp">
                                    <div className="noticias-home-nur-featured__media">
                                        <img
                                            src={noticiaDestacada.imagen || placeholderImg}
                                            alt={noticiaDestacada.titulo || "Noticia destacada"}
                                            className="noticias-home-nur-featured__image"
                                        />
                                        <div className="noticias-home-nur-featured__overlay" />
                                    </div>

                                    <div className="noticias-home-nur-featured__body">
                                        <span className="noticias-home-nur-featured__badge">
                                            Destacada
                                        </span>

                                        <h2 className="noticias-home-nur-featured__title">
                                            {noticiaDestacada.titulo || "Noticia sin título"}
                                        </h2>

                                        <p className="noticias-home-nur-featured__text">
                                            {recortarTexto(noticiaDestacada.contenido, 320)}
                                        </p>

                                        <div className="noticias-home-nur-featured__meta">
                                            <span>
                                                <FaCalendarAlt />
                                                {formatearFecha(noticiaDestacada.fecha_publicacion)}
                                            </span>
                                            <span>
                                                <FaRegClock />
                                                Publicación institucional
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section className="noticias-home-nur-section">
                                <div className="noticias-home-nur-section__header">
                                    <div>
                                        <span className="noticias-home-nur-section__eyebrow">
                                            Historial de publicaciones
                                        </span>
                                        <h2 className="noticias-home-nur-section__title">
                                            Últimas noticias
                                        </h2>
                                    </div>

                                    <span className="noticias-home-nur-section__count">
                                        {noticiasOrdenadas.length} registro
                                        {noticiasOrdenadas.length === 1 ? "" : "s"}
                                    </span>
                                </div>

                                <div className="noticias-home-nur-grid">
                                    {noticiasSecundarias.length > 0
                                        ? noticiasSecundarias.map((noticia) => (
                                              <article
                                                  key={noticia.id}
                                                  className="noticia-nur-card animate__animated animate__fadeInUp"
                                              >
                                                  <div className="noticia-nur-card__media">
                                                      <img
                                                          src={noticia.imagen || placeholderImg}
                                                          className="noticia-nur-card__image"
                                                          alt={noticia.titulo || "Noticia"}
                                                      />
                                                      <div className="noticia-nur-card__overlay" />
                                                  </div>

                                                  <div className="noticia-nur-card__body">
                                                      <h3 className="noticia-nur-card__title">
                                                          {noticia.titulo || "Noticia sin título"}
                                                      </h3>

                                                      <p className="noticia-nur-card__text">
                                                          {recortarTexto(noticia.contenido, 180)}
                                                      </p>

                                                      <div className="noticia-nur-card__meta">
                                                          <FaCalendarAlt />
                                                          <span>
                                                              {formatearFecha(noticia.fecha_publicacion)}
                                                          </span>
                                                      </div>
                                                  </div>
                                              </article>
                                          ))
                                        : noticiaDestacada && (
                                              <div className="noticias-home-nur-empty noticias-home-nur-empty--soft">
                                                  <FaNewspaper />
                                                  <h3>Solo existe una noticia publicada</h3>
                                                  <p>
                                                      La publicación destacada ya se está mostrando arriba.
                                                  </p>
                                              </div>
                                          )}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};

export default NoticiasHome;