import { Link } from "react-router-dom";
import { FaEnvelope, FaLocationDot, FaPhone, FaGraduationCap, FaCalendarDays, FaPeopleGroup, FaFolderOpen } from "react-icons/fa6";
import { Routes } from "../../routes/CONSTANTS";
import "./footer_css.css";

const Footer = () => {
    return (
        <footer className="nur-footer nur-footer--auth">
            <div className="nur-footer__glow nur-footer__glow--left"></div>
            <div className="nur-footer__glow nur-footer__glow--right"></div>

            <div className="container nur-footer__container">
                <div className="row g-4">
                    <div className="col-lg-4">
                        <div className="nur-footer__brand">
                            <div className="nur-footer__brandBadge">
                                <FaGraduationCap />
                            </div>

                            <div>
                                <h5 className="nur-footer__title">Universidad NUR</h5>
                                <p className="nur-footer__subtitle mb-2">
                                    Portal Alumni institucional para fortalecer la conexión entre egresados, comunidad, formación continua y oportunidades.
                                </p>
                                <span className="nur-footer__pill">Alumni NUR</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-4">
                        <h6 className="nur-footer__sectionTitle">Navegación</h6>

                        <ul className="nur-footer__links">
                            <li>
                                <Link to={Routes.HOME} className="nur-footer__link">
                                    <FaGraduationCap />
                                    <span>Inicio</span>
                                </Link>
                            </li>
                            <li>
                                <Link to={Routes.EVENTOS} className="nur-footer__link">
                                    <FaCalendarDays />
                                    <span>Eventos</span>
                                </Link>
                            </li>
                            <li>
                                <Link to={Routes.COMUNIDAD.HOME} className="nur-footer__link">
                                    <FaPeopleGroup />
                                    <span>Comunidad</span>
                                </Link>
                            </li>
                            <li>
                                <Link to={Routes.REPOSITORIO} className="nur-footer__link">
                                    <FaFolderOpen />
                                    <span>Repositorio</span>
                                </Link>
                            </li>
                        </ul>
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
                        © {new Date().getFullYear()} Universidad NUR. Todos los derechos reservados.
                    </p>
                    <span className="nur-footer__bottomBadge">Portal Web Alumni</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;