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
  const [previewSlika, setPreviewSlika] = useState<string>("");
  const [previewGif, setPreviewGif] = useState<string>("");
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
      const t = setTimeout(() => setPostDataDelayDone(true), 200);
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

  const handleFileChange = (file: File | null, isGif: boolean) => {
    if (!file) {
      if (isGif) {
        setFileGif(null);
        setPreviewGif("");
      } else {
        setFileSlika(null);
        setPreviewSlika("");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (isGif) {
        setFileGif(file);
        setPreviewGif(preview);
      } else {
        setFileSlika(file);
        setPreviewSlika(preview);
      }
    };
    reader.readAsDataURL(file);
  };

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
        <div className={styles.formContainer}>
          <form className={styles.novaPlaylistaForm} onSubmit={handleSubmit}>
            <h2 className={styles.title}>{t("new_playlist")}</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("playlist_name")}</label>
              <input
                type="text"
                placeholder={t("playlist_name")}
                className={styles.input}
                value={naziv}
                onChange={(e) => setNaziv(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{t("description")} ({t("optional")})</label>
              <textarea
                placeholder={t("description")}
                className={styles.textarea}
                value={opis}
                onChange={(e) => setOpis(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.filesGrid}>
              <div className={styles.fileUploadBox}>
                <label className={styles.fileInputLabel}>
                  <div className={styles.uploadArea}>
                    {previewSlika ? (
                      <img src={previewSlika} alt="Preview" className={styles.previewImage} />
                    ) : (
                      <>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>{t("image")}</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, false)}
                    style={{ display: "none" }}
                  />
                </label>
                {previewSlika && (
                  <button
                    type="button"
                    className={styles.removePreviewBtn}
                    onClick={() => handleFileChange(null, false)}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className={styles.fileUploadBox}>
                <label className={styles.fileInputLabel}>
                  <div className={styles.uploadArea}>
                    {previewGif ? (
                      <img src={previewGif} alt="Preview" className={styles.previewImage} />
                    ) : (
                      <>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>GIF</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/gif"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, true)}
                    style={{ display: "none" }}
                  />
                </label>
                {previewGif && (
                  <button
                    type="button"
                    className={styles.removePreviewBtn}
                    onClick={() => handleFileChange(null, true)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={javno}
                onChange={(e) => setJavno(e.target.checked)}
              />
              <span>{t("public_playlist")}</span>
            </label>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <div className={styles.buttonGroup}>
              <button className={styles.button} type="submit" disabled={loading}>
                {loading ? t("creating") || "Kreiram..." : t("create_playlist")}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => navigate("/playlists")}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(NovaPlaylista);
