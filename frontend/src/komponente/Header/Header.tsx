import React, { useEffect, useState } from "react";
import styles from "./Header.module.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Korisnik } from "../../types";
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("korisnik");
  const user = JSON.parse(localStorage.getItem("korisnik") || "");
  const [korisnik, setKorisnik] = useState<Korisnik>();
  let korisnikID = "";


  if (isLoggedIn) {
    try {
      korisnikID = user?.id || "";

    } catch {
      korisnikID = "";
    }
  }


    useEffect(() => {
      if (!korisnikID) return;
          axios.get(`${API_BASE}/korisnici/${korisnikID}`)
        .then((res) => {
          setKorisnik(res.data);
        })
        .catch(() => {
          setKorisnik(undefined);
        });
         
        }, [korisnikID]);
  

 
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

      <span className={styles.welcomeMessage}>
        Dobrodošli {korisnik?.korisnicko_ime} !
      </span>


                      <Link to="/profile/edit">

          <img src={korisnik?.putanjaProfilneSlike} className={styles.profileImg} />
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
