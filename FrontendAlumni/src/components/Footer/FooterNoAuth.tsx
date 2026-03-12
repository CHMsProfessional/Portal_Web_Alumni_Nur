import { Link } from "react-router-dom";
import {
    FaArrowRightToBracket,
    FaEnvelope,
    FaGraduationCap,
    FaLocationDot,
    FaPhone,
} from "react-icons/fa6";
import { Routes } from "../../routes/CONSTANTS";
import "./footer_css.css";

const FooterNoAuth = () => {
    return (
        <footer className="nur-footer nur-footer--public">
            <div className="nur-footer__glow nur-footer__glow--left"></div>
            <div className="nur-footer__glow nur-footer__glow--right"></div>

            <div className="container nur-footer__container">
                <div className="row g-4 align-items-start">
                    <div className="col-lg-5">
                        <div className="nur-footer__brand">
                            <div className="nur-footer__brandBadge">
                                <FaGraduationCap />
                            </div>

                            <div>
                                <h5 className="nur-footer__title">Universidad NUR</h5>
                                <p className="nur-footer__subtitle mb-2">
                                    Portal Alumni diseñado para mantener el vínculo entre la universidad y sus egresados, con acceso a servicios, comunidad y formación.
                                </p>
                                <span className="nur-footer__pill">Conectando generaciones</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <h6 className="nur-footer__sectionTitle">Acceso rápido</h6>

                        <ul className="nur-footer__links">
                            <li>
                                <Link to={Routes.AUTH.LOGIN} className="nur-footer__link">
                                    <FaArrowRightToBracket />
                                    <span>Iniciar sesión</span>
                                </Link>
                            </li>
                        </ul>

                        <p className="nur-footer__helperText mt-3 mb-0">
                            El acceso al portal es gestionado por administración de la universidad.
                        </p>
                    </div>

                    <div className="col-md-6 col-lg-4">
                        <h6 className="nur-footer__sectionTitle">Contacto</h6>

                        <ul className="nur-footer__contactList">
                            <li>
                                <FaLocationDot className="nur-footer__contactIcon" />
                                <span>Santa Cruz de la Sierra, Bolivia</span>
                            </li>
                            <li>
                                <FaEnvelope className="nur-footer__contactIcon" />
                                <span>info@nur.edu</span>
                            </li>
                            <li>
                                <FaPhone className="nur-footer__contactIcon" />
                                <span>+591 3 342-7575</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="nur-footer__bottom">
                    <p className="nur-footer__copy mb-0">
                        © {new Date().getFullYear()} Universidad NUR — Todos los derechos reservados.
                    </p>
                    <span className="nur-footer__bottomBadge">Portal Alumni</span>
                </div>
            </div>
        </footer>
    );
};

export default FooterNoAuth;