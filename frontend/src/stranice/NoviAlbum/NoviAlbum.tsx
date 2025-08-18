import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Footer from "../../komponente/Footer/Footer";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { Pjesma } from "../../types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

type Styles = Record<string, string>;

const NoviAlbum: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [odabranePjesme, setOdabranePjesme] = useState<number[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  const svePjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["mojePjesmeBezAlbuma", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/pjesme/`);
      const all: Pjesma[] = r.data || [];
      return all.filter((p) => String(p.korisnikID) === String(korisnikID) && !p.albumID);
    },
    initialData: [],
  });

  const svePjesme = useMemo(() => svePjesmeQ.data || [], [svePjesmeQ.data]);

  const createAlbumMut = useMutation({
    mutationFn: async (vars: {
      korisnikID: string;
      naziv: string;
      opis: string;
      fileSlika: File | null;
      fileGif: File | null;
      odabranePjesme: number[];
      svePjesme: Pjesma[];
    }) => {
      const formData = new FormData();
      formData.append("korisnikID", vars.korisnikID);
      formData.append("naziv", vars.naziv);
      formData.append("opis", vars.opis);
      if (vars.fileSlika) formData.append("file_slika", vars.fileSlika);
      if (vars.fileGif) formData.append("file_gif", vars.fileGif);
      const albumRes = await axios.post(`${API_BASE}/albumi/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const albumId = albumRes.data.id as number;
      if (albumId && vars.odabranePjesme.length > 0) {
        await Promise.all(
          vars.odabranePjesme.map((pjesmaId) =>
            axios.put(`${API_BASE}/pjesme/${pjesmaId}`, { ...vars.svePjesme.find((p) => p.id === pjesmaId), albumID: albumId })
          )
        );
      }
      return albumId;
    },
    onSuccess: () => {
      setSuccess("Album je uspješno kreiran!");
      setTimeout(() => navigate("/albums"), 1200);
    },
    onError: () => {
      setError("Greška pri kreiranju albuma.");
    },
  });

  const handleTogglePjesma = useCallback((pjesmaId: number) => {
    setOdabranePjesme((prev) => (prev.includes(pjesmaId) ? prev.filter((id) => id !== pjesmaId) : [...prev, pjesmaId]));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      if (!korisnikID) return;
      createAlbumMut.mutate({ korisnikID, naziv, opis, fileSlika, fileGif, odabranePjesme, svePjesme });
    },
    [korisnikID, naziv, opis, fileSlika, fileGif, odabranePjesme, svePjesme, createAlbumMut]
  );

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./NoviAlbumWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./NoviAlbum.module.css");
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

  const loading = createAlbumMut.isPending;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.noviAlbumBg}>
        <div className={styles.formContainer}>
          <form className={styles.noviAlbumForm} onSubmit={handleSubmit} style={{ minWidth: 340 }}>
            <h2 className={styles.title}>{t("new_album")}</h2>
            <input type="text" placeholder={t("album_name") || "Naziv albuma"} className={styles.input} value={naziv} onChange={(e) => setNaziv(e.target.value)} required />
            <textarea placeholder={t("description") + " (" + t("optional") + ")"} className={styles.textarea} value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />
            <div className={styles.fileInputs}>
              <label className={styles.fileLabel}>
                {t("image") + ":"}
                <input type="file" accept="image/*" onChange={(e) => setFileSlika(e.target.files?.[0] || null)} />
              </label>
              <label className={styles.fileLabel}>
                Gif:
                <input type="file" accept="image/gif" onChange={(e) => setFileGif(e.target.files?.[0] || null)} />
              </label>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? <Loading /> : t("create_album")}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => navigate("/albums")}>
              {t("cancel")}
            </button>
          </form>

          <div className={styles.songsSection}>
            <h4 className={styles.songsTitle}>{t("add_existing_songs") || "Dodaj postojeće pjesme"}</h4>
            {svePjesme.length === 0 ? (
              <div className={styles.noSongsText}>{t("no_available_songs") || "Nema dostupnih pjesama."}</div>
            ) : (
              <ul className={styles.songsList}>
                {svePjesme.map((p) => (
                  <li key={p.id} className={styles.songItem}>
                    <input type="checkbox" checked={odabranePjesme.includes(p.id)} onChange={() => handleTogglePjesma(p.id)} className={styles.songCheckbox} />
                    <span className={styles.songName}>{p.naziv}</span>
                    <span className={styles.songDuration}>{p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(NoviAlbum);
