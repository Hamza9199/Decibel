import React, { useEffect, useState } from "react";
import styles from "./Home.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import axios from "axios";
import { Pjesma, Album, Playlista, Korisnik } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Home: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [activeSong, setActiveSong] = useState<Pjesma | null>(null);
  const repeatAll = false;

  // Emit event for background image when song changes
  useEffect(() => {
    if (activeSong) {
      const bgGif = activeSong.putanjaGif;
      const bgSlika = activeSong.putanjaSlika;
      window.dispatchEvent(
        new CustomEvent("activeSongBg", { detail: { gif: bgGif, slika: bgSlika } })
      );
    } else {
      window.dispatchEvent(new CustomEvent("activeSongBg", { detail: {} }));
    }
  }, [activeSong]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/pjesme/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/albumi/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/playliste/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/korisnici/`).then((res) => res.data).catch(() => []),
    ]).then(([pjesmeData, albumiData, playlisteData, korisniciData]) => {
      setPjesme(pjesmeData);
      setAlbumi(albumiData);
      setPlayliste(playlisteData);
      setKorisnici(korisniciData);
      setLoading(false);
      console.log("Data loaded successfully", {
        pjesme: pjesmeData
        
      });
    });
  }, []);

  const handlePlay = async (id: number, audioUrl?: string) => {
    setActiveSongId(id);
    const song = pjesme.find((p) => p.id === id);
    setActiveSong(song && audioUrl ? { ...song, putanjaAudio: audioUrl } : null);


    if (song && audioUrl) {
      window.dispatchEvent(
        new CustomEvent("globalAudioPlay", {
          detail: {
            id: id,
            src: audioUrl,
            title: song.naziv,
            putanjaGif: song.putanjaGif,
            putanjaSlika: song.putanjaSlika,
            korisnikID: song.korisnikID,
          },
        })
      );
    }
  };

  // Dodaj play funkciju za album
  const handlePlayAlbum = (albumId: number) => {
    const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
    if (albumSongs.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("globalAudioPlaylist", {
        detail: {
          playlist: albumSongs,
          idx: 0,
          repeatAll,
        }
      })
    );
  };

  const handlePlayPlaylist = async (playlistId: number) => {
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
            repeatAll,
          }
        })
      );
    } catch {
      // fallback na staro ponašanje ako backend ne radi
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Header />
      <Sidebar/>
      <div className={styles.spotifyBg}>
        <div className={styles.container}>
          <Section title="Pjesme">
            <div className={styles.gridRow}>
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
                        onClick={() => handlePlay(p.id, p.putanjaAudio)}
                        title="Play"
                      >
                        <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <Link to={`/pjesma/${p.id}`}><div className={styles.cardTitle}>{p.naziv}</div></Link>
                  <Link to={`/izvodjac/${p.korisnik?.id}`}>

                   <div className={styles.cardDesc}>{p.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                   </Link>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Albumi">
            <div className={styles.gridRow}>
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
                      style={{ left: 50 }}
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>
                  <Link to={`/album/${a.id}`}><div className={styles.cardTitle}>{a.naziv}</div></Link>
                  <Link to={`/izvodjac/${a.korisnik?.id}`}>
                  <div className={styles.cardDesc}>{a.korisnik?.korisnicko_ime|| <span>&nbsp;</span>}</div>
                  </Link>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Playliste">
            <div className={styles.gridRow}>
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
                      style={{ left: 50 }}
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>
                  <Link to={`/playlista/${pl.id}`}>
                    <div className={styles.cardTitle}>{pl.naziv}</div>
                  </Link>
                   <Link to={`/izvodjac/${pl.korisnik?.id}`}>
                  <div className={styles.cardDesc}>{pl.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                  </Link>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Izvođači">
            <div className={styles.gridRow}>
              {korisnici.map((k) => (
                <div key={k.id} className={styles.card}>
                  <div className={styles.cardImageWrap2}>
                    {k.putanjaProfilneSlike ? (
                      <img src={k.putanjaProfilneSlike} alt={k.korisnicko_ime} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                  </div>
                  <Link to={`/izvodjac/${k.id}`}>
                    <div className={styles.cardTitle}>{k.korisnicko_ime}</div>
                  </Link>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
      <Footer />
    </>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 48 }}>
    <h2 className={styles.sectionTitle}>{title}</h2>
    {children}
  </section>
);



export default Home;

