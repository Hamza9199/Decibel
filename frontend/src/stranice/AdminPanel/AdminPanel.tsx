import React, { useEffect, useState } from "react";
import styles from "./AdminPanel.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma, Album, Playlista } from "../../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const AdminPanel: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/pjesme/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/albumi/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/playliste/`).then((res) => res.data).catch(() => []),
    ])
      .then(([pjesmeData, albumiData, playlisteData]) => {
        setPjesme(pjesmeData);
        setAlbumi(albumiData);
        setPlayliste(playlisteData);
      })
      .catch(() => setError("Greška pri dohvatu podataka."))
      .finally(() => setLoading(false));
  }, []);

  const handleOdobriPjesmu = async (pjesma: Pjesma, odobreno: boolean) => {
    setError(null);
    setSuccess(null);
    try {
      await axios.put(
        `${API_BASE}/pjesme/${pjesma.id}`,
        {
          ...pjesma,
          odobreno,
        },
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setPjesme((prev) =>
        prev.map((p) =>
          p.id === pjesma.id ? { ...p, odobreno } : p
        )
      );
      setSuccess("Status pjesme je ažuriran.");
    } catch {
      setError("Greška pri ažuriranju statusa pjesme.");
    }
  };

  const handleOdobriAlbum = async (album: Album, odobreno: boolean) => {
    setError(null);
    setSuccess(null);
    try {
      await axios.put(
        `${API_BASE}/albumi/${album.id}`,
        {
          ...album,
          odobreno,
        },
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setAlbumi((prev) =>
        prev.map((a) =>
          a.id === album.id ? { ...a, odobreno } : a
        )
      );
      setSuccess("Status albuma je ažuriran.");
    } catch {
      setError("Greška pri ažuriranju statusa albuma.");
    }
  };

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.adminBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Admin panel</h2>
          {loading ? (
            <div className={styles.loading}>Učitavanje...</div>
          ) : (
            <>
              {success && <div className={styles.success}>{success}</div>}
              {error && <div className={styles.error}>{error}</div>}

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Pjesme</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Naziv</th>
                      <th>Izvođač</th>
                      <th>Odobreno</th>
                      <th>Akcija</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pjesme.map((p) => (
                      <tr key={p.id}>
                        <td>{p.naziv}</td>
                        <td>{p.korisnik?.korisnicko_ime || p.korisnikID}</td>
                        <td>
                          <span
                            className={
                              p.odobreno
                                ? styles.odobreno
                                : styles.neodobreno
                            }
                          >
                            {p.odobreno ? "DA" : "NE"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.btn}
                            style={{
                              background: p.odobreno ? "#e754a2" : "#b91d95",
                            }}
                            onClick={() =>
                              handleOdobriPjesmu(p, !p.odobreno)
                            }
                          >
                            {p.odobreno ? "Poništi odobrenje" : "Odobri"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Albumi</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Naziv</th>
                      <th>Korisnik</th>
                      <th>Broj lajkova</th>
                      <th>Odobreno</th>
                      <th>Akcija</th>
                    </tr>
                  </thead>
                  <tbody>
                    {albumi.map((a) => (
                      <tr key={a.id}>
                        <td>{a.naziv}</td>
                        <td>{a.korisnik?.korisnicko_ime || a.korisnikID}</td>
                        <td>{a.brojLajkova}</td>
                        <td>
                          <span
                            className={
                              a.odobreno
                                ? styles.odobreno
                                : styles.neodobreno
                            }
                          >
                            {a.odobreno ? "DA" : "NE"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.btn}
                            style={{
                              background: a.odobreno ? "#e754a2" : "#b91d95",
                            }}
                            onClick={() =>
                              handleOdobriAlbum(a, !a.odobreno)
                            }
                          >
                            {a.odobreno ? "Poništi odobrenje" : "Odobri"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Playliste</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Naziv</th>
                      <th>Korisnik</th>
                      <th>Broj lajkova</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playliste.map((pl) => (
                      <tr key={pl.id}>
                        <td>{pl.naziv}</td>
                        <td>{pl.korisnik?.korisnicko_ime || pl.korisnikID}</td>
                        <td>{pl.brojLajkova}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminPanel;
