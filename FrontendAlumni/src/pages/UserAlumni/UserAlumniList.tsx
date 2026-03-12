import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import "animate.css";
import {
    FaArrowRight,
    FaEnvelope,
    FaGraduationCap,
    FaShieldHalved,
    FaTrash,
    FaTriangleExclamation,
    FaUserCheck,
    FaUsers,
    FaIdBadge,
    FaMagnifyingGlass,
    FaFilter,
} from "react-icons/fa6";
import {
    FaEdit,
    FaPlusCircle,
    FaRedo,
} from "react-icons/fa";

import { UserAlumniService } from "../../services/alumni/UserAlumniService";
import { Routes } from "../../routes/CONSTANTS";
import { Usuario } from "../../models/Usuario/Usuario";

import "./UserAlumniList.css";

const getDisplayName = (usuario: Usuario): string => {
    const firstName = usuario.user?.first_name?.trim() ?? "";
    const lastName = usuario.user?.last_name?.trim() ?? "";
    const username = usuario.user?.username?.trim() ?? "";

    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || username || `Usuario ${usuario.id ?? ""}`.trim();
};

const getRoleLabel = (usuario: Usuario): string =>
    usuario.is_admin ? "Administrador" : "Usuario estándar";

const getRoleValue = (usuario: Usuario): "admin" | "user" =>
    usuario.is_admin ? "admin" : "user";

const UserAlumniList = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [rolFiltro, setRolFiltro] = useState("");

    const navigate = useNavigate();

    const cargarUsuarios = async (): Promise<void> => {
        setLoading(true);
        setError("");

        try {
            const perfil = await UserAlumniService.loadPerfilCompleto();
            const myUserId = perfil?.usuario?.id ?? null;

            setCurrentUserId(myUserId);

            const response = await UserAlumniService.getAll();
            const filtrados = myUserId
                ? response.filter((u) => u.id !== myUserId)
                : response;

            setUsuarios(filtrados);
        } catch (err) {
            console.error("Error al cargar usuarios:", err);
            setError("No se pudieron cargar los usuarios alumni.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void cargarUsuarios();
    }, []);

    const usuariosFiltrados = useMemo(() => {
        const texto = search.trim().toLowerCase();

        return usuarios.filter((usuario) => {
            const fullName = getDisplayName(usuario).toLowerCase();
            const username = usuario.user?.username?.toLowerCase() ?? "";
            const email = usuario.user?.email?.toLowerCase() ?? "";
            const carrera = usuario.carrera_nombre?.toLowerCase() ?? "";
            const role = usuario.is_admin ? "admin" : "user";

            const coincideTexto = texto
                ? fullName.includes(texto) ||
                  username.includes(texto) ||
                  email.includes(texto) ||
                  carrera.includes(texto)
                : true;

            const coincideRol = rolFiltro ? role === rolFiltro : true;

            return coincideTexto && coincideRol;
        });
    }, [usuarios, search, rolFiltro]);

    const stats = useMemo(() => {
        const total = usuarios.length;
        const admins = usuarios.filter((u) => u.is_admin).length;
        const usuariosEstandar = total - admins;

        return {
            total,
            admins,
            usuariosEstandar,
        };
    }, [usuarios]);

    const handleEliminar = async (usuario: Usuario): Promise<void> => {
        const nombre = getDisplayName(usuario);

        const confirmado = window.confirm(
            `¿Deseas eliminar al usuario "${nombre}"?\n\nEsta acción también eliminará su acceso al sistema.`
        );

        if (!confirmado || !usuario.id) {
            return;
        }

        try {
            setDeletingId(usuario.id);
            await UserAlumniService.deleteUser(usuario.id);

            setUsuarios((prev) => prev.filter((item) => item.id !== usuario.id));
        } catch (err) {
            console.error("Error al eliminar usuario:", err);
            setError("No se pudo eliminar el usuario seleccionado.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="users-admin-page">
            <section className="users-admin-hero">
                <div className="users-admin-hero__bg"></div>

                <div className="container users-admin-hero__container">
                    <div className="users-admin-hero__content animate__animated animate__fadeIn">
                        <div className="users-admin-hero__main">
                            <span className="users-admin-hero__eyebrow">
                                <FaShieldHalved />
                                Gestión administrativa
                            </span>

                            <h1 className="users-admin-hero__title">
                                Administración de usuarios alumni
                            </h1>

                            <p className="users-admin-hero__text">
                                Administra las cuentas del portal, revisa roles, carreras asociadas
                                y mantén controlado el acceso institucional de los usuarios.
                            </p>

                            <div className="users-admin-hero__actions">
                                <button
                                    type="button"
                                    className="nur-btn nur-btn--primary"
                                    onClick={() => navigate(Routes.ADMIN.USUARIOS.CREATE)}
                                >
                                    <FaPlusCircle />
                                    <span>Crear usuario</span>
                                </button>

                                <button
                                    type="button"
                                    className="nur-btn nur-btn--ghost"
                                    onClick={() => void cargarUsuarios()}
                                    disabled={loading}
                                >
                                    <FaRedo />
                                    <span>Recargar listado</span>
                                </button>
                            </div>
                        </div>

                        <div className="users-admin-hero__stats">
                            <article className="users-admin-stat">
                                <span className="users-admin-stat__icon">
                                    <FaUsers />
                                </span>
                                <div>
                                    <strong>{stats.total}</strong>
                                    <p>Total de usuarios</p>
                                </div>
                            </article>

                            <article className="users-admin-stat">
                                <span className="users-admin-stat__icon">
                                    <FaShieldHalved />
                                </span>
                                <div>
                                    <strong>{stats.admins}</strong>
                                    <p>Administradores</p>
                                </div>
                            </article>

                            <article className="users-admin-stat">
                                <span className="users-admin-stat__icon">
                                    <FaUserCheck />
                                </span>
                                <div>
                                    <strong>{stats.usuariosEstandar}</strong>
                                    <p>Usuarios estándar</p>
                                </div>
                            </article>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container users-admin-main">
                <section className="users-admin-filters animate__animated animate__fadeInUp">
                    <div className="users-admin-filters__header">
                        <div>
                            <span className="users-admin-filters__eyebrow">
                                Exploración
                            </span>
                            <h2>Filtros del listado</h2>
                        </div>
                    </div>

                    <div className="users-admin-filters__grid">
                        <div className="users-admin-field">
                            <label htmlFor="search">
                                <FaMagnifyingGlass />
                                <span>Buscar usuario</span>
                            </label>
                            <input
                                id="search"
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Nombre, usuario, correo o carrera"
                            />
                        </div>

                        <div className="users-admin-field">
                            <label htmlFor="rolFiltro">
                                <FaFilter />
                                <span>Filtrar por rol</span>
                            </label>
                            <select
                                id="rolFiltro"
                                value={rolFiltro}
                                onChange={(e) => setRolFiltro(e.target.value)}
                            >
                                <option value="">Todos</option>
                                <option value="admin">Administradores</option>
                                <option value="user">Usuarios estándar</option>
                            </select>
                        </div>
                    </div>
                </section>

                {error && (
                    <section className="users-admin-state users-admin-state--error animate__animated animate__fadeIn">
                        <FaTriangleExclamation />
                        <div>
                            <h3>No se pudo completar la operación</h3>
                            <p>{error}</p>
                        </div>
                    </section>
                )}

                {loading ? (
                    <section className="users-admin-state animate__animated animate__fadeIn">
                        <Spinner animation="border" size="sm" />
                        <div>
                            <h3>Cargando usuarios</h3>
                            <p>Estamos recuperando el listado administrativo del portal.</p>
                        </div>
                    </section>
                ) : usuariosFiltrados.length === 0 ? (
                    <section className="users-admin-empty animate__animated animate__fadeIn">
                        <FaUsers />
                        <h3>No se encontraron usuarios</h3>
                        <p>
                            No hay coincidencias con los filtros actuales o todavía no existen
                            usuarios disponibles para mostrar.
                        </p>
                    </section>
                ) : (
                    <section className="users-admin-grid animate__animated animate__fadeInUp">
                        {usuariosFiltrados.map((usuario) => {
                            const nombre = getDisplayName(usuario);
                            const rol = getRoleLabel(usuario);
                            const rolValue = getRoleValue(usuario);

                            return (
                                <article key={usuario.id} className="users-admin-card">
                                    <div className="users-admin-card__header">
                                        <div className="users-admin-card__identity">
                                            <div className="users-admin-card__avatar">
                                                {usuario.is_admin ? (
                                                    <FaShieldHalved />
                                                ) : (
                                                    <FaUserCheck />
                                                )}
                                            </div>

                                            <div>
                                                <h3>{nombre}</h3>
                                                <span className="users-admin-card__username">
                                                    @{usuario.user?.username || "sin-usuario"}
                                                </span>
                                            </div>
                                        </div>

                                        <span
                                            className={`users-admin-card__role users-admin-card__role--${rolValue}`}
                                        >
                                            {rol}
                                        </span>
                                    </div>

                                    <div className="users-admin-card__body">
                                        <ul className="users-admin-card__meta">
                                            <li>
                                                <FaEnvelope />
                                                <div>
                                                    <strong>Correo</strong>
                                                    <span>{usuario.user?.email || "No definido"}</span>
                                                </div>
                                            </li>

                                            <li>
                                                <FaGraduationCap />
                                                <div>
                                                    <strong>Carrera</strong>
                                                    <span>
                                                        {usuario.carrera_nombre ||
                                                            usuario.carrera_codigo ||
                                                            "No definida"}
                                                    </span>
                                                </div>
                                            </li>

                                            <li>
                                                <FaIdBadge />
                                                <div>
                                                    <strong>ID</strong>
                                                    <span>{usuario.id ?? "N/D"}</span>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="users-admin-card__footer">
                                        <button
                                            type="button"
                                            className="users-admin-card__btn users-admin-card__btn--edit"
                                            onClick={() =>
                                                navigate(
                                                    Routes.ADMIN.USUARIOS.EDIT_PARAM(
                                                        usuario.id
                                                    )
                                                )
                                            }
                                        >
                                            <FaEdit />
                                            <span>Editar</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="users-admin-card__btn users-admin-card__btn--delete"
                                            onClick={() => void handleEliminar(usuario)}
                                            disabled={
                                                deletingId === usuario.id ||
                                                currentUserId === usuario.id
                                            }
                                        >
                                            <FaTrash />
                                            <span>
                                                {deletingId === usuario.id
                                                    ? "Eliminando..."
                                                    : "Eliminar"}
                                            </span>
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}

                {!loading && usuariosFiltrados.length > 0 && (
                    <section className="users-admin-bottom-cta animate__animated animate__fadeInUp">
                        <div>
                            <h3>¿Necesitas registrar otro usuario?</h3>
                            <p>
                                Crea nuevas cuentas alumni y mantén actualizada la base de acceso
                                institucional del portal.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="nur-btn nur-btn--primary"
                            onClick={() => navigate(Routes.ADMIN.USUARIOS.CREATE)}
                        >
                            <FaPlusCircle />
                            <span>Nuevo usuario</span>
                            <FaArrowRight />
                        </button>
                    </section>
                )}
            </div>
        </div>
    );
};

export default UserAlumniList;