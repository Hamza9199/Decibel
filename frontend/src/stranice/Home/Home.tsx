import React, { useEffect, useState, useRef } from "react";
import styles from "./Home.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";

type Pjesma = {
  id: number;
  naziv: string;
  opis?: string;
  putanjaAudio?: string;
  putanjaSlika?: string;
};

const Home: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/pjesme/")
      .then((res) => res.json())
      .then((data) => {
        setPjesme(data);
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

  if (loading) return <div>Učitavanje...</div>;

  return (
    <>
      <Header />
      <div className={styles.container}>
        <h2 className={styles.title}>Pjesme</h2>
        <ul className={styles.songGrid}>
          {pjesme.map((p) => (
            <li
              key={p.id}
              className={`${styles.songCard} ${activeSongId === p.id ? styles.activeCard : ""}`}
            >
              <div className={styles.songImageWrap}>
                {p.putanjaSlika ? (
                  <img src={p.putanjaSlika} alt={p.naziv} className={styles.songImage} />
                ) : (
                  <div className={styles.songImage} style={{ background: "#222" }} />
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
              <div className={styles.songTitle}>{p.naziv}</div>
              <div className={styles.songDesc}>{p.opis || <span>&nbsp;</span>}</div>
            </li>
          ))}
        </ul>
        {/* Globalni audio player */}
        <audio ref={audioRef} className={styles.audioPlayer} controls style={{ width: "100%", marginTop: 32 }} />
      </div>
      <Footer />
    </>
  );
};

export default Home;
