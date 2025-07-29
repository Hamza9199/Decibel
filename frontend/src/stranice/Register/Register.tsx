import React, { useState, useEffect } from "react";
import styles from "./Register.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Register: React.FC = () => {
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [korisnicko_ime, setKorisnickoIme] = useState("");
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/korisnici/register`, {
        ime,
        prezime,
        korisnicko_ime,
        email,
        lozinka,
        
      });
      setSuccess("Registracija uspješna! Možete se prijaviti.");
      setLoading(false);
      localStorage.setItem("korisnik", JSON.stringify(res.data));

      setTimeout(() => window.location.href = "/", 1200);
    } catch {
      setError("Greška pri registraciji. Provjerite podatke.");
      setLoading(false);
    }
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("activeSongBg", { detail: {} }));
    resetBodyBackground();
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: {} }));
    window.dispatchEvent(new CustomEvent("hideSubscriptionMsg"));
    const audio = document.querySelector('audio');
    if (audio) {
      audio.muted = true;
      audio.pause();
      audio.currentTime = 0;
    }
    return () => {
      resetBodyBackground();
    };
  }, []);
    
     const resetBodyBackground = () => {
      const body = document.body;
      if (body) {
        body.style.background = 'radial-gradient(ellipse at 10% 60%, #b91d95 0%, #222222 60%)';
      }
    };

  return (
    <div className={styles.registerBg}>
      {loading ? (
        <Loading />
      ) : (
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>{t("register")}</h2>
          <input
            type="text"
            placeholder={t("name")}
            className={styles.input}
            value={ime}
            onChange={(e) => setIme(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder={t("surname")}
            className={styles.input}
            value={prezime}
            onChange={(e) => setPrezime(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder={t("username")}
            className={styles.input}
            value={korisnicko_ime}
            onChange={(e) => setKorisnickoIme(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder={t("email")}
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t("password")}
            className={styles.input}
            value={lozinka}
            onChange={(e) => setLozinka(e.target.value)}
            required
          />
         
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">
            {t("register")}
          </button>
          <div className={styles.linkWrap}>
            {t("already_have_account") + " "}
            <span className={styles.link} onClick={() => navigate("/")}>
              {t("login_here")}
            </span>
          </div>
        </form>
      )}
    </div>
  );
};

export default Register;
