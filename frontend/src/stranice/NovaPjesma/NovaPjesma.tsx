import React, { useState } from "react";
import styles from "./NovaPjesma.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Footer from "../../komponente/Footer/Footer";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NovaPjesma: React.FC = () => {
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [datumObjave, setDatumObjave] = useState("");
  const [trajanjeSekunde, setTrajanjeSekunde] = useState<number>(0);
  const [zanr, setZanr] = useState("pop");
  const [audio, setAudio] = useState<File | null>(null);
  const [slika, setSlika] = useState<File | null>(null);
  const [gif, setGif] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const korisnik = JSON.parse(localStorage.getItem("korisnik") || "{}");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("korisnikID", korisnik.id);
      formData.append("naziv", naziv);
      formData.append("opis", opis);
      formData.append("datumObjave", datumObjave);
      formData.append("trajanjeSekunde", trajanjeSekunde.toString());
      formData.append("zanr", zanr);
      if (audio) formData.append("file_audio", audio);
      if (slika) formData.append("file_slika", slika);
      if (gif) formData.append("file_gif", gif);

      await axios.post<{ id: number }>(`${API_BASE}/pjesme/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Pjesma je uspješno dodana!");
      setLoading(false);
      setTimeout(() => navigate("/"), 1200);
    } catch {
      setError("Greška pri dodavanju pjesme.");
      
      setLoading(false);
    }
  };

  return (
    <>
    <Header/>
    <Sidebar/>
    <div className={styles.novaPjesmaBg}>
      {loading ? (
        <Loading />
      ) : (
        <form className={styles.novaPjesmaForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Dodaj novu pjesmu</h2>
          <label className={styles.label}>Naziv Pjesme</label>
          <input
            type="text"
            placeholder="Naziv pjesme"
            className={styles.input}
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            required
          />
          <label className={styles.label}>Opis</label>
          <textarea
            placeholder="Opis"
            className={styles.input}
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            rows={3}
          />
            <label className={styles.label}>Datum objave</label>
          <input
            type="date"
            placeholder="Datum objave"
            className={styles.input}
            value={datumObjave}
            onChange={(e) => setDatumObjave(e.target.value)}
            required
          />
            <label className={styles.label}>Trajanje (sekunde)</label>
          <input
            type="number"
            placeholder="Trajanje (sekunde)"
            className={styles.input}
            value={trajanjeSekunde}
            onChange={(e) => setTrajanjeSekunde(Number(e.target.value))}
            min={1}
            required
          />
            <label className={styles.label}>Zanr</label>
          <select
            className={styles.input}
            value={zanr}
            onChange={(e) => setZanr(e.target.value)}
            required
          >
            <option value="pop">Pop</option>
            <option value="rock">Rock</option>
            <option value="hip_hop">Hip Hop</option>
            <option value="jazz">Jazz</option>
            <option value="electronic">Electronic</option>
            <option value="klasicna">Klasična</option>
            <option value="metal">Metal</option>
            <option value="alternativni">Alternativni</option>
            <option value="rap">Rap</option>
          </select>
          <label className={styles.label}>Audio fajl:
            <input
              type="file"
              accept="audio/*"
              className={styles.fileInput}
              onChange={(e) => setAudio(e.target.files?.[0] || null)}
              required
            />
          </label>
          <label className={styles.label}>Slika:
            <input
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={(e) => setSlika(e.target.files?.[0] || null)}
            />
          </label>
          <label className={styles.label}>GIF:
            <input
              type="file"
              accept="image/gif"
              className={styles.fileInput}
              onChange={(e) => setGif(e.target.files?.[0] || null)}
            />
          </label>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">
            Dodaj pjesmu
          </button>
        </form>
      )}
    </div>
    <Footer/>
    </>
  );
};

export default NovaPjesma;
