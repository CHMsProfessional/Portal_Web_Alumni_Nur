import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Spinner } from "react-bootstrap";
import "animate.css";
import {
    FaArrowRight,
    FaComments,
    FaDoorOpen,
    FaLightbulb,
    FaPeopleGroup,
    FaUserCheck,
    FaUserPlus,
    FaUsers,
    FaGraduationCap,
    FaCircleCheck,
    FaCircleXmark,
    FaRotateRight,
    FaNewspaper,
    FaLayerGroup,
} from "react-icons/fa6";

import "./ComunidadesHome.css";

import { Routes } from "../../routes/CONSTANTS";
import { Comunidad } from "../../models/Comunidad/Comunidad";
import { Carrera } from "../../models/Carrera/Carrera";
import { Usuario } from "../../models/Usuario/Usuario";
import { UsuarioPerfil } from "../../models/Usuario/UsuarioPerfil";

import UserAlumniService from "../../services/alumni/UserAlumniService";
import { CarreraService } from "../../services/alumni/CarreraService";
import { ComunidadService } from "../../services/alumni/ComunidadService";

const placeholderImg = "/placeholder-comunidad.png";

type ComunidadesAgrupadas = Record<string, Comunidad[]>;

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

const normalizeText = (value?: string | null): string => value?.trim() ?? "";

const ComunidadesHome = () => {
    const navigate = useNavigate();

    const cachedPerfil = UserAlumniService.getCachedPerfilCompleto();

    const [perfil, setPerfil] = useState<UsuarioPerfil | null>(cachedPerfil ?? null);
    const [usuario, setUsuario] = useState<Usuario | null>(cachedPerfil?.usuario ?? null);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [comunidades, setComunidades] = useState<Comunidad[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState<string>("");

    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [modalMensaje, setModalMensaje] = useState<string>("");
    const [modalSuccess, setModalSuccess] = useState<boolean>(true);

    const usuarioId = useMemo<number | null>(() => usuario?.id ?? null, [usuario]);

    const carreraUsuarioId = useMemo<number | null>(() => {
        if (!usuario) return null;
        return usuario.carrera_id ?? usuario.carrera ?? null;
    }, [usuario]);

    const carrerasMap = useMemo<Map<number, Carrera>>(() => {
        return new Map<number, Carrera>(carreras.map((carrera) => [carrera.id, carrera]));
    }, [carreras]);

    const carreraUsuarioNombre = useMemo<string>(() => {
        const carreraNombrePerfil = normalizeText(usuario?.carrera_nombre);
        if (carreraNombrePerfil) return carreraNombrePerfil;

        if (carreraUsuarioId === null) return "Sin carrera definida";

        return carrerasMap.get(carreraUsuarioId)?.nombre ?? `Carrera ${carreraUsuarioId}`;
    }, [usuario?.carrera_nombre, carreraUsuarioId, carrerasMap]);

    const isMember = (comunidad: Comunidad): boolean => {
        if (!usuarioId) return false;

        if (typeof comunidad.pertenece_usuario_actual === "boolean") {
            return comunidad.pertenece_usuario_actual;
        }

        return (comunidad.usuarios ?? []).includes(usuarioId);
    };

    const isSuggestedForUser = (comunidad: Comunidad): boolean => {
        if (!usuarioId || carreraUsuarioId === null) return false;
        if (isMember(comunidad)) return false;

        const carrerasComunidad = comunidad.carreras ?? [];
        return carrerasComunidad.includes(carreraUsuarioId);
    };

    const getMiembrosCount = (comunidad: Comunidad): number => {
        return comunidad.total_miembros ?? comunidad.usuarios?.length ?? 0;
    };

    const getConversacionesCount = (comunidad: Comunidad): number => {
        return comunidad.total_conversaciones ?? 0;
    };

    const getConversacionesAbiertasCount = (comunidad: Comunidad): number => {
        return comunidad.total_conversaciones_abiertas ?? 0;
    };

    const getNoticiasCount = (comunidad: Comunidad): number => {
        return comunidad.total_noticias_publicadas ?? 0;
    };

    const comunidadesDesdePerfil = useMemo<Comunidad[]>(() => {
        return perfil?.comunidades ?? [];
    }, [perfil]);

    const comunidadesUnidas = useMemo<Comunidad[]>(() => {
        const idsDesdePerfil = new Set(
            comunidadesDesdePerfil
                .map((item) => item.id)
                .filter((id): id is number => typeof id === "number")
        );

        return comunidades
            .filter((comunidad) => {
                if (isMember(comunidad)) return true;
                return typeof comunidad.id === "number" && idsDesdePerfil.has(comunidad.id);
            })
            .sort((a, b) => {
                const diffConversaciones = getConversacionesCount(b) - getConversacionesCount(a);
                if (diffConversaciones !== 0) return diffConversaciones;

                return normalizeText(a.nombre).localeCompare(normalizeText(b.nombre));
            });
    }, [comunidades, comunidadesDesdePerfil, usuarioId]);

    const comunidadesSugeridas = useMemo<Comunidad[]>(() => {
        const idsUnidas = new Set(
            comunidadesUnidas
                .map((item) => item.id)
                .filter((id): id is number => typeof id === "number")
        );

        return comunidades
            .filter((comunidad) => {
                if (typeof comunidad.id === "number" && idsUnidas.has(comunidad.id)) {
                    return false;
                }
                return isSuggestedForUser(comunidad);
            })
            .sort((a, b) => {
                const diffNoticias = getNoticiasCount(b) - getNoticiasCount(a);
                if (diffNoticias !== 0) return diffNoticias;

                const diffConversaciones = getConversacionesCount(b) - getConversacionesCount(a);
                if (diffConversaciones !== 0) return diffConversaciones;

                return normalizeText(a.nombre).localeCompare(normalizeText(b.nombre));
            });
    }, [comunidades, comunidadesUnidas, usuarioId, carreraUsuarioId]);

    const agrupadas = useMemo<ComunidadesAgrupadas>(() => {
        const resultado: ComunidadesAgrupadas = {};
        const idsUnidas = new Set(
            comunidadesUnidas
                .map((item) => item.id)
                .filter((id): id is number => typeof id === "number")
        );

        comunidades.forEach((comunidad) => {
            if (typeof comunidad.id === "number" && idsUnidas.has(comunidad.id)) return;

            const carrerasIds = comunidad.carreras ?? [];

            carrerasIds.forEach((carreraId) => {
                const carrera = carrerasMap.get(carreraId);
                const nombreCarrera = carrera?.nombre ?? `Carrera ${carreraId}`;

                if (!resultado[nombreCarrera]) {
                    resultado[nombreCarrera] = [];
                }

                const yaExiste = resultado[nombreCarrera].some((item) => item.id === comunidad.id);

                if (!yaExiste) {
                    resultado[nombreCarrera].push(comunidad);
                }
            });
        });

        Object.keys(resultado).forEach((key) => {
            resultado[key] = resultado[key].sort((a, b) => {
                const diffNoticias = getNoticiasCount(b) - getNoticiasCount(a);
                if (diffNoticias !== 0) return diffNoticias;

                const diffConversaciones = getConversacionesCount(b) - getConversacionesCount(a);
                if (diffConversaciones !== 0) return diffConversaciones;

                return normalizeText(a.nombre).localeCompare(normalizeText(b.nombre));
            });
        });

        return resultado;
    }, [comunidades, comunidadesUnidas, carrerasMap]);

    const cargarDatos = async (forceRefreshPerfil = false): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const [perfilData, carrerasData, comunidadesData] = await Promise.all([
                UserAlumniService.loadPerfilCompleto(forceRefreshPerfil),
                CarreraService.list(),
                ComunidadService.list({ activo: true }),
            ]);

            setPerfil(perfilData ?? null);
            setUsuario(perfilData?.usuario ?? null);
            setCarreras(carrerasData ?? []);
            setComunidades(comunidadesData ?? []);
        } catch (err) {
            console.error("Error al cargar ComunidadesHome:", err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarDatos(false);
    }, []);

    const mostrarModal = (mensaje: string, success = true): void => {
        setModalMensaje(mensaje);
        setModalSuccess(success);
        setModalVisible(true);
    };

    const cerrarModal = (): void => {
        setModalVisible(false);
    };

    const goToComunityHub = (comunidadId: number | undefined): void => {
        if (!comunidadId) return;
        navigate(Routes.COMUNIDAD.HUB_PARAM(comunidadId));
    };

    // const goToLegacyCommunityFlow = (comunidadId?: number): void => {
    //     if (!comunidadId) return;
    //     navigate(Routes.COMUNIDAD.CHAT_PARAM(comunidadId));
    // };

    const handleUnirse = async (comunidadId?: number): Promise<void> => {
        if (!usuarioId || !comunidadId) return;

        setActionLoading(comunidadId);
        mostrarModal("Uniéndote a la comunidad...");

        try {
            await ComunidadService.agregarUsuario(comunidadId, usuarioId);
            await cargarDatos(true);

            setModalMensaje("¡Te uniste exitosamente a la comunidad!");
            setModalSuccess(true);

            setTimeout(() => {
                cerrarModal();
                goToComunityHub(comunidadId);
            }, 900);
        } catch (err) {
            console.error("Error al unirse a la comunidad:", err);
            setModalSuccess(false);
            setModalMensaje(getErrorMessage(err));
            setTimeout(cerrarModal, 1800);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSalir = async (comunidadId?: number): Promise<void> => {
        if (!usuarioId || !comunidadId) return;

        setActionLoading(comunidadId);
        mostrarModal("Saliendo de la comunidad...");

        try {
            await ComunidadService.quitarUsuario(comunidadId, usuarioId);
            await cargarDatos(true);

            setModalMensaje("Saliste de la comunidad correctamente.");
            setModalSuccess(true);
            setTimeout(cerrarModal, 1200);
        } catch (err) {
            console.error("Error al salir de la comunidad:", err);
            setModalSuccess(false);
            setModalMensaje(getErrorMessage(err));
            setTimeout(cerrarModal, 1800);
        } finally {
            setActionLoading(null);
        }
    };

    const getDescripcion = (comunidad: Comunidad): string => {
        const raw = comunidad.descripcion?.trim();
        if (raw) return raw;

        return "Espacio colaborativo para compartir experiencias, oportunidades, noticias y conversaciones entre miembros de la comunidad Alumni.";
    };

    const renderCommunityCard = (comunidad: Comunidad, action: "enter" | "join") => {
        const comunidadId = comunidad.id;
        const miembros = getMiembrosCount(comunidad);
        const conversaciones = getConversacionesCount(comunidad);
        const conversacionesAbiertas = getConversacionesAbiertasCount(comunidad);
        const noticias = getNoticiasCount(comunidad);
        const isBusy = actionLoading === comunidadId;

        return (
            <article className="col-12 col-md-6 col-xl-4" key={`${action}-${comunidadId}`}>
                <div className="comunidades-home__card animate__animated animate__fadeInUp">
                    <div className="comunidades-home__cardMedia">
                        <img
                            src={comunidad.imagen_portada || placeholderImg}
                            alt={comunidad.nombre || "Comunidad Alumni"}
                            className="comunidades-home__cardImage"
                        />

                        <div className="comunidades-home__cardOverlay" />

                        <div className="comunidades-home__cardBadge">
                            <FaUsers />
                            <span>{miembros} miembros</span>
                        </div>

                        {action === "enter" ? (
                            <div className="comunidades-home__cardStatus comunidades-home__cardStatus--member">
                                <FaUserCheck />
                                <span>Ya perteneces</span>
                            </div>
                        ) : (
                            <div className="comunidades-home__cardStatus comunidades-home__cardStatus--discover">
                                <FaLightbulb />
                                <span>Disponible</span>
                            </div>
                        )}
                    </div>

                    <div className="comunidades-home__cardBody">
                        <div className="comunidades-home__cardHeader">
                            <h4 className="comunidades-home__cardTitle">
                                {comunidad.nombre || "Comunidad sin nombre"}
                            </h4>

                            <p className="comunidades-home__cardDescription">
                                {getDescripcion(comunidad)}
                            </p>
                        </div>

                        <div className="comunidades-home__heroTags comunidades-home__heroTags--card">
                            <span className="comunidades-home__heroTag comunidades-home__heroTag--soft">
                                <FaComments />
                                {conversaciones} conversacion{conversaciones !== 1 ? "es" : ""}
                            </span>

                            <span className="comunidades-home__heroTag comunidades-home__heroTag--soft">
                                <FaNewspaper />
                                {noticias} noticia{noticias !== 1 ? "s" : ""}
                            </span>

                            <span className="comunidades-home__heroTag comunidades-home__heroTag--soft">
                                <FaLayerGroup />
                                {conversacionesAbiertas} abierta{conversacionesAbiertas !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <div className="comunidades-home__cardFooter">
                            {action === "enter" ? (
                                <div className="comunidades-home__cardActions comunidades-home__cardActions--dual">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--primary"
                                        onClick={() => goToComunityHub(comunidadId)}
                                        disabled={!comunidadId || isBusy}
                                    >
                                        <FaArrowRight />
                                        <span>Abrir comunidad</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={() => void handleSalir(comunidadId)}
                                        disabled={!comunidadId || isBusy}
                                    >
                                        {isBusy ? (
                                            <>
                                                <Spinner size="sm" />
                                                <span>Procesando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaDoorOpen />
                                                <span>Salir</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="comunidades-home__cardActions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--primary"
                                        onClick={() => void handleUnirse(comunidadId)}
                                        disabled={!comunidadId || isBusy}
                                    >
                                        {isBusy ? (
                                            <>
                                                <Spinner size="sm" />
                                                <span>Procesando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaUserPlus />
                                                <span>Unirme a esta comunidad</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </article>
        );
    };

    if (loading) {
        return (
            <div className="comunidades-home">
                <div className="container py-5">
                    <div className="comunidades-home__stateCard animate__animated animate__fadeIn">
                        <Spinner animation="border" role="status" />
                        <h3>Cargando comunidades</h3>
                        <p className="mb-0">
                            Estamos preparando tus espacios de interacción Alumni.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="comunidades-home">
                <div className="container py-5">
                    <div className="comunidades-home__stateCard comunidades-home__stateCard--error animate__animated animate__fadeIn">
                        <FaCircleXmark />
                        <h3>No fue posible cargar la comunidad</h3>
                        <p>{error}</p>

                        <button
                            type="button"
                            className="nur-btn nur-btn--primary"
                            onClick={() => void cargarDatos(true)}
                        >
                            <FaRotateRight />
                            <span>Reintentar</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!usuarioId) {
        return (
            <div className="comunidades-home">
                <div className="container py-5">
                    <div className="comunidades-home__stateCard comunidades-home__stateCard--warning animate__animated animate__fadeIn">
                        <FaCircleXmark />
                        <h3>No se pudo identificar al usuario</h3>
                        <p className="mb-0">
                            El portal no logró recuperar el perfil actual para construir las comunidades disponibles.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="comunidades-home">
            <section className="comunidades-home__hero animate__animated animate__fadeIn">
                <div className="container">
                    <div className="comunidades-home__heroGrid">
                        <div className="comunidades-home__heroContent">
                            <span className="comunidades-home__eyebrow">
                                <FaPeopleGroup />
                                Comunidad profesional Alumni NUR
                            </span>

                            <h1 className="comunidades-home__title">
                                Comunidades, conversaciones y networking
                            </h1>

                            <p className="comunidades-home__subtitle">
                                Explora comunidades como espacios integrales de interacción: miembros,
                                conversaciones activas, noticias y participación académica alineada con tu carrera.
                            </p>

                            <div className="comunidades-home__heroTags">
                                <span className="comunidades-home__heroTag">
                                    <FaGraduationCap />
                                    {carreraUsuarioNombre}
                                </span>

                                <span className="comunidades-home__heroTag comunidades-home__heroTag--soft">
                                    <FaPeopleGroup />
                                    {comunidades.length} comunidades disponibles
                                </span>
                            </div>
                        </div>

                        <div className="comunidades-home__heroStats">
                            <div className="comunidades-home__statCard">
                                <span className="comunidades-home__statValue">{comunidadesUnidas.length}</span>
                                <span className="comunidades-home__statLabel">Mis comunidades</span>
                            </div>

                            <div className="comunidades-home__statCard">
                                <span className="comunidades-home__statValue">{comunidadesSugeridas.length}</span>
                                <span className="comunidades-home__statLabel">Sugerencias para ti</span>
                            </div>

                            <div className="comunidades-home__statCard">
                                <span className="comunidades-home__statValue">
                                    {comunidades.reduce(
                                        (acc, comunidad) => acc + getConversacionesCount(comunidad),
                                        0
                                    )}
                                </span>
                                <span className="comunidades-home__statLabel">Conversaciones registradas</span>
                            </div>

                            <div className="comunidades-home__statCard">
                                <span className="comunidades-home__statValue">
                                    {comunidades.reduce(
                                        (acc, comunidad) => acc + getNoticiasCount(comunidad),
                                        0
                                    )}
                                </span>
                                <span className="comunidades-home__statLabel">Noticias publicadas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="comunidades-home__section">
                <div className="container">
                    <div className="comunidades-home__sectionHeader">
                        <div>
                            <span className="comunidades-home__sectionEyebrow">
                                <FaUserCheck />
                                Mis comunidades
                            </span>
                            <h2 className="comunidades-home__sectionTitle">Tus espacios actuales</h2>
                            <p className="comunidades-home__sectionText">
                                Ingresa a tus comunidades actuales. Por compatibilidad, el acceso sigue
                                apuntando al flujo legacy mientras migramos la experiencia completa del hub y conversaciones.
                            </p>
                        </div>
                    </div>

                    {comunidadesUnidas.length === 0 ? (
                        <div className="comunidades-home__emptyState">
                            <FaPeopleGroup />
                            <h3>Aún no perteneces a ninguna comunidad</h3>
                            <p>
                                Revisa las sugerencias más abajo y únete a los espacios que mejor
                                se alineen con tu carrera e intereses.
                            </p>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {comunidadesUnidas.map((comunidad) => renderCommunityCard(comunidad, "enter"))}
                        </div>
                    )}
                </div>
            </section>

            <section className="comunidades-home__section comunidades-home__section--alt">
                <div className="container">
                    <div className="comunidades-home__sectionHeader">
                        <div>
                            <span className="comunidades-home__sectionEyebrow">
                                <FaLightbulb />
                                Sugerencias destacadas
                            </span>
                            <h2 className="comunidades-home__sectionTitle">
                                Comunidades recomendadas para tu carrera
                            </h2>
                            <p className="comunidades-home__sectionText">
                                Estas sugerencias se priorizan según la carrera asociada a tu perfil
                                y ya muestran el enfoque nuevo de comunidad como hub.
                            </p>
                        </div>
                    </div>

                    {comunidadesSugeridas.length === 0 ? (
                        <div className="comunidades-home__emptyState comunidades-home__emptyState--soft">
                            <FaLightbulb />
                            <h3>No hay sugerencias disponibles por ahora</h3>
                            <p>
                                Cuando existan comunidades relacionadas con tu carrera, aparecerán aquí
                                como recomendación principal.
                            </p>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {comunidadesSugeridas.map((comunidad) => renderCommunityCard(comunidad, "join"))}
                        </div>
                    )}
                </div>
            </section>

            <section className="comunidades-home__section">
                <div className="container">
                    <div className="comunidades-home__sectionHeader">
                        <div>
                            <span className="comunidades-home__sectionEyebrow">
                                <FaGraduationCap />
                                Explorar por carrera
                            </span>
                            <h2 className="comunidades-home__sectionTitle">
                                Catálogo de comunidades académicas
                            </h2>
                            <p className="comunidades-home__sectionText">
                                Explora comunidades abiertas organizadas según la carrera a la que están vinculadas.
                            </p>
                        </div>
                    </div>

                    {Object.keys(agrupadas).length === 0 ? (
                        <div className="comunidades-home__emptyState">
                            <FaUsers />
                            <h3>No hay comunidades disponibles para mostrar</h3>
                            <p>
                                El catálogo agrupado aparecerá aquí cuando existan comunidades relacionadas
                                a carreras registradas.
                            </p>
                        </div>
                    ) : (
                        <div className="comunidades-home__groupList">
                            {Object.entries(agrupadas)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([nombreCarrera, lista]) => (
                                    <div key={nombreCarrera} className="comunidades-home__groupBlock">
                                        <div className="comunidades-home__groupHeader">
                                            <div>
                                                <h3 className="comunidades-home__groupTitle">{nombreCarrera}</h3>
                                                <p className="comunidades-home__groupMeta">
                                                    {lista.length} comunidad{lista.length !== 1 ? "es" : ""} disponible
                                                    {lista.length !== 1 ? "s" : ""}
                                                </p>
                                            </div>

                                            <span className="comunidades-home__groupPill">
                                                <FaArrowRight />
                                                Explorar
                                            </span>
                                        </div>

                                        <div className="row g-4">
                                            {lista.map((comunidad) => renderCommunityCard(comunidad, "join"))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </section>

            <Modal
                show={modalVisible}
                centered
                onHide={cerrarModal}
                contentClassName="comunidades-home__modalContent"
            >
                <div
                    className={`comunidades-home__modalBody ${
                        modalSuccess
                            ? "comunidades-home__modalBody--success"
                            : "comunidades-home__modalBody--error"
                    }`}
                >
                    <div className="comunidades-home__modalIcon">
                        {modalSuccess ? <FaCircleCheck /> : <FaCircleXmark />}
                    </div>
                    <p className="comunidades-home__modalText mb-0">{modalMensaje}</p>
                </div>
            </Modal>
        </div>
    );
};

export default ComunidadesHome;