import React, { useEffect, useState } from "react";
import styles from "./SvePlayliste.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Playlista } from "../../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SvePlayliste: React.FC = () => {
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
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
      setPlayliste([]);
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/playliste/`)
      .then((res) => {
        // Filtriraj playliste po korisnikID
        const mojePlayliste = (res.data || []).filter(
          (pl: Playlista) => pl.korisnikID === korisnikID
        );
        setPlayliste(mojePlayliste);
      })
      .catch(() => setPlayliste([]))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.svePlaylisteBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Moje playliste</h2>
          {loading ? (
            <div className={styles.loading}>Učitavanje...</div>
          ) : playliste.length === 0 ? (
            <div className={styles.noPlaylists}>Nemate nijednu playlistu.</div>
          ) : (
            <div className={styles.playlistGrid}>
              {playliste.map((pl) => (
                <div key={pl.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {pl.putanjaSlika ? (
                      <img src={pl.putanjaSlika} alt={pl.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                  </div>
                  <div className={styles.cardTitle}>{pl.naziv}</div>
                  <div className={styles.cardDesc}>{pl.opis || <span>&nbsp;</span>}</div>
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

export default SvePlayliste;
