import { Link } from "react-router-dom";
import { FaArrowRightToBracket, FaGraduationCap } from "react-icons/fa6";
import { Routes } from "../../routes/CONSTANTS";
import "./menu_css.css";

const MenuNoAuth = () => {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark nur-navbar shadow-sm">
            <div className="container nur-navbar__container">
                <Link to={Routes.HOME} className="navbar-brand nur-navbar__brand">
                    <span className="nur-navbar__brandMark">
                        <FaGraduationCap />
                    </span>
                    <span className="nur-navbar__brandText">
                        <span className="nur-navbar__brandTitle">Alumni NUR</span>
                        <span className="nur-navbar__brandSubtitle">Portal institucional</span>
                    </span>
                </Link>

                <button
                    className="navbar-toggler nur-navbar__toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNoAuth"
                    aria-controls="navbarNoAuth"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse nur-navbar__collapse" id="navbarNoAuth">
                    <ul className="navbar-nav ms-auto align-items-lg-center nur-navbar__nav">
                        <li className="nav-item">
                            <Link to={Routes.AUTH.LOGIN} className="nav-link nur-navbar__link">
                                <FaArrowRightToBracket />
                                <span>Iniciar Sesión</span>
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default MenuNoAuth;