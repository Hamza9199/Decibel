import React, { useEffect, useState } from "react";
import styles from "./UrediPlaylistu.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Playlista, Pjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediPlaylistu: React.FC = () => {
  const { playlistaId } = useParams<{ playlistaId: string }>();
  const [playlista, setPlaylista] = useState<Playlista | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  let korisnikID: string | undefined = undefined;
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id;
  } catch {
    korisnikID = undefined;
  }

  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    if (!playlistaId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/playliste/${playlistaId}`)
      .then((res) => setPlaylista(res.data))
      .catch(() => setError("Greška pri dohvatanju playliste."))
      .finally(() => setLoading(false));
  }, [playlistaId]);

  useEffect(() => {
    if (!playlistaId) return;
    axios
      .get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`)
      .then(async (res) => {
        const idsZaDohvat: number[] = res.data || [];
        if (idsZaDohvat.length === 0) {
          setPjesme([]);
          return;
        }
        const pjesmeArr = await Promise.all(
          idsZaDohvat.map((id) =>
            axios
              .get(`${API_BASE}/pjesme/${id}`)
              .then((r) => r.data)
              .catch(() => null)
          )
        );
        setPjesme(pjesmeArr.filter(Boolean));
      })
      .catch(() => setPjesme([]));
  }, [playlistaId]);

  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [javno, setJavno] = useState(false);

  useEffect(() => {
    if (playlista) {
      setNaziv(playlista.naziv || "");
      setOpis(playlista.opis || "");
      setJavno(!!playlista.javno);
    }
  }, [playlista]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!playlista || !korisnikID) return;
    const formData = new FormData();
    formData.append("korisnikID", korisnikID);
    formData.append("naziv", naziv);
    formData.append("opis", opis);
    formData.append("kreiranDatumVrijeme", playlista.kreiranDatumVrijeme || "");
    formData.append("javno", String(javno));
    formData.append("brojLajkova", String(playlista.brojLajkova || 0));
    if (fileSlika) formData.append("file_slika", fileSlika);
    if (fileGif) formData.append("file_gif", fileGif);

    try {
      await axios.put(`${API_BASE}/playliste/${playlista.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Playlista je uspješno ažurirana.");
      setTimeout(() => navigate(`/playlista/${playlista.id}`), 1200);
    } catch {
      setError("Greška pri ažuriranju playliste.");
    }
  };

  const handleRemoveSong = async (pjesmaId: number) => {
    setRemoving(pjesmaId);
    try {
      if (!playlistaId) {
        setRemoving(null);
        return;
      }
      await axios.delete(`${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`);
      setPjesme((prev) => prev.filter((p) => p.id !== pjesmaId));
    } catch {
      alert("Greška pri izbacivanju pjesme iz playliste.");
    }
    setRemoving(null);
  };

  if (loading) return <Loading />;
  if (error) return <div style={{ color: "#fff", padding: 32 }}>{error}</div>;
  if (!playlista) return <div style={{ color: "#fff", padding: 32 }}>Playlista nije pronađena.</div>;
  if (playlista.korisnikID !== korisnikID)
    return <div style={{ color: "#fff", padding: 32 }}>Nemate pravo uređivanja ove playliste.</div>;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.editPlaylistBg}>
        <div className={styles.formContainer}>
          <form className={styles.editPlaylistForm} onSubmit={handleSubmit}>
            <h2 className={styles.title}>{t("edit_playlist") || "Uredi playlistu"}</h2>
          <label className={styles.label}>{t("playlist_name") || "Naziv"}</label>
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
          <button className={styles.button} type="submit">
            {t("save_changes")}
          </button>
        </form>
        
        <div className={styles.songsSection}>
          <h4 className={styles.songsTitle}>{t("songs_in_playlist") || "Pjesme u playlisti"}</h4>
          {pjesme.length === 0 ? (
            <div className={styles.noSongsText}>{t("no_songs_in_playlist") || "Nema pjesama u ovoj playlisti."}</div>
          ) : (
            <ul className={styles.songsList}>
              {pjesme.map((p) => (
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
        </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UrediPlaylistu;
