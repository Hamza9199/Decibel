import React, { useEffect, useState } from "react";
import styles from "./UrediProfil.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import Loading from "../../komponente/Loading/Loading";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediProfil: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [korisnickoIme, setKorisnickoIme] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [rola, setRola] = useState("korisnik");
  const [slika, setSlika] = useState<string | null>(null);
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slikaSuccess, setSlikaSuccess] = useState<string | null>(null);
  const [slikaError, setSlikaError] = useState<string | null>(null);

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  useEffect(() => {
    if (!korisnikID) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/korisnici/${korisnikID}`)
      .then((res) => {
        setIme(res.data.ime || "");
        setPrezime(res.data.prezime || "");
        setKorisnickoIme(res.data.korisnicko_ime || "");
        setEmail(res.data.email || "");
        setBio(res.data.bio || "");
        setRola(res.data.rola || "korisnik");
        setSlika(res.data.putanjaProfilneSlike || null);
      })
      .catch(() => setError("Greška pri učitavanju podataka."))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.put(`${API_BASE}/korisnici/${korisnikID}`, {
        ime,
        prezime,
        korisnicko_ime: korisnickoIme,
        email,
        lozinka: "", // lozinka se ne mijenja ovdje
        rola,
        bio,
      });
      setSuccess("Podaci su uspješno sačuvani.");
    } catch {
      setError("Greška pri čuvanju podataka.");
    } finally {
      setLoading(false);
    }
  };

  const handleSlikaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileSlika(e.target.files[0]);
    }
  };

  const handleSlikaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlikaError(null);
    setSlikaSuccess(null);
    if (!fileSlika) {
      setSlikaError("Odaberite sliku za upload.");
      return;
    }
    const formData = new FormData();
    formData.append("file_profilna", fileSlika);
    try {
      const res = await axios.put(`${API_BASE}/korisnici/slika/${korisnikID}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSlika(res.data.putanjaProfilneSlike || null);
      setSlikaSuccess("Profilna slika je uspješno promijenjena.");
      setFileSlika(null);
    } catch {
      setSlikaError("Greška pri promjeni slike.");
    }
  };

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.editProfileBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Uredi profil</h2>
          {loading ? (
            <Loading />
          ) : (
            <>
              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.label}>
                  Ime:
                  <input
                    className={styles.input}
                    type="text"
                    value={ime}
                    onChange={(e) => setIme(e.target.value)}
                    required
                  />
                </label>
                <label className={styles.label}>
                  Prezime:
                  <input
                    className={styles.input}
                    type="text"
                    value={prezime}
                    onChange={(e) => setPrezime(e.target.value)}
                    required
                  />
                </label>
                <label className={styles.label}>
                  Korisničko ime:
                  <input
                    className={styles.input}
                    type="text"
                    value={korisnickoIme}
                    onChange={(e) => setKorisnickoIme(e.target.value)}
                    required
                  />
                </label>
                <label className={styles.label}>
                  Email:
                  <input
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className={styles.label}>
                  Bio:
                  <textarea
                    className={styles.textarea}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                  />
                </label>
                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}
                <button className={styles.button} type="submit" disabled={loading}>
                  Sačuvaj promjene
                </button>
              </form>
              <div className={styles.profileImageSection}>
                <h3 className={styles.subtitle}>Profilna slika</h3>
                <div className={styles.profileImageWrap}>
                  <img
                    src={slika || "/logo.gif"}
                    alt="Profilna slika"
                    className={styles.profileImage}
                  />
                </div>
                <form className={styles.form} onSubmit={handleSlikaUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.input}
                    onChange={handleSlikaChange}
                  />
                  {slikaError && <div className={styles.error}>{slikaError}</div>}
                  {slikaSuccess && <div className={styles.success}>{slikaSuccess}</div>}
                  <button className={styles.button} type="submit">
                    Promijeni sliku
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UrediProfil;
