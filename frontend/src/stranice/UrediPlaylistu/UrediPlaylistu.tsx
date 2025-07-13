import React, { useEffect, useState } from "react";
import styles from "./UrediPlaylistu.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Playlista, Pjesma } from "../../types";
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

  // Form state
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
          <label className={styles.fileLabel} style={{marginTop: 10, marginBottom: 10}}>
            <input
              type="checkbox"
              checked={javno}
              onChange={e => setJavno(e.target.checked)}
              style={{marginRight: 8}}
            />
            Javna playlista
          </label>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">
            Sačuvaj promjene
          </button>
        </form>
        {/* Desno: prikaz pjesama u playlisti i mogućnost izbacivanja */}
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
          <h4 style={{ color: "#fff", marginBottom: 14, fontWeight: 600 }}>Pjesme u playlisti</h4>
          {pjesme.length === 0 ? (
            <div style={{ color: "#b3b3b3" }}>Nema pjesama u ovoj playlisti.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {pjesme.map((p) => (
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
                    {removing === p.id ? "Uklanjam..." : "Izbaci"}
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

export default UrediPlaylistu;
