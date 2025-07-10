import React, { useEffect, useState } from "react";
import styles from "./UrediPjesmu.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Pjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediPjesmu: React.FC = () => {
  const { pjesmaId } = useParams<{ pjesmaId: string }>();
  const [pjesma, setPjesma] = useState<Pjesma | null>(null);
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
    if (!pjesmaId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/pjesme/${pjesmaId}`)
      .then((res) => setPjesma(res.data))
      .catch(() => setError("Greška pri dohvatanju pjesme."))
      .finally(() => setLoading(false));
  }, [pjesmaId]);

  // Form state
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [zanr, setZanr] = useState("");
  const [jezikPjesme, setJezikPjesme] = useState("");
  const [licenca, setLicenca] = useState("");
  const [eksplicitniSadrzaj, setEksplicitniSadrzaj] = useState(false);
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [fileAudio, setFileAudio] = useState<File | null>(null);

  useEffect(() => {
    if (pjesma) {
      setNaziv(pjesma.naziv || "");
      setOpis(pjesma.opis || "");
      setZanr(pjesma.zanr || "");
      setJezikPjesme(pjesma.jezikPjesme || "");
      setLicenca(pjesma.licenca || "");
      setEksplicitniSadrzaj(!!pjesma.eksplicitniSadrzaj);
    }
  }, [pjesma]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!pjesma || !korisnikID) return;
    const formData = new FormData();
    formData.append("korisnikID", korisnikID);
    formData.append("naziv", naziv);
    formData.append("opis", opis);
    formData.append("datumObjave", pjesma.datumObjave || ""); // datum ne mijenjaj
    formData.append("trajanjeSekunde", String(pjesma.trajanjeSekunde));
    formData.append("javno", String(pjesma.javno || false));
    formData.append("odobreno", String(pjesma.odobreno || false));
    formData.append("jezikPjesme", jezikPjesme);
    formData.append("licenca", licenca);
    formData.append("eksplicitniSadrzaj", String(eksplicitniSadrzaj));
    formData.append("zanr", zanr);
    if (pjesma.albumID) formData.append("albumID", String(pjesma.albumID));
    if (fileSlika) formData.append("file_slika", fileSlika);
    if (fileGif) formData.append("file_gif", fileGif);
    if (fileAudio) formData.append("file_audio", fileAudio);

    try {
      await axios.put(`${API_BASE}/pjesme/${pjesma.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Pjesma je uspješno ažurirana.");
      setTimeout(() => navigate(`/pjesma/${pjesma.id}`), 1200);
    } catch {
      setError("Greška pri ažuriranju pjesme.");
    }
  };

  if (loading) return <Loading />;
  if (error) return <div style={{ color: "#fff", padding: 32 }}>{error}</div>;
  if (!pjesma) return <div style={{ color: "#fff", padding: 32 }}>Pjesma nije pronađena.</div>;
  if (pjesma.korisnikID !== korisnikID)
    return <div style={{ color: "#fff", padding: 32 }}>Nemate pravo uređivanja ove pjesme.</div>;

  return (
    <>
    <Header/>
    <Sidebar/>
        <div className={styles.editSongBg}>
      <form className={styles.editSongForm} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Uredi pjesmu</h2>
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
        <label className={styles.label}>Žanr</label>
        <input
          className={styles.input}
          value={zanr}
          onChange={(e) => setZanr(e.target.value)}
          required
        />
        <label className={styles.label}>Jezik pjesme</label>
        <input
          className={styles.input}
          value={jezikPjesme}
          onChange={(e) => setJezikPjesme(e.target.value)}
        />
        <label className={styles.label}>Licenca</label>
        <input
          className={styles.input}
          value={licenca}
          onChange={(e) => setLicenca(e.target.value)}
        />
        <label className={styles.label}>
          Eksplicitni sadržaj
          <input
            type="checkbox"
            checked={eksplicitniSadrzaj}
            onChange={(e) => setEksplicitniSadrzaj(e.target.checked)}
            style={{ marginLeft: 8 }}
          />
        </label>
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
        <label className={styles.label}>Novi audio (opcionalno)</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFileAudio(e.target.files?.[0] || null)}
        />
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <button className={styles.button} type="submit">
          Sačuvaj promjene
        </button>
      </form>
    </div>
    <Footer/>
    </>
  );
};

export default UrediPjesmu;
