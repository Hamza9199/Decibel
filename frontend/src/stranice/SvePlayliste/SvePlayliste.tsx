import React, { useEffect, useState } from "react";
import styles from "./SvePlayliste.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Playlista } from "../../types";
import { Link } from "react-router-dom";



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

  

  // Funkcija za puštanje playliste
  const handlePlayPlaylist = async (playlistId: number) => {
    // Dohvati redoslijed sa backenda
    try {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const idsZaDohvat: number[] = res.data || [];
      if (idsZaDohvat.length === 0) return;
      const pjesmeArr = await Promise.all(
        idsZaDohvat.map((id) =>
          axios
            .get(`${API_BASE}/pjesme/${id}`)
            .then((r) => r.data)
            .catch(() => null)
        )
      );
      const playlistSongs = pjesmeArr.filter(Boolean);
      if (playlistSongs.length === 0) return;
      window.dispatchEvent(
        new CustomEvent("globalAudioPlaylist", {
          detail: {
            playlist: playlistSongs,
            idx: 0,
            repeatAll: false,
          }
        })
      );
    } catch {
      // fallback na staro ponašanje ako backend ne radi
    }
  };

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
                    {/* Play dugme za playlistu */}
                    <button
                      className={styles.playButton}
                      onClick={() => handlePlayPlaylist(pl.id)}
                      title="Pusti playlistu"
                      style={{ left: 50, position: "absolute", bottom: 10 }}
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>
                  <Link to={`/playlista/${pl.id}`} className={styles.cardLink}>
                  <div className={styles.cardTitle}>{pl.naziv}</div>
                  </Link>
                  <Link to={`/izvodjac/${pl.korisnikID}`} className={styles.cardDesc}>
                  <div className={styles.cardDesc}>{pl.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                  </Link>
                  <div className={styles.cardActions}>
                    <Link to={`/uredi-playlistu/${pl.id}`} className={styles.editButton}>
                    <button >
                      Uredi
                    </button>
                    </Link>
                    <button
                      className={styles.deleteButton}
                      onClick={() => {
                        if (window.confirm("Jeste li sigurni da želite obrisati ovu playlistu?")) {
                          axios
                            .delete(`${API_BASE}/playlista/${pl.id}`)
                            .then(() => {
                              setPlayliste((prev) => prev.filter((playlist) => playlist.id !== pl.id));
                            })
                            .catch(() => alert("Greška pri brisanju playliste."));
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

export default SvePlayliste;
               