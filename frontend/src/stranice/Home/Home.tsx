import React, { useEffect, useState, useRef } from "react";
import styles from "./Home.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import axios from "axios";

type Pjesma = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaAudio?: string;
  putanjaSlika?: string;
};

type Album = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaSlika?: string;
};

type Playlista = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaSlika?: string;
};

type Korisnik = {
  id: string;
  korisnicko_ime: string;
  ime?: string;
  prezime?: string;
  putanjaProfilneSlike?: string;
};

const API_BASE = "https://aggregate-ajay-decibel1234-bdb02db8.koyeb.app/api";

const Home: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/pjesme/`).then((res) => res.data),
      axios.get(`${API_BASE}/albumi/`).then((res) => res.data),
      axios.get(`${API_BASE}/playliste/`).then((res) => res.data),
      axios.get(`${API_BASE}/korisnici/`).then((res) => res.data),
    ]).then(([pjesmeData, albumiData, playlisteData, korisniciData]) => {
      setPjesme(pjesmeData);
      setAlbumi(albumiData);
      setPlayliste(playlisteData);
      setKorisnici(korisniciData);
      setLoading(false);
    });
  }, []);

  const handlePlay = (id: number, audioUrl?: string) => {
    setActiveSongId(id);
    setTimeout(() => {
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    }, 0);
  };

  if (loading) return <div className={styles.loading}>Učitavanje...</div>;

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Section title="Pjesme">
          <div className={styles.grid}>
            {pjesme.map((p) => (
              <div
                key={p.id}
                className={`${styles.card} ${activeSongId === p.id ? styles.activeCard : ""}`}
              >
                <div className={styles.imageWrap}>
                  {p.putanjaSlika ? (
                    <img src={p.putanjaSlika} alt={p.naziv} className={styles.image} />
                  ) : (
                    <div className={styles.image} style={{ background: "#222" }} />
                  )}
                  {p.putanjaAudio && (
                    <button
                      className={styles.playButton}
                      onClick={() => handlePlay(p.id, p.putanjaAudio)}
                      title="Play"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                        <polygon points="6,4 20,12 6,20" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className={styles.cardTitle}>{p.naziv}</div>
                <div className={styles.cardDesc}>{p.opis || <span>&nbsp;</span>}</div>
              </div>
            ))}
          </div>
          <audio ref={audioRef} className={styles.audioPlayer} controls style={{ width: "100%", marginTop: 24 }} />
        </Section>

        <Section title="Albumi">
          <div className={styles.grid}>
            {albumi.map((a) => (
              <div key={a.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  {a.putanjaSlika ? (
                    <img src={a.putanjaSlika} alt={a.naziv} className={styles.image} />
                  ) : (
                    <div className={styles.image} style={{ background: "#222" }} />
                  )}
                </div>
                <div className={styles.cardTitle}>{a.naziv}</div>
                <div className={styles.cardDesc}>{a.opis || <span>&nbsp;</span>}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Playliste">
          <div className={styles.grid}>
            {playliste.map((pl) => (
              <div key={pl.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  {pl.putanjaSlika ? (
                    <img src={pl.putanjaSlika} alt={pl.naziv} className={styles.image} />
                  ) : (
                    <div className={styles.image} style={{ background: "#222" }} />
                  )}
                </div>
                <div className={styles.cardTitle}>{pl.naziv}</div>
                <div className={styles.cardDesc}>{pl.opis || <span>&nbsp;</span>}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Korisnici">
          <div className={styles.grid}>
            {korisnici.map((k) => (
              <div key={k.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  {k.putanjaProfilneSlike ? (
                    <img src={k.putanjaProfilneSlike} alt={k.korisnicko_ime} className={styles.image} />
                  ) : (
                    <div className={styles.image} style={{ background: "#222" }} />
                  )}
                </div>
                <div className={styles.cardTitle}>{k.korisnicko_ime}</div>
                <div className={styles.cardDesc}>
                  {k.ime} {k.prezime}
                </div>
              </div>
            ))}
          </div>
        </Section>
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
