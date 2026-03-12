/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "animate.css";
import {
    FaArrowLeft,
    FaFloppyDisk,
    FaGraduationCap,
    FaIdBadge,
    FaKey,
    FaShieldHalved,
    FaUserGear,
    FaUserLarge,
    FaUserPlus,
    FaUsersGear,
} from "react-icons/fa6";

import "./UserAlumniForm.css";
import { Routes } from "../../routes/CONSTANTS";
import { UserAlumniService } from "../../services/alumni/UserAlumniService";
import { CarreraService } from "../../services/alumni/CarreraService";

import { Usuario } from "../../models/Usuario/Usuario";
import { Carrera } from "../../models/Carrera/Carrera";
import { UserAlumniAdminCreateRequest } from "../../models/Usuario/UserAlumniAdminCreateRequest";
import { UserAlumniAdminUpdateRequest } from "../../models/Usuario/UserAlumniAdminUpdateRequest";
import { UserAlumniSelfUpdateRequest } from "../../models/Usuario/UserAlumniSelfUpdateRequest";

type FormMode = "admin-create" | "admin-edit" | "self-edit";

interface FormState {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    carrera: string;
    is_admin: boolean;
}

const initialFormState: FormState = {
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    carrera: "",
    is_admin: false,
};

const UserAlumniForm = () => {
    const navigate = useNavigate();
    const params = useParams();

    const [mode, setMode] = useState<FormMode>("self-edit");
    const [targetUserId, setTargetUserId] = useState<number | null>(null);

    const [form, setForm] = useState<FormState>(initialFormState);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");

    const isAdminCreate = mode === "admin-create";
    const isAdminEdit = mode === "admin-edit";
    const isSelfEdit = mode === "self-edit";
    const isAdminMode = isAdminCreate || isAdminEdit;


    const pageMeta = useMemo(() => {
        if (isAdminCreate) {
            return {
                eyebrow: "Administración",
                title: "Crear usuario alumni",
                subtitle:
                    "Registra un nuevo usuario del portal y define su carrera y nivel de acceso.",
                icon: <FaUserPlus />,
            };
        }

        if (isAdminEdit) {
            return {
                eyebrow: "Administración",
                title: "Editar usuario alumni",
                subtitle:
                    "Actualiza la información operativa del usuario, su carrera y sus privilegios.",
                icon: <FaUsersGear />,
            };
        }

        return {
            eyebrow: "Perfil",
            title: "Editar mi perfil",
            subtitle:
                "Actualiza tus datos personales y, si lo deseas, cambia tu contraseña.",
            icon: <FaUserGear />,
        };
    }, [isAdminCreate, isAdminEdit]);

    const canSubmit = useMemo(() => {
        const firstNameOk = form.first_name.trim().length > 0;
        const lastNameOk = form.last_name.trim().length > 0;

        if (isAdminCreate) {
            return (
                form.username.trim().length > 0 &&
                form.password.trim().length > 0 &&
                form.carrera.trim().length > 0 &&
                firstNameOk &&
                lastNameOk &&
                !saving
            );
        }

        return firstNameOk && lastNameOk && !saving;
    }, [form, isAdminCreate, saving]);

    useEffect(() => {
        const detectModeAndLoad = async (): Promise<void> => {
            setLoading(true);
            setError("");
            setSuccessMessage("");

            try {
                const path = window.location.pathname;
                const rawId = params.id ? Number(params.id) : null;
                const inAdminCreate = path === Routes.ADMIN.USUARIOS.CREATE;
                const inAdminEdit =
                    !!params.id &&
                    path.includes("/admin/usuarios/editar/");

                if (inAdminCreate) {
                    setMode("admin-create");
                    setTargetUserId(null);
                    setForm(initialFormState);

                    const carrerasData = await CarreraService.list();
                    setCarreras(carrerasData ?? []);
                    return;
                }

                if (inAdminEdit && rawId && !Number.isNaN(rawId)) {
                    setMode("admin-edit");
                    setTargetUserId(rawId);

                    const [usuario, carrerasData] = await Promise.all([
                        UserAlumniService.getById(rawId),
                        CarreraService.list(),
                    ]);

                    setCarreras(carrerasData ?? []);
                    setForm(mapUsuarioToForm(usuario));
                    return;
                }

                setMode("self-edit");

                const [perfilCompleto, carrerasData] = await Promise.all([
                    UserAlumniService.loadPerfilCompleto(false),
                    CarreraService.list().catch(() => [] as Carrera[]),
                ]);

                const usuario = perfilCompleto?.usuario ?? null;

                if (!usuario?.id) {
                    throw new Error("No se pudo cargar el usuario autenticado.");
                }

                setTargetUserId(usuario.id);
                setCarreras(carrerasData ?? []);
                setForm(mapUsuarioToForm(usuario));
            } catch (err: any) {
                console.error("Error cargando formulario de usuario:", err);

                const backendError =
                    err?.response?.data?.detail ||
                    err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    "No se pudo cargar la información del formulario.";

                setError(backendError);
            } finally {
                setLoading(false);
            }
        };

        void detectModeAndLoad();
    }, [params.id]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ): void => {
        const { name, value, type } = e.target;

        if (type === "checkbox" && e.target instanceof HTMLInputElement) {
            setForm((prev) => ({
                ...prev,
                [name]: (e.target as HTMLInputElement).checked,
            }));
            return;
        }

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!canSubmit || saving) {
            return;
        }

        setSaving(true);
        setError("");
        setSuccessMessage("");

        try {
            if (isAdminCreate) {
                const payload: UserAlumniAdminCreateRequest = {
                    username: form.username.trim(),
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    email: normalizeOptionalString(form.email),
                    password: form.password.trim(),
                    carrera: Number(form.carrera),
                    is_admin: form.is_admin,
                };

                await UserAlumniService.createAdminUser(payload);
                setSuccessMessage("Usuario creado correctamente.");
                navigate(Routes.ADMIN.USUARIOS.LIST);
                return;
            }

            if (!targetUserId) {
                throw new Error("No se encontró el usuario objetivo para guardar.");
            }

            if (isAdminEdit) {
                const payload: UserAlumniAdminUpdateRequest = {
                    username: form.username.trim() || undefined,
                    first_name: form.first_name.trim() || undefined,
                    last_name: form.last_name.trim() || undefined,
                    email: normalizeOptionalString(form.email),
                    password: form.password.trim() || undefined,
                    carrera: form.carrera ? Number(form.carrera) : undefined,
                    is_admin: form.is_admin,
                };

                await UserAlumniService.updateAdminUser(targetUserId, payload);
                setSuccessMessage("Usuario actualizado correctamente.");
                navigate(Routes.ADMIN.USUARIOS.LIST);
                return;
            }

            const selfPayload: UserAlumniSelfUpdateRequest = {
                first_name: form.first_name.trim() || undefined,
                last_name: form.last_name.trim() || undefined,
                email: normalizeOptionalString(form.email),
                password: form.password.trim() || undefined,
            };

            await UserAlumniService.updateMyProfile(targetUserId, selfPayload);
            setSuccessMessage("Tu perfil fue actualizado correctamente.");
            navigate(Routes.USER.PROFILE());
        } catch (err: any) {
            console.error("Error guardando usuario:", err);

            const responseData = err?.response?.data;

            if (responseData && typeof responseData === "object") {
                const flattened = flattenBackendErrors(responseData);
                setError(flattened || "No se pudo guardar la información.");
            } else {
                setError(
                    err?.message || "No se pudo guardar la información del usuario."
                );
            }
        } finally {
            setSaving(false);
        }
    };

    const handleGoBack = (): void => {
        if (isAdminMode) {
            navigate(Routes.ADMIN.USUARIOS.LIST);
            return;
        }

        navigate(Routes.USER.PROFILE());
    };

    if (loading) {
        return (
            <section className="user-form-page">
                <div className="container">
                    <div className="user-form-feedback user-form-feedback--loading animate__animated animate__fadeIn">
                        <h3>Cargando formulario</h3>
                        <p>Estamos preparando la información del usuario y sus permisos.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="user-form-page">
            <div className="user-form-page__bg"></div>

            <div className="container user-form-page__container">
                <div className="user-form-shell animate__animated animate__fadeIn">
                    <div className="user-form-header">
                        <div className="user-form-header__badge">
                            {pageMeta.icon}
                            <span>{pageMeta.eyebrow}</span>
                        </div>

                        <div className="user-form-header__content">
                            <h1>{pageMeta.title}</h1>
                            <p>{pageMeta.subtitle}</p>
                        </div>

                        <div className="user-form-header__actions">
                            <button
                                type="button"
                                className="nur-btn nur-btn--ghost"
                                onClick={handleGoBack}
                            >
                                <FaArrowLeft />
                                <span>Volver</span>
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="user-form-feedback user-form-feedback--error animate__animated animate__fadeIn">
                            <h3>No se pudo continuar</h3>
                            <p>{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="user-form-feedback user-form-feedback--success animate__animated animate__fadeIn">
                            <h3>Operación completada</h3>
                            <p>{successMessage}</p>
                        </div>
                    )}

                    <div className="user-form-layout">
                        <aside className="user-form-panel user-form-panel--summary">
                            <div className="user-form-panel__icon">
                                {isAdminMode ? <FaShieldHalved /> : <FaUserLarge />}
                            </div>

                            <h2>{isAdminMode ? "Gestión de acceso" : "Actualización personal"}</h2>

                            <p>
                                {isAdminMode
                                    ? "Desde este formulario puedes administrar la identidad operativa del usuario dentro del portal Alumni."
                                    : "Aquí puedes actualizar tus datos básicos sin exponer configuraciones administrativas sensibles."}
                            </p>

                            <ul className="user-form-summary">
                                <li>
                                    <FaIdBadge />
                                    <span>
                                        {isAdminMode
                                            ? "Modo administrativo habilitado"
                                            : "Edición limitada a tu propio perfil"}
                                    </span>
                                </li>
                                <li>
                                    <FaGraduationCap />
                                    <span>
                                        {isAdminMode
                                            ? "Carrera editable por administración"
                                            : "La carrera permanece gestionada por administración"}
                                    </span>
                                </li>
                                <li>
                                    <FaKey />
                                    <span>
                                        La contraseña es opcional al editar y obligatoria al crear.
                                    </span>
                                </li>
                            </ul>

                            <div className="user-form-panel__footer">
                                <span className="user-form-panel__pill">
                                    {isAdminCreate
                                        ? "Alta de usuario"
                                        : isAdminEdit
                                            ? "Edición administrativa"
                                            : "Edición de perfil"}
                                </span>
                            </div>
                        </aside>

                        <div className="user-form-panel user-form-panel--form">
                            <form onSubmit={handleSubmit} className="user-form">
                                {isAdminMode && (
                                    <div className="user-form-section">
                                        <div className="user-form-section__header">
                                            <h3>Datos de acceso</h3>
                                            <p>
                                                Define la identidad principal del usuario dentro del sistema.
                                            </p>
                                        </div>

                                        <div className="user-form-grid">
                                            <div className="user-form-field">
                                                <label htmlFor="username">Usuario</label>
                                                <input
                                                    id="username"
                                                    name="username"
                                                    type="text"
                                                    value={form.username}
                                                    onChange={handleChange}
                                                    placeholder="Ej. crichter"
                                                    disabled={saving || isSelfEdit}
                                                    required={isAdminCreate}
                                                />
                                            </div>

                                            <div className="user-form-field">
                                                <label htmlFor="password">
                                                    {isAdminCreate
                                                        ? "Contraseña"
                                                        : "Nueva contraseña"}
                                                </label>
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    value={form.password}
                                                    onChange={handleChange}
                                                    placeholder={
                                                        isAdminCreate
                                                            ? "Ingresa una contraseña"
                                                            : "Déjalo vacío para mantener la actual"
                                                    }
                                                    disabled={saving}
                                                    required={isAdminCreate}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isAdminMode && (
                                    <div className="user-form-section">
                                        <div className="user-form-section__header">
                                            <h3>Seguridad</h3>
                                            <p>
                                                Si deseas cambiar tu contraseña, ingresa una nueva. Si no,
                                                el sistema conservará la actual.
                                            </p>
                                        </div>

                                        <div className="user-form-grid">
                                            <div className="user-form-field user-form-field--full">
                                                <label htmlFor="password">Nueva contraseña</label>
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    value={form.password}
                                                    onChange={handleChange}
                                                    placeholder="Déjalo vacío para mantener la actual"
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="user-form-section">
                                    <div className="user-form-section__header">
                                        <h3>Datos personales</h3>
                                        <p>
                                            Información visible y útil para la experiencia general del portal.
                                        </p>
                                    </div>

                                    <div className="user-form-grid">
                                        <div className="user-form-field">
                                            <label htmlFor="first_name">Nombres</label>
                                            <input
                                                id="first_name"
                                                name="first_name"
                                                type="text"
                                                value={form.first_name}
                                                onChange={handleChange}
                                                placeholder="Ingresa los nombres"
                                                disabled={saving}
                                                required
                                            />
                                        </div>

                                        <div className="user-form-field">
                                            <label htmlFor="last_name">Apellidos</label>
                                            <input
                                                id="last_name"
                                                name="last_name"
                                                type="text"
                                                value={form.last_name}
                                                onChange={handleChange}
                                                placeholder="Ingresa los apellidos"
                                                disabled={saving}
                                                required
                                            />
                                        </div>

                                        <div className="user-form-field user-form-field--full">
                                            <label htmlFor="email">Correo electrónico</label>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={form.email}
                                                onChange={handleChange}
                                                placeholder="Ej. usuario@correo.com"
                                                disabled={saving}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isAdminMode && (
                                    <div className="user-form-section">
                                        <div className="user-form-section__header">
                                            <h3>Contexto institucional</h3>
                                            <p>
                                                Define la carrera asociada y el nivel de privilegio del usuario.
                                            </p>
                                        </div>

                                        <div className="user-form-grid">
                                            <div className="user-form-field">
                                                <label htmlFor="carrera">Carrera</label>
                                                <select
                                                    id="carrera"
                                                    name="carrera"
                                                    value={form.carrera}
                                                    onChange={handleChange}
                                                    disabled={saving}
                                                    required={isAdminCreate}
                                                >
                                                    <option value="">Selecciona una carrera</option>
                                                    {carreras.map((carrera) => (
                                                        <option key={carrera.id} value={carrera.id}>
                                                            {carrera.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="user-form-field">
                                                <label htmlFor="is_admin">Rol del sistema</label>
                                                <div className="user-form-checkbox">
                                                    <input
                                                        id="is_admin"
                                                        name="is_admin"
                                                        type="checkbox"
                                                        checked={form.is_admin}
                                                        onChange={handleChange}
                                                        disabled={saving}
                                                    />
                                                    <label htmlFor="is_admin">
                                                        Conceder privilegios administrativos
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="user-form-actions">
                                    <button
                                        type="button"
                                        className="nur-btn nur-btn--ghost"
                                        onClick={handleGoBack}
                                        disabled={saving}
                                    >
                                        <FaArrowLeft />
                                        <span>Cancelar</span>
                                    </button>

                                    <button
                                        type="submit"
                                        className="nur-btn nur-btn--primary"
                                        disabled={!canSubmit}
                                    >
                                        <FaFloppyDisk />
                                        <span>
                                            {saving
                                                ? "Guardando..."
                                                : isAdminCreate
                                                    ? "Crear usuario"
                                                    : "Guardar cambios"}
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

function mapUsuarioToForm(usuario: Usuario): FormState {
    return {
        username: usuario?.user?.username ?? "",
        first_name: usuario?.user?.first_name ?? "",
        last_name: usuario?.user?.last_name ?? "",
        email: usuario?.user?.email ?? "",
        password: "",
        carrera: String(usuario?.carrera_id ?? usuario?.carrera ?? ""),
        is_admin: Boolean(usuario?.is_admin),
    };
}

function normalizeOptionalString(value: string): string | undefined {
    const normalized = value.trim();
    return normalized.length ? normalized : undefined;
}

function flattenBackendErrors(errorObject: Record<string, any>): string {
    const messages: string[] = [];

    Object.entries(errorObject).forEach(([field, value]) => {
        if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(", ")}`);
            return;
        }

        if (typeof value === "string") {
            messages.push(`${field}: ${value}`);
            return;
        }

        if (value && typeof value === "object") {
            Object.entries(value).forEach(([nestedField, nestedValue]) => {
                if (Array.isArray(nestedValue)) {
                    messages.push(`${field}.${nestedField}: ${nestedValue.join(", ")}`);
                } else if (typeof nestedValue === "string") {
                    messages.push(`${field}.${nestedField}: ${nestedValue}`);
                }
            });
        }
    });

    return messages.join(" | ");
}

export default UserAlumniForm;