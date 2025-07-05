import React from "react";
import styles from "./Header.module.css";
import { Link, useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("korisnik");
  const user = JSON.parse(localStorage.getItem("korisnik") || "");


  let korisnickoIme = "";
  if (isLoggedIn) {
    try {
      korisnickoIme = user.korisnicko_ime || "";
    } catch {
      korisnickoIme = "";
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("korisnik");
    navigate("/login");
  };

  return (
    <header className={styles.header}>
      <Link to="/">

      <img
        src="/logo.gif"
        alt="Decibel logo"
        className={styles.logoImg}
        style={{ height: "45px", marginRight: "14px", marginLeft: "18px" }}
      />
      </Link>
                <Link to="/">

      <div className={styles.logo}>Decibel</div>
      </Link>
                <Link className={styles.welcomeMessage} to="/profile/edit">

      <span >
        Dobrodošli {korisnickoIme} !
      </span>
            </Link>


                      <Link to="/profile/edit">

          <img src={user.putanjaProfilneSlike} className={styles.profileImg} />
      </Link>


      {isLoggedIn && (
      
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          style={{
            marginLeft: "auto",
            marginRight: "24px",
            marginTop: "-5px",
            background: "#b91d95",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 18px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Logout
        </button>
      )}
    </header>
  );
};

export default Header;
