import React, { useEffect, useState } from "react";
import styles from "./UrediAlbum.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Album, Pjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediAlbum: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pjesmeAlbuma, setPjesmeAlbuma] = useState<Pjesma[]>([]);
  const [svePjesme, setSvePjesme] = useState<Pjesma[]>([]);
  const [removing, setRemoving] = useState<number | null>(null);
  const [dodajuci, setDodajuci] = useState<number | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Dohvati ID logovanog korisnika iz localStorage
  let korisnikID: string | undefined = undefined;
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id;
  } catch {
    korisnikID = undefined;
  }

  useEffect(() => {
    if (!albumId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/albumi/${albumId}`)
      .then((res) => setAlbum(res.data))
      .catch(() => setError("Greška pri dohvatanju albuma."))
      .finally(() => setLoading(false));
  }, [albumId]);

  // Dohvati pjesme na ovom albumu
  useEffect(() => {
    if (!albumId) return;
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        const sve: Pjesma[] = res.data || [];
        setPjesmeAlbuma(sve.filter((p) => String(p.albumID) === String(albumId)));
        setSvePjesme(sve.filter((p) => !p.albumID || String(p.albumID) === "null" || p.albumID === null));
      })
      .catch(() => {
        setPjesmeAlbuma([]);
        setSvePjesme([]);
      });
  }, [albumId]);

  // Form state
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);

  useEffect(() => {
    if (album) {
      setNaziv(album.naziv || "");
      setOpis(album.opis || "");
    }
  }, [album]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!album || !korisnikID) return;
    const formData = new FormData();
    formData.append("korisnikID", korisnikID);
    formData.append("naziv", naziv);
    formData.append("opis", opis);
    formData.append("kreiranDatumVrijeme", album.kreiranDatumVrijeme || "");
    formData.append("odobreno", String(album.odobreno || false));
    formData.append("javno", String(album.javno || false));
    formData.append("brojLajkova", String(album.brojLajkova || 0));
    if (fileSlika) formData.append("file_slika", fileSlika);
    if (fileGif) formData.append("file_gif", fileGif);

    try {
      await axios.put(`${API_BASE}/albumi/${album.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Album je uspješno ažuriran.");
      setTimeout(() => navigate(`/album/${album.id}`), 1200);
    } catch {
      setError("Greška pri ažuriranju albuma.");
    }
  };

  // Funkcija za izbacivanje pjesme iz albuma
  const handleRemoveSong = async (pjesmaId: number) => {
    setRemoving(pjesmaId);
    try {
      // Dohvati pjesmu, postavi albumID na null i update
      const pjesmaRes = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
      const pjesma = pjesmaRes.data;
      await axios.put(`${API_BASE}/pjesme/${pjesmaId}`, {
        ...pjesma,
        albumID: null,
      });
      setPjesmeAlbuma((prev) => prev.filter((p) => p.id !== pjesmaId));
    } catch {
      alert("Greška pri izbacivanju pjesme iz albuma.");
    }
    setRemoving(null);
  };

  // Dodavanje pjesme na album
  const handleAddSong = async (pjesmaId: number) => {
    setDodajuci(pjesmaId);
    try {
      const pjesmaRes = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
      const pjesma = pjesmaRes.data;
      await axios.put(`${API_BASE}/pjesme/${pjesmaId}`, {
        ...pjesma,
        albumID: Number(albumId),
      });
      setPjesmeAlbuma((prev) => [...prev, pjesma]);
      setSvePjesme((prev) => prev.filter((p) => p.id !== pjesmaId));
    } catch {
      alert("Greška pri dodavanju pjesme na album.");
    }
    setDodajuci(null);
  };

  if (loading) return <Loading />;
  if (error) return <div style={{ color: "#fff", padding: 32 }}>{error}</div>;
  if (!album) return <div style={{ color: "#fff", padding: 32 }}>Album nije pronađen.</div>;
  if (album.korisnikID !== korisnikID)
    return <div style={{ color: "#fff", padding: 32 }}>Nemate pravo uređivanja ovog albuma.</div>;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.editAlbumBg}>
        <form className={styles.editAlbumForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>{t("edit_album") || "Uredi album"}</h2>
          <label className={styles.label}>{t("album_name") || "Naziv"}</label>
          <input
            className={styles.input}
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            required
          />
          <label className={styles.label}>{t("description")}</label>
          <textarea
            className={styles.input}
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            rows={3}
          />
          <label className={styles.label}>{t("new_image_optional") || "Nova slika (opcionalno)"}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFileSlika(e.target.files?.[0] || null)}
          />
          <label className={styles.label}>{t("new_gif_optional") || "Novi gif (opcionalno)"}</label>
          <input
            type="file"
            accept="image/gif"
            onChange={(e) => setFileGif(e.target.files?.[0] || null)}
          />
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">
            {t("save_changes")}
          </button>
        </form>
        {/* Desno: prikaz pjesama na albumu i mogućnost izbacivanja/dodavanja */}
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
          <h4 style={{ color: "#fff", marginBottom: 14, fontWeight: 600 }}>{t("songs_on_album") || "Pjesme na albumu"}</h4>
          {pjesmeAlbuma.length === 0 ? (
            <div style={{ color: "#b3b3b3" }}>{t("no_songs_on_album") || "Nema pjesama na ovom albumu."}</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {pjesmeAlbuma.map((p) => (
                <li key={p.id} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#ffe6ec", fontWeight: 500 }}>{p.naziv}</span>
                  <span style={{ color: "#b3b3b3", marginLeft: 8, fontSize: "0.98rem" }}>
                    {p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}
                  </span>
                  <button
                    style={{
                      marginLeft: "auto",
                      background: "#b91d95",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontWeight: 600,
                      fontSize: "0.98rem",
                      cursor: "pointer",
                      transition: "background 0.18s",
                      opacity: removing === p.id ? 0.6 : 1
                    }}
                    disabled={removing === p.id}
                    onClick={() => handleRemoveSong(p.id)}
                  >
                    {removing === p.id ? t("removing") || "Uklanjam..." : t("remove") || "Izbaci"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <hr style={{ margin: "18px 0", border: "none", borderTop: "1px solid #444" }} />
          <h4 style={{ color: "#fff", marginBottom: 10, fontWeight: 600 }}>{t("add_songs") || "Dodaj pjesme"}</h4>
          {svePjesme.length === 0 ? (
            <div style={{ color: "#b3b3b3" }}>{t("no_available_songs") || "Nema dostupnih pjesama."}</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {svePjesme.map((p) => (
                <li key={p.id} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#ffe6ec", fontWeight: 500 }}>{p.naziv}</span>
                  <span style={{ color: "#b3b3b3", marginLeft: 8, fontSize: "0.98rem" }}>
                    {p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}
                  </span>
                  <button
                    style={{
                      marginLeft: "auto",
                      background: "#b91d95",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontWeight: 600,
                      fontSize: "0.98rem",
                      cursor: "pointer",
                      transition: "background 0.18s",
                      opacity: dodajuci === p.id ? 0.6 : 1
                    }}
                    disabled={dodajuci === p.id}
                    onClick={() => handleAddSong(p.id)}
                  >
                    {dodajuci === p.id ? t("adding") || "Dodajem..." : t("add") || "Dodaj"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UrediAlbum;
