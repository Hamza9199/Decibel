import React, { useState } from "react";
import styles from "./Login.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/korisnici/login`, {
        email,
        lozinka,
      });
      localStorage.setItem("korisnik", JSON.stringify(res.data));
      setLoading(false);
      navigate("/");
    } catch {
      setError("Pogrešan email ili lozinka.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginBg}>
      {loading ? (
        <Loading />
      ) : (
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Prijava</h2>
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
          <button className={styles.button} type="submit">
            Prijavi se
          </button>
          <div className={styles.linkWrap}>
            Nemate nalog?{" "}
            <span className={styles.link} onClick={() => navigate("/register")}>
              Registrujte se
            </span>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;
