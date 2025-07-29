import React, { useState, useEffect } from "react";
import styles from "./NoviAlbum.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Footer from "../../komponente/Footer/Footer";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { Pjesma } from "../../types";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NoviAlbum: React.FC = () => {
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [svePjesme, setSvePjesme] = useState<Pjesma[]>([]);
  const [odabranePjesme, setOdabranePjesme] = useState<number[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  useEffect(() => {
    if (!korisnikID) return;
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        setSvePjesme((res.data || []).filter((p: Pjesma) => p.korisnikID === korisnikID && !p.albumID));
      })
      .catch(() => setSvePjesme([]));
  }, [korisnikID]);

  const handleTogglePjesma = (pjesmaId: number) => {
    setOdabranePjesme((prev) =>
      prev.includes(pjesmaId)
        ? prev.filter((id) => id !== pjesmaId)
        : [...prev, pjesmaId]
    );
  };

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

    try {
      const albumRes = await axios.post(`${API_BASE}/albumi/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const albumId = albumRes.data.id;
      if (albumId && odabranePjesme.length > 0) {
        await Promise.all(
          odabranePjesme.map((pjesmaId) =>
            axios.put(`${API_BASE}/pjesme/${pjesmaId}`, {
              ...svePjesme.find((p) => p.id === pjesmaId),
              albumID: albumId,
            })
          )
        );
      }
      setSuccess("Album je uspješno kreiran!");
      setTimeout(() => navigate("/albums"), 1200);
    } catch {
      setError("Greška pri kreiranju albuma.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header/>
      <Sidebar/>
      <div className={styles.noviAlbumBg} style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <form className={styles.noviAlbumForm} onSubmit={handleSubmit} style={{ minWidth: 340 }}>
          <h2 className={styles.title}>{t("new_album")}</h2>
          <input
            type="text"
            placeholder={t("album_name") || "Naziv albuma"}
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
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? <Loading /> : t("create_album")}
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate("/albums")}
          >
            {t("cancel")}
          </button>
        </form>
        <div style={{
          marginLeft: 32,
          background: "#232323",
          borderRadius: 14,
          padding: "24px 18px",
          minWidth: 260,
          maxHeight: 480,
          overflowY: "auto",
          boxShadow: "0 4px 24px #b91d9533"
        }}>
          <h4 style={{ color: "#fff", marginBottom: 14, fontWeight: 600 }}>{t("add_existing_songs") || "Dodaj postojeće pjesme"}</h4>
          {svePjesme.length === 0 ? (
            <div style={{ color: "#b3b3b3" }}>{t("no_available_songs") || "Nema dostupnih pjesama."}</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {svePjesme.map((p) => (
                <li key={p.id} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={odabranePjesme.includes(p.id)}
                    onChange={() => handleTogglePjesma(p.id)}
                    style={{ marginRight: 10 }}
                  />
                  <span style={{ color: "#ffe6ec", fontWeight: 500 }}>{p.naziv}</span>
                  <span style={{ color: "#b3b3b3", marginLeft: 8, fontSize: "0.98rem" }}>
                    {p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Footer/>
    </>
  );
};

export default NoviAlbum;
