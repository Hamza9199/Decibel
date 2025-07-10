import React, { useEffect, useState } from "react";
import styles from "./SvePlayliste.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma, Playlista, VezaPjesmaPlaylista } from "../../types";
import { Link } from "react-router-dom";



const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SvePlayliste: React.FC = () => {
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [loading, setLoading] = useState(true);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [veze, setVeze] = useState<VezaPjesmaPlaylista[]>([]);

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

  useEffect(() => {
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => setPjesme(res.data || []))
      .catch(() => setPjesme([]));
    axios
      .get(`${API_BASE}/pjesma_playlista/`)
      .then((res) => setVeze(res.data || []))
      .catch(() => setVeze([]));
  }, [korisnikID]);

  // Funkcija za puštanje playliste
  const handlePlayPlaylist = (playlistId: number) => {
    // Pronađi veze za playlistu i složi redoslijed
    const vezeZaPlaylistu = veze.filter((v) => v.playlistaID === playlistId);
    if (vezeZaPlaylistu.length === 0) return;
    // Pronađi prvu pjesmu (ona kojoj je pokazivacNaPrethodnuPjesmuID == null)
    let prva = vezeZaPlaylistu.find((v) => v.pokazivacNaPrethodnuPjesmuID == null);
    if (!prva && vezeZaPlaylistu.length === 1) prva = vezeZaPlaylistu[0];
    const orderedIds: number[] = [];
    let curr = prva;
    const visited = new Set<number>();
    while (curr && !visited.has(curr.pjesmaID)) {
      orderedIds.push(curr.pjesmaID);
      visited.add(curr.pjesmaID);
      curr = vezeZaPlaylistu.find((v) => v.pjesmaID === curr?.pokazivacNaSljedecuPjesmuID);
    }
    const idsZaDohvat = orderedIds.length > 0 ? orderedIds : vezeZaPlaylistu.map((v) => v.pjesmaID);
    const playlistSongs = idsZaDohvat
      .map((id) => pjesme.find((p) => p.id === id && p.putanjaAudio))
      .filter(Boolean);
    if (playlistSongs.length === 0) return;
    let idx = 0;
    const playNext = () => {
      if (idx >= playlistSongs.length) return;
      const p = playlistSongs[idx];
      window.dispatchEvent(
        new CustomEvent("globalAudioPlay", {
          detail: {
            src: p?.putanjaAudio,
            title: p?.naziv,
            putanjaGif: p?.putanjaGif,
            putanjaSlika: p?.putanjaSlika,
            korisnikID: p?.korisnikID,
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
