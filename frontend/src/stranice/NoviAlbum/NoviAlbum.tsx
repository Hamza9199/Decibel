import React, { useState } from "react";
import styles from "./NoviAlbum.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Footer from "../../komponente/Footer/Footer";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";


const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NoviAlbum: React.FC = () => {
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

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

    try {
      await axios.post(`${API_BASE}/albumi/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
    
    <div className={styles.noviAlbumBg}>
      <form className={styles.noviAlbumForm} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Novi album</h2>
        <input
          type="text"
          placeholder="Naziv albuma"
          className={styles.input}
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          required
        />
        <textarea
          placeholder="Opis (opcionalno)"
          className={styles.textarea}
          value={opis}
          onChange={(e) => setOpis(e.target.value)}
          rows={3}
        />
        <div className={styles.fileInputs}>
          <label className={styles.fileLabel}>
            Slika:
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
          {loading ? <Loading /> : "Kreiraj album"}
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => navigate("/albums")}
        >
          Odustani
        </button>
      </form>
    </div>
    <Footer/>
    </>
  );
};

export default NoviAlbum;
