import React, { useState } from "react";
import styles from "./NovaPlaylista.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Footer from "../../komponente/Footer/Footer";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NovaPlaylista: React.FC = () => {
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [javno, setJavno] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("korisnikID", korisnikID);
    formData.append("naziv", naziv);
    formData.append("opis", opis);
    if (fileSlika) formData.append("file_slika", fileSlika);
    if (fileGif) formData.append("file_gif", fileGif);
    formData.append("javno", String(javno));

    try {
      await axios.post(`${API_BASE}/playliste/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Playlista je uspješno kreirana!");
      setTimeout(() => navigate("/playlists"), 1200);
    } catch {
      setError("Greška pri kreiranju playliste.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Header/>
    <Sidebar/>
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
        <label className={styles.fileLabel} style={{marginTop: 10, marginBottom: 10}}>
          <input
            type="checkbox"
            checked={javno}
            onChange={e => setJavno(e.target.checked)}
            style={{marginRight: 8}}
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
    <Footer/>
    </>
  );
};

export default NovaPlaylista;
