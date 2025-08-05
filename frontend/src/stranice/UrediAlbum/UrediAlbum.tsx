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

  const handleRemoveSong = async (pjesmaId: number) => {
    setRemoving(pjesmaId);
    try {
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
        <div className={styles.formContainer}>
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
        
        <div className={styles.songsSection}>
          <h4 className={styles.songsTitle}>{t("songs_on_album") || "Pjesme na albumu"}</h4>
          {pjesmeAlbuma.length === 0 ? (
            <div className={styles.noSongsText}>{t("no_songs_on_album") || "Nema pjesama na ovom albumu."}</div>
          ) : (
            <ul className={styles.songsList}>
              {pjesmeAlbuma.map((p) => (
                <li key={p.id} className={styles.songItem}>
                  <div className={styles.songInfo}>
                    <span className={styles.songName}>{p.naziv}</span>
                    <span className={styles.songDuration}>
                      {p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}
                    </span>
                  </div>
                  <button
                    className={styles.removeBtn}
                    disabled={removing === p.id}
                    onClick={() => handleRemoveSong(p.id)}
                    style={{ opacity: removing === p.id ? 0.6 : 1 }}
                  >
                    {removing === p.id ? t("removing") || "Uklanjam..." : t("remove") || "Izbaci"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <hr className={styles.divider} />
          <h4 className={styles.addSongsTitle}>{t("add_songs") || "Dodaj pjesme"}</h4>
          {svePjesme.length === 0 ? (
            <div className={styles.noAvailableSongs}>{t("no_available_songs") || "Nema dostupnih pjesama."}</div>
          ) : (
            <ul className={styles.songsList}>
              {svePjesme.map((p) => (
                <li key={p.id} className={styles.songItem}>
                  <div className={styles.songInfo}>
                    <span className={styles.songName}>{p.naziv}</span>
                    <span className={styles.songDuration}>
                      {p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}
                    </span>
                  </div>
                  <button
                    className={styles.addBtn}
                    disabled={dodajuci === p.id}
                    onClick={() => handleAddSong(p.id)}
                    style={{ opacity: dodajuci === p.id ? 0.6 : 1 }}
                  >
                    {dodajuci === p.id ? t("adding") || "Dodajem..." : t("add") || "Dodaj"}
                  </button>
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

export default UrediAlbum;
