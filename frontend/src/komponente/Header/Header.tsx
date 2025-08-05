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
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className={styles.logoutIcon}
                viewBox="0 0 24 24"
              >
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
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
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className={styles.logoutIcon}
                viewBox="0 0 24 24"
              >
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              {t("logout")}
            </button>
          )}
        </>
      )}
    </header>
  );
};

export default Header;


