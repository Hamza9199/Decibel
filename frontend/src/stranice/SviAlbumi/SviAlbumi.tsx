import React, { useEffect, useState } from "react";
import styles from "./SviAlbumi.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Album, Pjesma } from "../../types";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SviAlbumi: React.FC = () => {
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);

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

  useEffect(() => {
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => setPjesme(res.data || []))
      .catch(() => setPjesme([]));
  }, [korisnikID]);

  // Funkcija za puštanje albuma
  const handlePlayAlbum = (albumId: number) => {
    const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
    if (albumSongs.length === 0) return;
    let idx = 0;
    const playNext = () => {
      if (idx >= albumSongs.length) return;
      const p = albumSongs[idx];
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
      idx++;
      const handler = () => {
        playNext();
        window.removeEventListener("audioSongEnded", handler);
      };
      window.addEventListener("audioSongEnded", handler);
    };
    playNext();
  };

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
                    {/* Play dugme za album */}
                    <button
                      className={styles.playButton}
                      onClick={() => handlePlayAlbum(a.id)}
                      title="Pusti album"
                      style={{ left: 50, position: "absolute", bottom: 10 }}
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>
                  <Link to={`/album/${a.id}`} className={styles.cardLink}>
                  <div className={styles.cardTitle}>{a.naziv}</div>
                  </Link>
                  <Link to={`/izvodjac/${a.korisnikID}`}>
                  <div className={styles.cardDesc}>{a.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                  </Link>

                  <div className={styles.cardActions}>
                    <Link to={`/uredi-album/${a.id}`} className={styles.editButton}>
                    <button >
                      Uredi
                    </button>
                    </Link>
                    <button
                      className={styles.deleteButton}
                      onClick={() => {
                        if (window.confirm("Jeste li sigurni da želite obrisati ovaj album?")) {
                          axios
                            .delete(`${API_BASE}/albumi/${a.id}`)
                            .then(() => {
                              setAlbumi((prev) => prev.filter((album) => album.id !== a.id));
                            })
                            .catch(() => alert("Greška pri brisanju albuma."));
                        }
                      }}
                    >
                      Obriši
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

export default SviAlbumi;
