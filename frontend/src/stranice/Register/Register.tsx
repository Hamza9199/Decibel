import React, { useState, useEffect } from "react";
import styles from "./Register.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Register: React.FC = () => {
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [korisnicko_ime, setKorisnickoIme] = useState("");
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/korisnici/register`, {
        ime,
        prezime,
        korisnicko_ime,
        email,
        lozinka,
        
      });
      setSuccess("Registracija uspješna! Možete se prijaviti.");
      setLoading(false);
      localStorage.setItem("korisnik", JSON.stringify(res.data));

      setTimeout(() => window.location.href = "/", 1200);
    } catch {
      setError("Greška pri registraciji. Provjerite podatke.");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Resetuj background i sakrij player/muziku na register stranici
    window.dispatchEvent(new CustomEvent("activeSongBg", { detail: {} }));
    resetBodyBackground();
    // Sakrij player i mutiraj muziku
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: {} }));
    // Sakrij poruku o pretplati (AudioPlayer)
    window.dispatchEvent(new CustomEvent("hideSubscriptionMsg"));
    const audio = document.querySelector('audio');
    if (audio) {
      audio.muted = true;
      audio.pause();
      audio.currentTime = 0;
    }
    return () => {
      resetBodyBackground();
    };
  }, []);
    
     const resetBodyBackground = () => {
      const body = document.body;
      if (body) {
        body.style.background = 'radial-gradient(ellipse at 10% 60%, #b91d95 0%, #222222 60%)';
      }
    };

  return (
    <div className={styles.registerBg}>
      {loading ? (
        <Loading />
      ) : (
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Registracija</h2>
          <input
            type="text"
            placeholder="Ime"
            className={styles.input}
            value={ime}
            onChange={(e) => setIme(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Prezime"
            className={styles.input}
            value={prezime}
            onChange={(e) => setPrezime(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Korisničko ime"
            className={styles.input}
            value={korisnicko_ime}
            onChange={(e) => setKorisnickoIme(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Lozinka"
            className={styles.input}
            value={lozinka}
            onChange={(e) => setLozinka(e.target.value)}
            required
          />
         
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">
            Registruj se
          </button>
          <div className={styles.linkWrap}>
            Već imate nalog?{" "}
            <span className={styles.link} onClick={() => navigate("/")}>
              Prijavite se
            </span>
          </div>
        </form>
      )}
    </div>
  );
};

export default Register;
