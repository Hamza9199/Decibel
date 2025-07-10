import React, { useEffect, useState } from "react";
import styles from "./SvePjesme.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma } from "../../types";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SvePjesme: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);

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
      setPjesme([]);
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        // Filtriraj pjesme po korisnikID
        const mojePjesme = (res.data || []).filter(
          (p: Pjesma) => p.korisnikID === korisnikID
        );
        setPjesme(mojePjesme);
      })
      .catch(() => setPjesme([]))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  const handlePlay = (p: Pjesma) => {
    setActiveSongId(p.id);
    if (p.putanjaAudio) {
      window.dispatchEvent(
        new CustomEvent("globalAudioPlay", {
          detail: {
            src: p.putanjaAudio,
            title: p.naziv,
            putanjaGif: p.putanjaGif,
            putanjaSlika: p.putanjaSlika,
            korisnikID: p.korisnikID,
          },
        })
      );
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Da li ste sigurni da želite obrisati ovu pjesmu?")) {
      axios
        .delete(`${API_BASE}/pjesme/${id}`)
        .then(() => {
          setPjesme((prev) => prev.filter((p) => p.id !== id));
        })
        .catch(() => {
          // Handle error
        });
    }
  };

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.svePjesmeBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Moje pjesme</h2>
          {loading ? (
            <div className={styles.loading}>Učitavanje...</div>
          ) : pjesme.length === 0 ? (
            <div className={styles.noSongs}>Nemate nijednu pjesmu.</div>
          ) : (
            <div className={styles.songGrid}>
              {pjesme.map((p) => (
                <div
                  key={p.id}
                  className={`${styles.card} ${activeSongId === p.id ? styles.activeCard : ""}`}
                >
                  <div className={styles.cardImageWrap}>
                    {p.putanjaSlika ? (
                      <img src={p.putanjaSlika} alt={p.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                    {p.putanjaAudio && (
                      <button
                        className={styles.playButton}
                        onClick={() => handlePlay(p)}
                        title="Play"
                      >
                        <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <Link to={`/pjesma/${p.id}`}>
                    <div className={styles.cardTitle}>{p.naziv}</div>
                  </Link>
                  <Link to={`/izvodjac/${p.korisnikID}`}>
                  <div className={styles.cardDesc}>{p.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                  </Link>
                  <div> 
                  <Link
                    to={`/uredi-pjesmu/${p.id}`}
                    style={{
                      color: "#b91d95",
                      fontWeight: 600,
                      fontSize: "0.98rem",
                      textDecoration: "underline",
                      marginTop: 6,
                      display: "inline-block",
                    }}
                  >
                    <button >
                    Uredi pjesmu
                    </button>
                  </Link>
                  <button onClick={() => handleDelete(p.id)}>
                    Obrisi pjesmu
                    </button>
                    </div>
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

export default SvePjesme;
