import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
// import styles from "./NovaPlaylista.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Footer from "../../komponente/Footer/Footer";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NovaPlaylista: React.FC = () => {
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [javno, setJavno] = useState(false);
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [postDataDelayDone, setPostDataDelayDone] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./NovaPlaylistaWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./NovaPlaylista.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      }
    };
    const boot = async () => {
      await loadThemeStyles();
      setCssReady(true);
    };
    boot();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") loadThemeStyles(e.newValue || undefined);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (cssReady) {
      setPostDataDelayDone(false);
      const t = setTimeout(() => setPostDataDelayDone(true), 500);
      return () => clearTimeout(t);
    }
    setPostDataDelayDone(false);
  }, [cssReady]);

  const showLoading = useMemo(() => !cssReady || !postDataDelayDone, [cssReady, postDataDelayDone]);


  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  const createPlaylistMut = useMutation({
    mutationFn: async (formData: FormData) => {
      await axios.post(`${API_BASE}/playliste/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      setSuccess("Playlista je uspješno kreirana!");
      setTimeout(() => navigate("/playlists"), 1200);
    },
    onError: () => {
      setError("Greška pri kreiranju playliste.");
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      const formData = new FormData();
      formData.append("korisnikID", korisnikID);
      formData.append("naziv", naziv);
      formData.append("opis", opis);
      if (fileSlika) formData.append("file_slika", fileSlika);
      if (fileGif) formData.append("file_gif", fileGif);
      formData.append("javno", String(javno));
      createPlaylistMut.mutate(formData);
    },
    [korisnikID, naziv, opis, fileSlika, fileGif, javno, createPlaylistMut]
  );

  const loading = createPlaylistMut.isPending;


    if (showLoading) return <Loading />;


  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.novaPlaylistaBg}>
        <form className={styles.novaPlaylistaForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>{t("new_playlist")}</h2>
          <input
            type="text"
            placeholder={t("playlist_name")}
            className={styles.input}
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            required
          />
          <textarea
            placeholder={t("description") + " (" + t("optional") + ")"}
            className={styles.textarea}
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            rows={3}
          />
          <div className={styles.fileInputs}>
            <label className={styles.fileLabel}>
              {t("image") + ":"}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFileSlika(e.target.files?.[0] || null)}
              />
            </label>
            <label className={styles.fileLabel}>
              Gif:
              <input
                type="file"
                accept="image/gif"
                onChange={(e) => setFileGif(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <label className={styles.fileLabel} style={{ marginTop: 10, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={javno}
              onChange={(e) => setJavno(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            {t("public_playlist")}
          </label>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? <Loading /> : t("create_playlist")}
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate("/playlists")}
          >
            {t("cancel")}
          </button>
        </form>
      </div>
      <Footer />
    </>
  );
};

export default memo(NovaPlaylista);
