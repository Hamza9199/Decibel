import React, { useEffect, useState } from "react";
import styles from "./UrediPlaylistu.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Playlista } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediPlaylistu: React.FC = () => {
  const { playlistaId } = useParams<{ playlistaId: string }>();
  const [playlista, setPlaylista] = useState<Playlista | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // Dohvati ID logovanog korisnika iz localStorage
  let korisnikID: string | undefined = undefined;
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id;
  } catch {
    korisnikID = undefined;
  }

  useEffect(() => {
    if (!playlistaId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/playliste/${playlistaId}`)
      .then((res) => setPlaylista(res.data))
      .catch(() => setError("Greška pri dohvatanju playliste."))
      .finally(() => setLoading(false));
  }, [playlistaId]);

  // Form state
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);

  useEffect(() => {
    if (playlista) {
      setNaziv(playlista.naziv || "");
      setOpis(playlista.opis || "");
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
    formData.append("javno", String(playlista.javno || false));
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
        <form className={styles.editPlaylistForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Uredi playlistu</h2>
          <label className={styles.label}>Naziv</label>
          <input
            className={styles.input}
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            required
          />
          <label className={styles.label}>Opis</label>
          <textarea
            className={styles.input}
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            rows={3}
          />
          <label className={styles.label}>Nova slika (opcionalno)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFileSlika(e.target.files?.[0] || null)}
          />
          <label className={styles.label}>Novi gif (opcionalno)</label>
          <input
            type="file"
            accept="image/gif"
            onChange={(e) => setFileGif(e.target.files?.[0] || null)}
          />
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">
            Sačuvaj promjene
          </button>
        </form>
      </div>
      <Footer />
    </>
  );
};

export default UrediPlaylistu;
