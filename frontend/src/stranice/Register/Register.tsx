import React, { useState, useEffect, useCallback, memo } from "react";
// import styles from "./Register.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Register: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./RegisterWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Register.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      }
    };
    loadThemeStyles();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") loadThemeStyles(e.newValue || undefined);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [korisnicko_ime, setKorisnickoIme] = useState("");
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const registerMut = useMutation({
    mutationFn: async (vars: { ime: string; prezime: string; korisnicko_ime: string; email: string; lozinka: string }) => {
      const res = await axios.post(`${API_BASE}/korisnici/register`, vars);
      return res.data;
    },
    onSuccess: (data) => {
      setSuccess("Registracija uspješna! Možete se prijaviti.");
      localStorage.setItem("korisnik", JSON.stringify(data));
      setTimeout(() => (window.location.href = "/"), 1200);
    },
    onError: () => {
      setError("Greška pri registraciji. Provjerite podatke.");
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      registerMut.mutate({ ime, prezime, korisnicko_ime, email, lozinka });
    },
    [ime, prezime, korisnicko_ime, email, lozinka, registerMut]
  );

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("activeSongBg", { detail: {} }));
    resetBodyBackground();
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: {} }));
    window.dispatchEvent(new CustomEvent("hideSubscriptionMsg"));
    const audio = document.querySelector("audio");
    if (audio) {
      audio.muted = true;
      audio.pause();
      (audio as HTMLAudioElement).currentTime = 0;
    }
    return () => {
      resetBodyBackground();
    };
  }, []);

  const resetBodyBackground = () => {
    const body = document.body;
    if (body) {
      body.style.background = "radial-gradient(ellipse at 10% 60%, #b91d95 0%, #222222 60%)";
    }
  };

  const loading = registerMut.isPending;

  return (
    <div className={styles.registerBg}>
      {loading ? (
        <Loading />
      ) : (
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>{t("register")}</h2>
          <input type="text" placeholder={t("name")} className={styles.input} value={ime} onChange={(e) => setIme(e.target.value)} required />
          <input type="text" placeholder={t("surname")} className={styles.input} value={prezime} onChange={(e) => setPrezime(e.target.value)} required />
          <input type="text" placeholder={t("username")} className={styles.input} value={korisnicko_ime} onChange={(e) => setKorisnickoIme(e.target.value)} required />
          <input type="email" placeholder={t("email")} className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder={t("password")} className={styles.input} value={lozinka} onChange={(e) => setLozinka(e.target.value)} required />
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">{t("register")}</button>
          <div className={styles.linkWrap}>
            {t("already_have_account") + " "}
            <span className={styles.link} onClick={() => navigate("/")}>{t("login_here")}</span>
          </div>
        </form>
      )}
    </div>
  );
};

export default memo(Register);
