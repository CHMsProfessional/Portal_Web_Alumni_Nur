import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "animate.css";
import {
    FaBookOpen,
    FaCalendarDays,
    FaCircleCheck,
    FaFileLines,
    FaGraduationCap,
    FaHandshakeAngle,
    FaPeopleGroup,
    FaRightToBracket,
    FaRobot,
} from "react-icons/fa6";

import "./HomePage_css.css";
import { Routes } from "../routes/CONSTANTS";
import { AuthService } from "../services/alumni/AuthService";
import { NoticiaService } from "../services/alumni/NoticiaService";
import { EventoService } from "../services/alumni/EventoService";

import type { Noticia } from "../models/Noticia/Noticia";
import type { Evento } from "../models/Evento/Evento";

import CategoriaSliderAdaptable from "../components/Slider/CategoriaSliderAdaptable";
import NoticiasBannerSection from "../components/Noticias/NoticiasBannerSection";

const HomePage = () => {
    const navigate = useNavigate();

    const [noticiasHome, setNoticiasHome] = useState<Noticia[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loadingNoticias, setLoadingNoticias] = useState<boolean>(true);
    const [loadingEventos, setLoadingEventos] = useState<boolean>(true);
    const [errorNoticias, setErrorNoticias] = useState<string>("");
    const [errorEventos, setErrorEventos] = useState<string>("");

    const isAuthenticated = AuthService.isAuthenticated();
    const isAdmin = AuthService.isAdmin();

    useEffect(() => {
        let mounted = true;

        const ordenarNoticias = (items: Noticia[]): Noticia[] => {
            return [...items].sort((a, b) => {
                if ((a.destacado ?? false) !== (b.destacado ?? false)) {
                    return a.destacado ? -1 : 1;
                }

                const ordenA = a.orden ?? Number.MAX_SAFE_INTEGER;
                const ordenB = b.orden ?? Number.MAX_SAFE_INTEGER;

                if (ordenA !== ordenB) {
                    return ordenA - ordenB;
                }

                const fechaA = a.fecha_publicacion
                    ? new Date(a.fecha_publicacion).getTime()
                    : a.fecha_actualizacion
                        ? new Date(a.fecha_actualizacion).getTime()
                        : 0;

                const fechaB = b.fecha_publicacion
                    ? new Date(b.fecha_publicacion).getTime()
                    : b.fecha_actualizacion
                        ? new Date(b.fecha_actualizacion).getTime()
                        : 0;

                return fechaB - fechaA;
            });
        };

        const cargarNoticiasHome = async (): Promise<void> => {
            setLoadingNoticias(true);
            setErrorNoticias("");

            try {
                // Ajusta esta llamada si tu service ya tiene listHome() o filtros directos
                const response = await NoticiaService.list();

                const noticias = Array.isArray(response) ? response : [];

                const filtradas = noticias.filter((item: Noticia) => {
                    const esHome = item.destino === "HOME";
                    const publicada = item.publicado === true;

                    const ahora = new Date().getTime();

                    const inicio = item.fecha_inicio_publicacion
                        ? new Date(item.fecha_inicio_publicacion).getTime()
                        : null;

                    const fin = item.fecha_fin_publicacion
                        ? new Date(item.fecha_fin_publicacion).getTime()
                        : null;

                    const dentroDeVentana =
                        (inicio === null || inicio <= ahora) &&
                        (fin === null || fin >= ahora);

                    return esHome && publicada && dentroDeVentana;
                });

                if (!mounted) return;

                setNoticiasHome(ordenarNoticias(filtradas));
            } catch (error) {
                console.error("Error cargando noticias del HomePage:", error);

                if (!mounted) return;
                setErrorNoticias(
                    "No se pudieron cargar las noticias principales del portal."
                );
            } finally {
                if (mounted) {
                    setLoadingNoticias(false);
                }
            }
        };

        const cargarEventos = async (): Promise<void> => {
            setLoadingEventos(true);
            setErrorEventos("");

            try {
                const response = await EventoService.list();
                const items = Array.isArray(response) ? response : [];

                const ordenados = [...items].sort((a, b) => {
                    const fechaA = a.fecha_inicio
                        ? new Date(a.fecha_inicio).getTime()
                        : 0;
                    const fechaB = b.fecha_inicio
                        ? new Date(b.fecha_inicio).getTime()
                        : 0;

                    return fechaB - fechaA;
                });

                if (!mounted) return;
                setEventos(ordenados.slice(0, 8));
            } catch (error) {
                console.error("Error cargando eventos del HomePage:", error);

                if (!mounted) return;
                setErrorEventos("No se pudieron cargar los eventos destacados.");
            } finally {
                if (mounted) {
                    setLoadingEventos(false);
                }
            }
        };

        void cargarNoticiasHome();
        void cargarEventos();

        return () => {
            mounted = false;
        };
    }, []);

    const accesos = useMemo(
        () => [
            {
                title: "Comunidades",
                text: "Explora hubs alumni, noticias por comunidad y conversaciones activas según afinidad académica y profesional.",
                action: () => navigate(Routes.COMUNIDAD.HOME),
                icon: <FaPeopleGroup />,
                actionLabel: "Ir a comunidades",
            },
            {
                title: "Eventos",
                text: "Mantente al día con actividades institucionales, encuentros y convocatorias para la comunidad alumni.",
                action: () => navigate(Routes.EVENTOS),
                icon: <FaCalendarDays />,
                actionLabel: "Ver eventos",
            },
            {
                title: "Cursos",
                text: "Accede a propuestas de actualización, formación continua y oportunidades académicas disponibles.",
                action: () => navigate(Routes.CURSOS.LIST),
                icon: <FaBookOpen />,
                actionLabel: "Explorar cursos",
            },
            {
                title: "Documentos",
                text: "Consulta material académico, documentos institucionales y recursos útiles desde un solo lugar.",
                action: () => navigate(Routes.REPOSITORIO),
                icon: <FaFileLines />,
                actionLabel: "Abrir documentos",
            },
            {
                title: "Servicios Alumni",
                text: "Encuentra beneficios, orientación y servicios diseñados para fortalecer el vínculo con la universidad.",
                action: () => navigate(Routes.SERVICIOS),
                icon: <FaHandshakeAngle />,
                actionLabel: "Ver servicios",
            },
            {
                title: "Asistencia IA",
                text: "Accede a soporte y orientación contextual dentro del ecosistema digital Alumni NUR.",
                action: () => navigate(Routes.AUTH.LOGIN),
                icon: <FaRobot />,
                actionLabel: "Ingresar al portal",
            },
        ],
        [navigate]
    );

    const beneficios = useMemo(
        () => [
            "Noticias institucionales visibles directamente desde la portada.",
            "Acceso claro a comunidades, documentos, cursos, eventos y servicios.",
            "Experiencia sobria, consistente y alineada con la identidad NUR.",
            "Base funcional preparada para extender noticias por comunidad y por contexto.",
        ],
        []
    );

    return (
        <div className="home-nur">
            <section className="home-nur__hero">
                <div className="home-nur__heroOverlay" />

                <div className="container home-nur__heroContainer">
                    <div className="home-nur__heroGrid animate__animated animate__fadeIn">
                        <article className="home-nur__heroPanel home-nur__heroPanel--left">
                            <div className="home-nur__panelBadge">
                                <FaGraduationCap />
                                <span>Portal Web Alumni NUR</span>
                            </div>

                            <h1 className="home-nur__heroTitle">
                                Un espacio institucional para mantener vivo el vínculo con la Universidad NUR
                            </h1>

                            <p className="home-nur__heroText">
                                La portada del portal integra noticias institucionales,
                                acceso a comunidades, eventos, cursos, documentos y
                                servicios dentro de una experiencia más clara, moderna
                                y alineada con el ecosistema Alumni.
                            </p>

                            <ul className="home-nur__heroBullets">
                                <li>
                                    <FaCircleCheck />
                                    <span>Noticias visibles desde el inicio</span>
                                </li>
                                <li>
                                    <FaCircleCheck />
                                    <span>Acceso centralizado al entorno Alumni</span>
                                </li>
                                <li>
                                    <FaCircleCheck />
                                    <span>Experiencia más ordenada y contextual</span>
                                </li>
                            </ul>

                            <div className="home-nur__heroActions">
                                {!isAuthenticated && (
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--primary"
                                        onClick={() => navigate(Routes.AUTH.LOGIN)}
                                    >
                                        <FaRightToBracket />
                                        <span>Iniciar sesión</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="nur-btn nur-btn--ghost"
                                    onClick={() => navigate(Routes.COMUNIDAD.HOME)}
                                >
                                    <FaPeopleGroup />
                                    <span>Explorar comunidades</span>
                                </button>
                            </div>
                        </article>

                        <article className="home-nur__heroPanel home-nur__heroPanel--center">
                            <div className="home-nur__logoBlock">
                                <img
                                    src="/logoNur.png"
                                    alt="Logo Universidad NUR"
                                    className="home-nur__logo"
                                />
                                <div className="home-nur__logoText">
                                    <h2>Universidad NUR</h2>
                                    <p>
                                        Portal institucional de conexión, continuidad y comunidad para egresados.
                                    </p>
                                </div>
                            </div>
                        </article>

                        <article className="home-nur__heroPanel home-nur__heroPanel--right">
                            <h2 className="home-nur__sideTitle">
                                Una portada institucional enfocada en contenido útil
                            </h2>

                            <p className="home-nur__sideText">
                                Las noticias del home dejan de vivir como módulo aislado
                                y pasan a formar parte de la experiencia principal de
                                inicio, con soporte para noticias normales, con botón,
                                relacionadas a evento o mixtas.
                            </p>

                            <div className="home-nur__sideList">
                                <article>
                                    <FaPeopleGroup />
                                    <div>
                                        <strong>Noticias por contexto</strong>
                                        <span>Home muestra noticias HOME; cada comunidad mostrará las suyas.</span>
                                    </div>
                                </article>

                                <article>
                                    <FaCalendarDays />
                                    <div>
                                        <strong>Eventos relacionados</strong>
                                        <span>Las noticias pueden conducir a contenido institucional asociado.</span>
                                    </div>
                                </article>

                                <article>
                                    <FaRobot />
                                    <div>
                                        <strong>Base lista para crecer</strong>
                                        <span>La UI ya queda preparada para reutilizar banners por home y por hub.</span>
                                    </div>
                                </article>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section className="home-nur__section">
                <div className="container">
                    {loadingNoticias ? (
                        <div className="nur-loader-block">
                            <div className="nur-loader-spinner" />
                            <p className="nur-text-secondary mb-0">
                                Cargando noticias principales...
                            </p>
                        </div>
                    ) : (
                        <NoticiasBannerSection
                            noticias={noticiasHome}
                            eyebrow="Noticias Home"
                            title="Actualidad institucional destacada"
                            subtitle="La portada principal del portal ahora concentra las noticias institucionales visibles para HOME, con composición enriquecida y reutilizable."
                            emptyTitle="Sin noticias Home disponibles"
                            emptyText="Todavía no existen noticias publicadas para la portada principal."
                            showContextFeatured={true}
                            showContextCompact={false}
                            onAdminAction={
                                isAdmin
                                    ? () => navigate(Routes.ADMIN.NOTICIAS.CREATE)
                                    : undefined
                            }
                            onNavigateEvento={(noticia) => {
                                if (noticia.evento) {
                                    navigate(Routes.EVENTOS);
                                }
                            }}
                        />
                    )}

                    {errorNoticias && (
                        <div className="nur-alert nur-alert--warning mt-4">
                            <div>
                                <strong>No se cargaron completamente las noticias.</strong>
                                <p className="mb-0 mt-1">{errorNoticias}</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="home-nur__section home-nur__section--soft">
                <div className="container">
                    <div className="home-nur__sectionHeader animate__animated animate__fadeInUp">
                        <div>
                            <span className="home-nur__eyebrow">Ecosistema Alumni</span>
                            <h2 className="home-nur__sectionTitle">Accesos principales del portal</h2>
                            <p className="home-nur__sectionText">
                                La portada también sirve como punto de entrada claro a los módulos
                                principales del sistema, sin depender únicamente del menú superior.
                            </p>
                        </div>
                    </div>

                    <div className="row g-4">
                        {accesos.map((item) => (
                            <div className="col-md-6 col-xl-4" key={item.title}>
                                <article className="home-nur__featureCard animate__animated animate__fadeInUp">
                                    <span className="home-nur__featureIcon">{item.icon}</span>
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                    <button
                                        type="button"
                                        className="home-nur__featureAction"
                                        onClick={item.action}
                                    >
                                        <span>{item.actionLabel}</span>
                                    </button>
                                </article>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="home-nur__section">
                <div className="container">
                    <div className="home-nur__highlight animate__animated animate__fadeInUp">
                        <div className="row align-items-center g-4">
                            <div className="col-lg-7">
                                <span className="home-nur__eyebrow">Valor institucional</span>
                                <h2 className="home-nur__sectionTitle">
                                    Una experiencia más clara, contextual y reutilizable
                                </h2>
                                <p className="home-nur__sectionText">
                                    Este home ya no funciona como una landing genérica. Ahora actúa como
                                    portada institucional del ecosistema Alumni, priorizando contenido
                                    útil, noticias visibles y rutas claras hacia la participación.
                                </p>

                                <ul className="home-nur__benefitsList">
                                    {beneficios.map((beneficio) => (
                                        <li key={beneficio}>
                                            <FaCircleCheck />
                                            <span>{beneficio}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="col-lg-5">
                                <div className="home-nur__ctaCard">
                                    <span className="home-nur__ctaIcon">
                                        <FaGraduationCap />
                                    </span>

                                    <h3>Accede al Portal Alumni</h3>

                                    <p>
                                        Ingresa para participar en comunidades, consultar recursos
                                        y mantenerte conectado con la actividad institucional.
                                    </p>

                                    <div className="home-nur__ctaActions">
                                        {!isAuthenticated && (
                                            <button
                                                type="button"
                                                className="nur-btn nur-btn--primary"
                                                onClick={() => navigate(Routes.AUTH.LOGIN)}
                                            >
                                                <FaRightToBracket />
                                                <span>Iniciar sesión</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="nur-btn nur-btn--ghost"
                                            onClick={() => navigate(Routes.COMUNIDAD.HOME)}
                                        >
                                            <FaPeopleGroup />
                                            <span>Ver comunidades</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="home-nur__section home-nur__section--soft">
                <div className="container">
                    <div className="home-nur__sectionHeader animate__animated animate__fadeInUp">
                        <div>
                            <span className="home-nur__eyebrow">Agenda Alumni</span>
                            <h2 className="home-nur__sectionTitle">Eventos destacados</h2>
                            <p className="home-nur__sectionText">
                                Los eventos permanecen como bloque complementario dentro de la portada,
                                sin competir con el nuevo banner principal de noticias.
                            </p>
                        </div>
                    </div>

                    {loadingEventos ? (
                        <div className="nur-loader-block">
                            <div className="nur-loader-spinner" />
                            <p className="nur-text-secondary mb-0">Cargando eventos...</p>
                        </div>
                    ) : eventos.length > 0 ? (
                        <div className="home-nur__sliderWrap animate__animated animate__fadeInUp">
                            <CategoriaSliderAdaptable
                                titulo=""
                                tipo="evento"
                                elementos={eventos}
                            />
                        </div>
                    ) : (
                        <div className="nur-empty-state">
                            <div className="nur-empty-state__icon">
                                <FaCalendarDays />
                            </div>
                            <h3 className="nur-empty-state__title">Sin eventos visibles</h3>
                            <p className="nur-empty-state__text">
                                Por el momento no existen eventos disponibles para mostrar.
                            </p>
                        </div>
                    )}

                    {errorEventos && (
                        <div className="nur-alert nur-alert--warning mt-4">
                            <div>
                                <strong>No se cargaron completamente los eventos.</strong>
                                <p className="mb-0 mt-1">{errorEventos}</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default HomePage;