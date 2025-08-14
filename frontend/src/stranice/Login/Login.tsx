import React, { useState, useEffect, useCallback, memo } from "react";
import styles from "./Login.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

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

export default memo(Login);
