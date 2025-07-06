import React, { useEffect, useState } from "react";
import styles from "./Playlista.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams } from "react-router-dom";
import type { Playlista, Pjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Playlista: React.FC = () => {
  const { playlistaId } = useParams<{ playlistaId: string }>();
  const [playlista, setPlaylista] = useState<Playlista | null>(null);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [repeatAll, setRepeatAll] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  useEffect(() => {
    if (!playlistaId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/playliste/${playlistaId}`)
      .then((res) => {
        setPlaylista(res.data);
        setLikeCount(res.data.brojLajkova || 0);
      })
      .catch(() => setPlaylista(null));
    // Dohvati pjesme iz playliste (redoslijed)
    axios
      .get(`${API_BASE}/redoslijed_pjesama/?playlistaID=${playlistaId}`)
      .then((res) => {
        const redoslijed = res.data || [];
        // Dohvati detalje pjesama po ID-u
        interface RedoslijedPjesme {
          pjesmaID: string;
        }
        Promise.all(
          (redoslijed as RedoslijedPjesme[]).map((r) =>
            axios
              .get(`${API_BASE}/pjesme/${r.pjesmaID}`)
              .then((r) => r.data)
              .catch(() => null)
          )
        ).then((pjesmeArr) => setPjesme(pjesmeArr.filter(Boolean)));
      })
      .catch(() => setPjesme([]));
    setLiked(false);
    setLoading(false);
  }, [playlistaId, korisnikID]);

  const handlePlaySong = (p: Pjesma) => {
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
  };

  const handlePlayPlaylist = () => {
    if (pjesme.length === 0) return;
    let idx = 0;
    const playNext = () => {
      if (idx >= pjesme.length) {
        if (repeatAll) {
          idx = 0;
        } else {
          return;
        }
      }
      const p = pjesme[idx];
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
      // Slušaj završetak pjesme i pusti sljedeću
      const handler = () => {
        playNext();
        window.removeEventListener("audioSongEnded", handler);
      };
      window.addEventListener("audioSongEnded", handler);
    };
    playNext();
  };

  const handleLike = () => {
    // Dummy: zamijeni sa pravim endpointom za lajk
    setLiked((prev) => !prev);
    setLikeCount((prev) => prev + (liked ? -1 : 1));
  };

  if (loading) return <Loading />;
  if (!playlista)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>Playlista nije pronađena.</h2>
        </div>
        <Footer />
      </div>
    );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.playlistaBg}>
        <div className={styles.container}>
          <div className={styles.playlistaMain}>
            <div className={styles.playlistaSlikaWrap}>
              <img
                src={playlista.putanjaSlika || "/logo.gif"}
                alt={playlista.naziv}
                className={styles.playlistaSlika}
              />
              <button className={styles.playBtn} onClick={handlePlayPlaylist} title="Pusti playlistu">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff">
                  <polygon points="12,8 36,22 12,36" />
                </svg>
              </button>
              <button
                className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
                onClick={handleLike}
                title={liked ? "Ukloni lajk" : "Lajkuj playlistu"}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill={liked ? "#e754a2" : "#fff"}>
                  <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                </svg>
                <span>{likeCount}</span>
              </button>
              <button
                className={styles.repeatBtn}
                onClick={() => setRepeatAll((r) => !r)}
                title={repeatAll ? "Isključi ponavljanje playliste" : "Ponovi playlistu"}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="#fff">
                  <g>
                    <path d="M7 14v-2a7 7 0 0 1 7-7h4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 7l-2-2-2 2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 14v2a7 7 0 0 1-7 7h-4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M7 21l2 2 2-2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                  </g>
                </svg>
              </button>
            </div>
            <div className={styles.playlistaInfo}>
              <h2 className={styles.playlistaNaziv}>{playlista.naziv}</h2>
              <div className={styles.playlistaOpis}>{playlista.opis}</div>
              <div className={styles.playlistaMeta}>
                <span>
                  Broj pjesama: <b>{pjesme.length}</b>
                </span>
                <span>
                  Lajkova: <b>{likeCount}</b>
                </span>
                <span>
                  Javno: <b>{playlista.javno ? "Da" : "Ne"}</b>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.pjesmeSection}>
            <h3 className={styles.pjesmeTitle}>Pjesme u playlisti</h3>
            {pjesme.length === 0 ? (
              <div className={styles.noSongs}>Nema pjesama u ovoj playlisti.</div>
            ) : (
              <table className={styles.pjesmeTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Naziv</th>
                    <th>Trajanje</th>
                    <th>Izvođač</th>
                    <th>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {pjesme.map((p, idx) => (
                    <tr key={p.id}>
                      <td>{idx + 1}</td>
                      <td>{p.naziv}</td>
                      <td>{formatTrajanje(p.trajanjeSekunde)}</td>
                      <td>{p.korisnik?.korisnicko_ime || ""}</td>
                      <td>
                        <button
                          className={styles.songPlayBtn}
                          onClick={() => handlePlaySong(p)}
                          title="Pusti pjesmu"
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

function formatTrajanje(sec?: number) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default Playlista;
