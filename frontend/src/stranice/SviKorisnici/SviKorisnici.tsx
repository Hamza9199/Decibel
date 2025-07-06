import React, { useEffect, useState } from "react";
import styles from "./SviKorisnici.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Korisnik } from "../../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SviKorisnici: React.FC = () => {
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/korisnici/`)
      .then((res) => setKorisnici(res.data || []))
      .catch(() => setError("Greška pri dohvatu korisnika."))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (
    korisnik: Korisnik,
    field: "rola" | "statusKorisnika",
    value: string
  ) => {
    setError(null);
    setSuccess(null);
    try {
      await axios.put(`${API_BASE}/korisnici/${korisnik.id}`, {
        ...korisnik,
        rola: field === "rola" ? value : korisnik.rola,
        statusKorisnika: field === "statusKorisnika" ? value : korisnik.statusKorisnika,
      });
      setSuccess("Uspješno ažurirano.");
      setKorisnici((prev) =>
        prev.map((k) =>
          k.id === korisnik.id
            ? {
                ...k,
                rola: field === "rola" ? value : k.rola,
                statusKorisnika: field === "statusKorisnika" ? value : k.statusKorisnika,
              }
            : k
        )
      );
    } catch {
      setError("Greška pri ažuriranju korisnika.");
    }
  };

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.bg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Svi korisnici</h2>
          {loading ? (
            <div className={styles.loading}>Učitavanje...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <>
              {success && <div className={styles.success}>{success}</div>}
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Profilna</th>
                    <th>Korisničko ime</th>
                    <th>Email</th>
                    <th>Rola</th>
                    <th>Status</th>
                    <th>Ime</th>
                    <th>Prezime</th>
                  </tr>
                </thead>
                <tbody>
                  {korisnici.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <img
                          src={k.putanjaProfilneSlike || "/logo.gif"}
                          alt={k.korisnicko_ime}
                          className={styles.profileImg}
                        />
                      </td>
                      <td>{k.korisnicko_ime}</td>
                      <td>{k.email}</td>
                      <td>
                        <select
                          value={k.rola}
                          onChange={(e) => handleChange(k, "rola", e.target.value)}
                          className={styles.select}
                        >
                          <option value="korisnik">korisnik</option>
                          <option value="izvodac">izvođač</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={k.statusKorisnika}
                          onChange={(e) => handleChange(k, "statusKorisnika", e.target.value)}
                          className={styles.select}
                        >
                          <option value="aktivan">aktivan</option>
                          <option value="neaktivan">neaktivan</option>
                          <option value="suspendovan">suspendovan</option>
                        </select>
                      </td>
                      <td>{k.ime}</td>
                      <td>{k.prezime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SviKorisnici;
