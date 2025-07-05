import React, { useEffect, useState } from "react";
import styles from "./SviAlbumi.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Album } from "../../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SviAlbumi: React.FC = () => {
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  // Dohvati ID logovanog korisnika iz localStorage
  let korisnikID: string | undefined = undefined;
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id;
  } catch {
    korisnikID = undefined;
  }

  useEffect(() => {
    if (!korisnikID) {
      setAlbumi([]);
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/albumi/`)
      .then((res) => {
        // Filtriraj albume po korisnikID
        const mojiAlbumi = (res.data || []).filter(
          (a: Album) => a.korisnikID === korisnikID
        );
        setAlbumi(mojiAlbumi);
      })
      .catch(() => setAlbumi([]))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.sviAlbumiBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Moji albumi</h2>
          {loading ? (
            <div className={styles.loading}>Učitavanje...</div>
          ) : albumi.length === 0 ? (
            <div className={styles.noAlbums}>Nemate nijedan album.</div>
          ) : (
            <div className={styles.albumGrid}>
              {albumi.map((a) => (
                <div key={a.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {a.putanjaSlika ? (
                      <img src={a.putanjaSlika} alt={a.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                  </div>
                  <div className={styles.cardTitle}>{a.naziv}</div>
                  <div className={styles.cardDesc}>{a.opis || <span>&nbsp;</span>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SviAlbumi;
