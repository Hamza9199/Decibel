import React, { useEffect, useState } from "react";
import styles from "./Header.module.css";
import { Link } from "react-router-dom";
import axios from "axios";
import { Korisnik } from "../../types";
import { useTranslation } from "react-i18next";
import Search from "../Search/Search";
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Header: React.FC = () => {
  const isLoggedIn = !!localStorage.getItem("korisnik");
  const user = JSON.parse(localStorage.getItem("korisnik") || "");
  const [korisnik, setKorisnik] = useState<Korisnik>();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  let korisnikID = "";
  const { t } = useTranslation();

  if (isLoggedIn) {
    try {
      korisnikID = user?.id || "";
    } catch {
      korisnikID = "";
    }
  }

  useEffect(() => {
    if (!korisnikID) return;
    axios
      .get(`${API_BASE}/korisnici/${korisnikID}`)
      .then((res) => {
        setKorisnik(res.data);
      })
      .catch(() => {
        setKorisnik(undefined);
      });
  }, [korisnikID]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("korisnik");

    window.location.href = "/login";
  };

  return (
    <header className={styles.header}>
      {!isMobile && (
        <>
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
        </>
      )}

      <div className={styles.searchWrap}>
        <Search />
      </div>

      {isMobile ? (
        <>
          <Link to="/profile/edit">
            <img
              src={korisnik?.putanjaProfilneSlike}
              className={styles.profileImg}
              alt="Profil"
            />
          </Link>
          {isLoggedIn && (
            <button
              className={styles.logoutBtn}
              onClick={handleLogout}
              style={{
                background: "#b91d95",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 18px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "1rem",
                marginTop: 0,
                marginLeft: 0,
                marginRight: "8px",
              }}
            >
              {t("logout")}
            </button>
          )}
        </>
      ) : (
        <>
          <span className={styles.welcomeMessage}>
            {t("welcome")} {korisnik?.korisnicko_ime} !
          </span>
          <Link to="/profile/edit">
            <img
              src={korisnik?.putanjaProfilneSlike}
              className={styles.profileImg}
              alt="Profil"
            />
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
              {t("logout")}
            </button>
          )}
        </>
      )}
    </header>
  );
};

export default Header;


