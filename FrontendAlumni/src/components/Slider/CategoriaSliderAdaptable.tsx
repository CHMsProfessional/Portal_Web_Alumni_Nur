import { useMemo } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import "./CategoriaSliderAdaptable.css";

type TipoContenido = "pelicula" | "documento" | "evento" | "noticia" | "testimonio";

const placeholderImg = "/placeholder-comunidad.png";

type PeliculaItem = {
    id?: number | string;
    title?: string;
    poster_path?: string | null;
    overview?: string | null;
    release_date?: string | null;
};

type DocumentoItem = {
    id?: number | string;
    nombre?: string | null;
    descripcion?: string | null;
    imagen_portada?: string | null;
    autor?: string | null;
};

type EventoItem = {
    id?: number | string;
    titulo?: string | null;
    descripcion?: string | null;
    imagen_portada?: string | null;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
};

type NoticiaItem = {
    id?: number | string;
    titulo?: string | null;
    contenido?: string | null;
    imagen?: string | null;
    fecha_publicacion?: string | null;
};

type TestimonioItem = {
    id?: number | string;
    nombre?: string | null;
    cargo?: string | null;
    empresa?: string | null;
    testimonio?: string | null;
    foto?: string | null;
};

type SliderItemMap = {
    pelicula: PeliculaItem;
    documento: DocumentoItem;
    evento: EventoItem;
    noticia: NoticiaItem;
    testimonio: TestimonioItem;
};

type Props<T extends TipoContenido = TipoContenido> = {
    titulo: string;
    tipo: T;
    elementos: SliderItemMap[T][];
};

const sliderConfig = {
    pelicula: { perView: 3, spacing: 24, vertical: false },
    documento: { perView: 4, spacing: 20, vertical: false },
    evento: { perView: 2, spacing: 24, vertical: false },
    noticia: { perView: 3, spacing: 24, vertical: false },
    testimonio: { perView: 3, spacing: 16, vertical: true },
} as const;

const formatDate = (value?: string | null): string => {
    if (!value) return "Sin fecha";
    try {
        return new Date(value).toLocaleDateString("es-BO");
    } catch {
        return value;
    }
};

const truncate = (value?: string | null, max = 100): string => {
    if (!value) return "Sin contenido disponible.";
    if (value.length <= max) return value;
    return `${value.slice(0, max).trim()}...`;
};

const getItemKey = (item: { id?: number | string }, index: number): string =>
    item.id !== undefined && item.id !== null ? String(item.id) : `slider-item-${index}`;

const CategoriaSliderAdaptable = <T extends TipoContenido>({
    titulo,
    tipo,
    elementos,
}: Props<T>) => {
    const config = sliderConfig[tipo];

    const [sliderRef] = useKeenSlider<HTMLDivElement>({
        loop: false,
        mode: "snap",
        renderMode: "performance",
        rubberband: false,
        vertical: config.vertical,
        slides: {
            perView: config.perView,
            spacing: config.spacing,
        },
        breakpoints: {
            "(max-width: 768px)": {
                slides: { perView: 1, spacing: 16 },
            },
            "(min-width: 769px) and (max-width: 1024px)": {
                slides: { perView: 2, spacing: 20 },
            },
        },
    });

    const contenido = useMemo(() => {
        return elementos.map((item, index) => {
            switch (tipo) {
                case "noticia": {
                    const noticia = item as NoticiaItem;
                    return (
                        <div
                            key={getItemKey(noticia, index)}
                            className="keen-slider__slide"
                        >
                            <div className="card h-100 noticia-card animate__animated animate__fadeInUp">
                                <img
                                    src={noticia.imagen || placeholderImg}
                                    className="card-img-top"
                                    alt={noticia.titulo || "Noticia"}
                                />
                                <div className="card-body bg-nur-dark text-white">
                                    <h5 className="card-title text-warning">
                                        {noticia.titulo || "Sin título"}
                                    </h5>
                                    <p className="card-text small text-muted">
                                        {formatDate(noticia.fecha_publicacion)}
                                    </p>
                                    <p className="card-text">
                                        {truncate(noticia.contenido, 100)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                }

                case "evento": {
                    const evento = item as EventoItem;
                    return (
                        <div
                            key={getItemKey(evento, index)}
                            className="keen-slider__slide"
                        >
                            <div className="slider-card">
                                <img
                                    src={evento.imagen_portada || placeholderImg}
                                    className="slider-img"
                                    alt={evento.titulo || "Evento"}
                                />
                                <div className="slider-info">
                                    <h4>{evento.titulo || "Evento sin título"}</h4>
                                    <p className="text-truncate">
                                        {evento.descripcion || "Sin descripción disponible."}
                                    </p>
                                    <small>{formatDate(evento.fecha_inicio)}</small>
                                </div>
                            </div>
                        </div>
                    );
                }

                case "documento": {
                    const documento = item as DocumentoItem;
                    return (
                        <div
                            key={getItemKey(documento, index)}
                            className="keen-slider__slide"
                        >
                            <div className="slider-card">
                                <img
                                    src={documento.imagen_portada || placeholderImg}
                                    className="slider-img"
                                    alt={documento.nombre || "Documento"}
                                />
                                <div className="slider-info">
                                    <h4>{documento.nombre || "Documento sin nombre"}</h4>
                                    <p>{truncate(documento.descripcion, 90)}</p>
                                    <small>{documento.autor || "Autor no definido"}</small>
                                </div>
                            </div>
                        </div>
                    );
                }

                case "testimonio": {
                    const testimonio = item as TestimonioItem;
                    return (
                        <div
                            key={getItemKey(testimonio, index)}
                            className="keen-slider__slide"
                        >
                            <div className="slider-card testimonial-card">
                                <img
                                    src={testimonio.foto || placeholderImg}
                                    className="slider-img"
                                    alt={testimonio.nombre || "Testimonio"}
                                />
                                <div className="slider-info">
                                    <h4>{testimonio.nombre || "Sin nombre"}</h4>
                                    <p>{truncate(testimonio.testimonio, 110)}</p>
                                    <small>
                                        {[testimonio.cargo, testimonio.empresa]
                                            .filter(Boolean)
                                            .join(" - ") || "Sin detalle profesional"}
                                    </small>
                                </div>
                            </div>
                        </div>
                    );
                }

                case "pelicula":
                default: {
                    const pelicula = item as PeliculaItem;
                    const imageUrl = pelicula.poster_path
                        ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
                        : placeholderImg;

                    return (
                        <div
                            key={getItemKey(pelicula, index)}
                            className="keen-slider__slide"
                        >
                            <div className="slider-card">
                                <img
                                    src={imageUrl}
                                    className="slider-img"
                                    alt={pelicula.title || "Película"}
                                />
                                <div className="slider-info">
                                    <h4>{pelicula.title || "Sin título"}</h4>
                                    <p>{truncate(pelicula.overview, 90)}</p>
                                    <small>{formatDate(pelicula.release_date)}</small>
                                </div>
                            </div>
                        </div>
                    );
                }
            }
        });
    }, [elementos, tipo]);

    if (!elementos?.length) {
        return null;
    }

    return (
        <section className="categoria-slider-section">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h3 className="categoria-slider-title mb-0">{titulo}</h3>
            </div>

            <div ref={sliderRef} className="keen-slider categoria-slider">
                {contenido}
            </div>
        </section>
    );
};

export default CategoriaSliderAdaptable;