import React, { useState, useEffect } from "react";
import styles from "./Login.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/korisnici/login`, {
        email,
        lozinka,
      });
      localStorage.setItem("korisnik", JSON.stringify(res.data));
      setLoading(false);
      window.location.href = "/";
    } catch {
      setError("Pogrešan email ili lozinka.");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Resetuj background i sakrij player/muziku na login stranici
    window.dispatchEvent(new CustomEvent("activeSongBg", { detail: {} }));
    resetBodyBackground();
    // Sakrij player i mutiraj muziku
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: {} }));
    // Sakrij poruku o pretplati (AudioPlayer)
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
    <div className={styles.loginBg}>
      {loading ? (
        <Loading />
      ) : (
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>{t("login")}</h2>
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
          <button className={styles.button} type="submit">
            {t("login")}
          </button>
          <div className={styles.linkWrap}>
            {t("dont_have_account") + " "}
            <span className={styles.link} onClick={() => navigate("/register")}>
              {t("register_here")}
            </span>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;
