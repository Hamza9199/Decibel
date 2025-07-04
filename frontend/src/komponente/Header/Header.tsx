import React from "react";
import styles from "./Header.module.css";
import { useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("korisnik");


  let korisnickoIme = "";
  if (isLoggedIn) {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
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
      <img
        src="/logo.gif"
        alt="Decibel logo"
        className={styles.logoImg}
        style={{ height: "45px", marginRight: "14px", marginLeft: "18px" }}
      />

      <div className={styles.logo}>Decibel</div>

      <span className={styles.welcomeMessage}>
        Dobrodošli {korisnickoIme} !
      </span>


      {isLoggedIn && (
      
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          style={{
            marginLeft: "auto",
            marginRight: "24px",
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
