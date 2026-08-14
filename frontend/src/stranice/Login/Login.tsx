import React, { useState, useEffect, useCallback, memo } from "react";
// import styles from "./Login.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [styles, setStyles] = useState<Styles>({});

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./LoginWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Login.module.css");
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

  const loginMut = useMutation({
    mutationFn: async (vars: { email: string; lozinka: string }) => {
      const res = await axios.post(`${API_BASE}/korisnici/login`, vars);
      return res.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("korisnik", JSON.stringify(data));
      window.location.href = "/";
    },
    onError: () => {
      setError("Pogrešan email ili lozinka.");
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      loginMut.mutate({ email, lozinka });
    },
    [email, lozinka, loginMut]
  );

  const resetBodyBackground = useCallback(() => {
    const body = document.body;
    if (body) {
      body.style.background = "radial-gradient(ellipse at 10% 60%, #b91d95 0%, #222222 60%)";
    }
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("activeSongBg", { detail: {} }));
    resetBodyBackground();
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: {} }));
    window.dispatchEvent(new CustomEvent("hideSubscriptionMsg"));
    const audio = document.querySelector("audio");
    if (audio) {
      (audio as HTMLAudioElement).muted = true;
      (audio as HTMLAudioElement).pause();
      (audio as HTMLAudioElement).currentTime = 0;
    }
    return () => {
      resetBodyBackground();
    };
  }, [resetBodyBackground]);

  return (
    <div className={styles.loginBg}>
      {loginMut.isPending ? (
        <Loading />
      ) : (
        
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <button className={styles.navBtn} onClick={() => { navigate("/");  }}>
            <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
              <svg width="22" height="22" fill="#b91d95" viewBox="0 0 24 24">
                <path d="M3 12L12 4l9 8v7a2 2 0 0 1-2 2h-3v-5h-6v5H5a2 2 0 0 1-2-2z" />
              </svg>
            </span>
            {t("home") || "Početna"}
          </button>

          <h2 className={styles.title}>{t("login")}</h2>
          <input
            type="email"
            placeholder={t("email")}
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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

export default memo(Login);
