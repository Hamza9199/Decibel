import React, { useState, useEffect, useCallback, memo } from "react";
// import styles from "./Register.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { getApiBase } from "../../utils/apiBase";

type Styles = Record<string, string>;

const API_BASE = getApiBase();

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
  const [showPassword, setShowPassword] = useState(false);
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
           <button className={styles.navBtn} onClick={() => { navigate("/");  }}>
            <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
              <svg width="22" height="22" fill="#b91d95" viewBox="0 0 24 24">
                <path d="M3 12L12 4l9 8v7a2 2 0 0 1-2 2h-3v-5h-6v5H5a2 2 0 0 1-2-2z" />
              </svg>
            </span>
            {t("home") || "Početna"}
          </button>
          <h2 className={styles.title}>{t("register")}</h2>
          <input type="text" placeholder={t("name")} className={styles.input} value={ime} onChange={(e) => setIme(e.target.value)} required />
          <input type="text" placeholder={t("surname")} className={styles.input} value={prezime} onChange={(e) => setPrezime(e.target.value)} required />
          <input type="text" placeholder={t("username")} className={styles.input} value={korisnicko_ime} onChange={(e) => setKorisnickoIme(e.target.value)} required />
          <input type="email" placeholder={t("email")} className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("password")}
              className={styles.input}
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              required
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                right: 8,
                top: "40%",
                transform: "translateY(-50%)",
                height: 24,
                width: 24,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#b91d95",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0
              }}
              tabIndex={-1}
              aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
            >
              {showPassword ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M1 11C3.5 5.5 18.5 5.5 21 11C18.5 16.5 3.5 16.5 1 11Z" stroke="#b91d95" strokeWidth="2"/><circle cx="11" cy="11" r="3" stroke="#b91d95" strokeWidth="2"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M1 11C3.5 5.5 18.5 5.5 21 11C18.5 16.5 3.5 16.5 1 11Z" stroke="#b91d95" strokeWidth="2"/><circle cx="11" cy="11" r="3" stroke="#b91d95" strokeWidth="2"/><line x1="4" y1="18" x2="18" y2="4" stroke="#b91d95" strokeWidth="2"/></svg>
              )}
            </button>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">{t("register")}</button>
          <div className={styles.linkWrap}>
            {t("already_have_account") + " "}
            <span className={styles.link} onClick={() => navigate("/login")}>{t("login_here")}</span>
          </div>
        </form>
      )}
    </div>
  );
};

export default memo(Register);
