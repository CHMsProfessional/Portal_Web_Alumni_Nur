import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import "animate.css";
import {
    FaArrowRightToBracket,
    FaEye,
    FaEyeSlash,
    FaGraduationCap,
    FaLock,
    FaShieldHalved,
    FaUser,
    FaUserTie,
} from "react-icons/fa6";

import "./LoginForm.css";
import { Routes } from "../../routes/CONSTANTS";
import { AuthService } from "../../services/alumni/AuthService";
import { notifyLoginError } from "../../services/ui/AlertService";

const getLoginErrorMessage = (error: unknown): string => {
    const err = error as {
        response?: {
            data?: {
                detail?: string;
                message?: string;
                error?: string;
                non_field_errors?: string[];
                username?: string[];
                password?: string[];
            };
        };
        message?: string;
    };

    if (!err?.response) {
        return "No se pudo conectar con el servidor. Intentalo nuevamente.";
    }

    return "No se pudo iniciar sesion. Verifica tus credenciales e intentalo nuevamente.";
};

const LoginForm = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAuthenticated = AuthService.isAuthenticated();

    const canSubmit = useMemo(() => {
        return (
            username.trim().length > 0 &&
            password.trim().length > 0 &&
            !isSubmitting
        );
    }, [username, password, isSubmitting]);

    useEffect(() => {
        if (error && (username.trim() || password.trim())) {
            setError("");
        }
    }, [username, password, error]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!canSubmit) {
            return;
        }

        setError("");
        setIsSubmitting(true);

        try {
            await AuthService.login({
                username: username.trim(),
                password: password.trim(),
            });

            navigate(Routes.HOME, { replace: true });
        } catch (err: unknown) {
            console.error("Error al iniciar sesión:", err);
            const message = getLoginErrorMessage(err);
            setError(message);
            notifyLoginError();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isAuthenticated) {
        return <Navigate to={Routes.HOME} replace />;
    }

    return (
        <div className="nur-login-page">
            <div className="nur-login-page__bg" />
            <div className="nur-login-page__overlay" />

            <div className="container nur-login-page__container">
                <div className="row justify-content-center align-items-center g-4">
                    <div className="col-xl-10">
                        <div className="nur-login-shell animate__animated animate__fadeIn">
                            <div className="row g-0">
                                <div className="col-lg-6">
                                    <section className="nur-login-hero">
                                        <div className="nur-login-hero__badge">
                                            <FaGraduationCap />
                                            <span>Universidad NUR</span>
                                        </div>

                                        <h1 className="nur-login-hero__title">
                                            Portal Alumni
                                        </h1>

                                        <p className="nur-login-hero__text">
                                            Accede al ecosistema institucional para egresados:
                                            comunidad, cursos, eventos, noticias, documentos y
                                            servicios alumni dentro de una experiencia unificada.
                                        </p>

                                        <div className="nur-login-hero__features">
                                            <div className="nur-login-hero__feature">
                                                <span className="nur-login-hero__featureIcon">
                                                    <FaShieldHalved />
                                                </span>
                                                <div>
                                                    <strong>Acceso seguro</strong>
                                                    <p>
                                                        Sesión centralizada con JWT y control de
                                                        autenticación alineado a las APIs del proyecto.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="nur-login-hero__feature">
                                                <span className="nur-login-hero__featureIcon">
                                                    <FaUserTie />
                                                </span>
                                                <div>
                                                    <strong>Acceso administrado</strong>
                                                    <p>
                                                        Las cuentas no se registran públicamente; son
                                                        gestionadas por administración.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="nur-login-hero__feature">
                                                <span className="nur-login-hero__featureIcon">
                                                    <FaArrowRightToBracket />
                                                </span>
                                                <div>
                                                    <strong>Experiencia institucional</strong>
                                                    <p>
                                                        Frontend alineado con Access API y Content API
                                                        para una navegación consistente.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="col-lg-6">
                                    <section className="nur-login-cardWrap">
                                        <div className="nur-login-card animate__animated animate__fadeInUp">
                                            <div className="nur-login-card__header">
                                                <span className="nur-login-card__eyebrow">
                                                    Ingreso institucional
                                                </span>
                                                <h2 className="nur-login-card__title">
                                                    Bienvenido de vuelta
                                                </h2>
                                                <p className="nur-login-card__subtitle">
                                                    Inicia sesión para acceder a tu portal Alumni NUR.
                                                </p>
                                            </div>

                                            <form onSubmit={handleSubmit} className="nur-login-form">
                                                <div className="nur-login-form__group">
                                                    <label htmlFor="username" className="nur-label">
                                                        Usuario
                                                    </label>

                                                    <div className="nur-login-inputWrap">
                                                        <span className="nur-login-inputWrap__icon">
                                                            <FaUser />
                                                        </span>
                                                        <input
                                                            id="username"
                                                            type="text"
                                                            name="username"
                                                            className="form-control nur-login-input"
                                                            value={username}
                                                            onChange={(e) => setUsername(e.target.value)}
                                                            placeholder="Ingresa tu nombre de usuario"
                                                            required
                                                            disabled={isSubmitting}
                                                            autoComplete="username"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="nur-login-form__group">
                                                    <label htmlFor="password" className="nur-label">
                                                        Contraseña
                                                    </label>

                                                    <div className="nur-login-inputWrap">
                                                        <span className="nur-login-inputWrap__icon">
                                                            <FaLock />
                                                        </span>

                                                        <input
                                                            id="password"
                                                            type={showPassword ? "text" : "password"}
                                                            name="password"
                                                            className="form-control nur-login-input nur-login-input--password"
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            placeholder="Ingresa tu contraseña"
                                                            required
                                                            disabled={isSubmitting}
                                                            autoComplete="current-password"
                                                        />

                                                        <button
                                                            type="button"
                                                            className="nur-login-inputWrap__toggle"
                                                            onClick={() => setShowPassword((prev) => !prev)}
                                                            disabled={isSubmitting}
                                                            aria-label={
                                                                showPassword
                                                                    ? "Ocultar contraseña"
                                                                    : "Mostrar contraseña"
                                                            }
                                                        >
                                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {error ? (
                                                    <div className="nur-alert nur-alert--danger" role="alert">
                                                        <div>
                                                            <strong>Acceso no completado.</strong>
                                                            <p className="mb-0 mt-1">{error}</p>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <button
                                                    type="submit"
                                                    className="nur-btn nur-btn--primary nur-login-submit"
                                                    disabled={!canSubmit}
                                                >
                                                    <FaArrowRightToBracket />
                                                    <span>
                                                        {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
                                                    </span>
                                                </button>

                                                <div className="nur-login-card__footer">
                                                    <p className="mb-0">¿Necesitas acceso al portal?</p>
                                                    <span className="nur-login-access-note">
                                                        Contacta con la administración de la universidad
                                                        para la creación o habilitación de tu cuenta Alumni.
                                                    </span>
                                                </div>
                                            </form>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;