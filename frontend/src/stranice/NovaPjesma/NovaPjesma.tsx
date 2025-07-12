import React, { useState, useEffect } from "react";
import styles from "./NovaPjesma.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Footer from "../../komponente/Footer/Footer";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { Album, Korisnik } from "../../types";

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
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [albumID, setAlbumID] = useState<number | "">("");
  const [sviIzvodjaci, setSviIzvodjaci] = useState<Korisnik[]>([]);
  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const korisnik = JSON.parse(localStorage.getItem("korisnik") || "{}");

  useEffect(() => {
    // Dohvati sve albume korisnika
    if (!korisnik?.id) return;
    axios
      .get(`${API_BASE}/albumi/`)
      .then((res) => {
        setAlbumi((res.data || []).filter((a: Album) => a.korisnikID === korisnik.id));
      })
      .catch(() => setAlbumi([]));
  }, [korisnik?.id]);

  useEffect(() => {
    // Dohvati sve korisnike za search izvođača
    axios
      .get(`${API_BASE}/korisnici/`)
      .then((res) => setSviIzvodjaci(res.data || []))
      .catch(() => setSviIzvodjaci([]));
  }, [korisnik?.id]);

  // Ensure the user creating the song is always in izabraniIzvodjaci
  useEffect(() => {
    if (!korisnik?.id) return;
    setIzabraniIzvodjaci((prev) => {
      if (prev.find((k) => k.id === korisnik.id)) return prev;
      // Try to find the korisnik object from sviIzvodjaci if possible
      const userObj = sviIzvodjaci.find((k) => k.id === korisnik.id) || korisnik;
      return [userObj, ...prev];
    });
    // eslint-disable-next-line
  }, [korisnik?.id, sviIzvodjaci]);

  // Dodavanje/uklanjanje izvođača
  const handleAddIzvodjac = (korisnik: Korisnik) => {
    if (!izabraniIzvodjaci.find((k) => k.id === korisnik.id)) {
      setIzabraniIzvodjaci((prev) => [...prev, korisnik]);
    }
  };
  const handleRemoveIzvodjac = (korisnikId: string) => {
    // Sada se može ukloniti i sam sebe
    setIzabraniIzvodjaci((prev) => prev.filter((k) => k.id !== korisnikId));
  };

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
      if (albumID) formData.append("albumID", String(albumID));
      if (audio) formData.append("file_audio", audio);
      if (slika) formData.append("file_slika", slika);
      if (gif) formData.append("file_gif", gif);

      // 1. Kreiraj pjesmu
      const res = await axios.post<{ id: number }>(`${API_BASE}/pjesme/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const pjesmaId = res.data.id;

      // 2. Dodaj veze za izvodjace (ako ima više)
      for (const izvodjac of izabraniIzvodjaci) {
        await axios.post(`${API_BASE}/izvodjac_pjesma/`, {
          izvodjacID: izvodjac.id,
          pjesmaID: pjesmaId,
          potvrdjeno: izvodjac.id === korisnik.id, // vlasnik automatski potvrđen
        });
      }

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
      {loading && <Loading/>}
      <div className={styles.novaPjesmaBg} style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <form className={styles.novaPjesmaForm} onSubmit={handleSubmit} style={{ minWidth: 340 }}>
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
          <label className={styles.label}>Album (opcionalno)</label>
          <select
            className={styles.input}
            value={albumID}
            onChange={e => setAlbumID(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Bez albuma</option>
            {albumi.map((a) => (
              <option key={a.id} value={a.id}>{a.naziv}</option>
            ))}
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
        {/* Desno: search i izbor izvođača */}
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
          <h4 style={{ color: "#fff", marginBottom: 14, fontWeight: 600 }}>Izvođači na pjesmi</h4>
          <input
            type="text"
            placeholder="Pretraži izvođače..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid #b91d95",
              padding: "8px 10px",
              fontSize: "1.05rem",
              marginBottom: 10,
              background: "#181818",
              color: "#fff"
            }}
          />
          <div style={{ marginBottom: 10 }}>
            {izabraniIzvodjaci.map((k) => (
              <span key={k.id} style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#b91d95",
                color: "#fff",
                borderRadius: 8,
                padding: "4px 10px",
                marginRight: 6,
                marginBottom: 6,
                fontWeight: 600,
                fontSize: "0.98rem"
              }}>
                {k.korisnicko_ime}
                <button
                  style={{
                    marginLeft: 6,
                    background: "none",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "1.1rem"
                  }}
                  onClick={() => handleRemoveIzvodjac(k.id)}
                  title={k.id === korisnik.id ? "Ukloni sebe kao izvođača" : "Ukloni izvođača"}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
            {/* Napomena korisniku */}
            <div style={{ color: "#bbb", fontSize: "0.93rem", marginTop: 4 }}>
              Možete ukloniti i sebe kao izvođača.
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {sviIzvodjaci
              .filter((k) =>
                k.korisnicko_ime.toLowerCase().includes(search.toLowerCase()) &&
                !izabraniIzvodjaci.find((iz) => iz.id === k.id)
              )
              .slice(0, 8)
              .map((k) => (
                <li key={k.id} style={{ marginBottom: 8 }}>
                  <button
                    style={{
                      background: "#b91d95",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 0",
                      fontSize: "1.05rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      transition: "background 0.18s",
                    }}
                    type="button"
                    onClick={() => handleAddIzvodjac(k)}
                  >
                    {k.korisnicko_ime}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </div>
      <Footer/>
    </>
  );
};

export default NovaPjesma;
