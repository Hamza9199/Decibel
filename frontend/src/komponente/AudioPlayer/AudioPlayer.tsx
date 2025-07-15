import { useEffect, useRef, useState } from "react";
import styles from "./AudioPlayer.module.css";
import axios from "axios";
import { Korisnik, Playlista, Pjesma, KorisnikPretplata } from "../../types";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Props = {
  id?: number; // <-- dodaj id u Props
  src?: string;
  title?: string;
  putanjaGif?: string;
  putanjaSlika?: string;
  korisnikID?: string;
  visible: boolean;
  onEnded?: () => void;
  onClose?: () => void;
  minimized?: boolean;
  onExpand?: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const AudioPlayer: React.FC<Props> = ({
  id,
  src,
  title,
  putanjaGif,
  putanjaSlika,
  korisnikID,
  visible,
  onClose,
  minimized,
  onExpand,
}) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState<number>(0.3);
  const [muted, setMuted] = useState(false);
  const [korisnik, setKorisnik] = useState<Korisnik>();
  const [lastSrc, setLastSrc] = useState<string | undefined>(undefined);
  const [wasMinimized, setWasMinimized] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
   const [liked, setLiked] = useState(false);
   const [pjesma, setPjesma] = useState<Pjesma>();
   const [statistikaSent, setStatistikaSent] = useState(false);
   const [globalPlaylist, setGlobalPlaylist] = useState<Pjesma[]>([]);
   const [playlistIdx, setPlaylistIdx] = useState<number>(-1);
   const [playlistRepeat, setPlaylistRepeat] = useState(false);
  // Dodaj state za prikaz trenutne pjesme iz playliste ili single
  const [currentSong, setCurrentSong] = useState<Pjesma | null>(null);
  // Dodaj state za vlasnika trenutne pjesme
  const [currentOwner, setCurrentOwner] = useState<Korisnik | undefined>(undefined);
  const [pretplataValid, setPretplataValid] = useState<boolean | null>(null);
  const [showNoSubMsg, setShowNoSubMsg] = useState(true);
  const location = useLocation();
  const [isMobile] = useState(window.innerWidth <= 480);

  // Provjera pretplate korisnika koji sluša (iz localStorage)
  useEffect(() => {
    // Provjeri pretplatu korisnika koji sluša (iz localStorage)
    let isMounted = true;
    async function checkPretplata() {
      let slusacID = "";
      try {
        const user = JSON.parse(localStorage.getItem("korisnik") || "");
        slusacID = user?.id || "";
      } catch {
        slusacID = "";
      }
      if (!slusacID) {
        setPretplataValid(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/korisnik_pretplata/`);
        const svePretplate = res.data || [];
        
        const moja = (svePretplate as KorisnikPretplata[]).find((p) => p.korisnikID === slusacID);
        if (!moja || !moja.datumIsteka || new Date(moja.datumIsteka) < new Date()) {
          if (isMounted) setPretplataValid(false);
        } else {
          if (isMounted) setPretplataValid(true);
        }
      } catch {
        if (isMounted) setPretplataValid(false);
      }
    }
    checkPretplata();
    return () => { isMounted = false; };
  }, []);

  // Dodaj listener za "hideSubscriptionMsg" event da sakrije poruku o pretplati
  useEffect(() => {
    const handler = () => setShowNoSubMsg(false);
    window.addEventListener("hideSubscriptionMsg", handler);
    return () => window.removeEventListener("hideSubscriptionMsg", handler);
  }, []);

  // Automatski sakrij poruku nakon 4 sekunde
  useEffect(() => {
    if (pretplataValid === false && showNoSubMsg) {
      const timer = setTimeout(() => setShowNoSubMsg(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [pretplataValid, showNoSubMsg]);

  useEffect(() => {
    setShowNoSubMsg(true);
  }, [location.pathname]);

  // Sync audio src and play new song immediately
  useEffect(() => {
    if (audioRef.current && src) {
      if (audioRef.current.src !== src) {
        audioRef.current.src = src;
        audioRef.current.load();
        audioRef.current.volume = 0.3; // ensure this is a float, not string
        setPlaying(true);
        setProgress(0);
        setLastSrc(src);
      } else if (!playing) {
        setPlaying(true);
      }
    }
    // eslint-disable-next-line
  }, [src, globalPlaylist.length]);

  // Ensure play/pause state is always in sync with minimized state
  useEffect(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [playing, minimized]);

  useEffect(() => {
    if (pretplataValid === false) return;
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate,pretplataValid]);

  // Sync volume and muted state always, including on minimize/maximize
  useEffect(() => {
    if (pretplataValid === false) return;
    if (audioRef.current) {
      audioRef.current.volume = Number(volume); // ensure float
      audioRef.current.muted = muted;
    }
  }, [volume, muted, minimized,pretplataValid]);

  // When minimized, keep audio playing in background and keep progress/volume
  useEffect(() => {
    if (pretplataValid === false) return;
    if (audioRef.current && minimized && playing) {
      audioRef.current.play().catch(() => {});
      audioRef.current.currentTime = progress;
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
    // eslint-disable-next-line
  }, [minimized]);

  // Fix: When returning from minimized to maximized, do NOT reset audio, just continue
  useEffect(() => {
    if (pretplataValid === false) return;
    if (!minimized && wasMinimized && audioRef.current) {
      // Just restore UI, do not reload or reset audio
      audioRef.current.currentTime = progress;
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
      if (playing) {
        audioRef.current.play().catch(() => {});
      }
    }
    setWasMinimized(minimized ?? false);
    // eslint-disable-next-line
  }, [minimized]);

  // If src changes, always play the new song
  useEffect(() => {
    if (pretplataValid === false) return;
    if (audioRef.current && src && src !== lastSrc) {
      audioRef.current.src = src;
      audioRef.current.load();
      setPlaying(true);
      setProgress(0);
      setLastSrc(src);
    }
    // eslint-disable-next-line
  }, [src]);

  // Fix: If user clicks play on a new song while another is paused, always play the new one
  useEffect(() => {
    if (pretplataValid === false) return;
    if (audioRef.current && src && playing && audioRef.current.src !== src && globalPlaylist.length === 0) {
      audioRef.current.src = src;
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
      setProgress(0);
      setLastSrc(src);
    }
  }, [src, playing, globalPlaylist.length,pretplataValid]);

   useEffect(() => {
    if (!src) {
      setPjesma(undefined);
      setLiked(false);
      return;
    }
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        const p = (res.data as Pjesma[] || []).find((p: Pjesma) => p.putanjaAudio === src);
        setPjesma(p);
        // Provjeri da li je korisnik lajkao pjesmu (koristi korisnik_pjesma)
        let korisnikID = korisnik?.id;
        try {
            const user = JSON.parse(localStorage.getItem("korisnik") || "");

          korisnikID = user?.id || korisnikID;
        } catch {
          console.error("Failed to parse user from localStorage");
        }
        if (p && korisnikID) {
          axios
            .get(`${API_BASE}/korisnik_pjesma/`)
            .then((r) => {
              const veze = r.data as { korisnikID: string; pjesmaID: number }[];
              setLiked(!!veze.find((v) => v.korisnikID === korisnikID && v.pjesmaID === p.id));
            })
            .catch(() => setLiked(false));
        } else {
          setLiked(false);
        }
      })
      .catch(() => {
        setPjesma(undefined);
        setLiked(false);
      });
  }, [src, korisnik?.id]);

  // Dodaj statistiku reprodukcije nakon 30 sekundi slušanja
useEffect(() => {
  if (!pjesma || !korisnik?.id || !playing || !src) {
    setStatistikaSent(false);
    return;
  }
  if (progress < 30 || statistikaSent) return;

  const sendStatistika = async () => {
    try {
      // Statistika reprodukcije
      await axios.post(`${API_BASE}/statistika/`, {
        korisnikID: korisnik.id,
        pjesmaID: pjesma.id,
        brojReprodukcija: 1,
        ukupnoTrajanje: pjesma.trajanjeSekunde || 0,
        zadnjePustanje: new Date().toISOString(),
      }).catch(() => {});

      // Povećaj broj reprodukcija na pjesmi
      await axios.put(`${API_BASE}/pjesme/${pjesma.id}`, {
        ...pjesma,
        brojReprodukcija: (pjesma.brojReprodukcija || 0) + 1,
      }).catch(() => {});
    } catch {
      console.error("Failed to send statistika reprodukcije");
    }
    setStatistikaSent(true);
  };

  sendStatistika();
  // eslint-disable-next-line
}, [progress, pjesma, korisnik?.id, statistikaSent, src]);

// Reset statistikaSent kad se pjesma promijeni
useEffect(() => {
  setStatistikaSent(false);
}, [src]);

  // Dodaj pjesmu u historiju slušanja kada se pjesma pusti (na početku)
  useEffect(() => {
    if (!pjesma || !korisnik?.id || !src) return;
    // Dodaj u historiju samo kad se pjesma promijeni
    const addToHistorija = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("korisnik") || "");
        // Prvo obriši ako već postoji u historiji za korisnika
        await axios.delete(`${API_BASE}/historija/obrisi/${user?.id}/${pjesma.id}`).catch(() => {});
        // Zatim dodaj kao novu (prva u historiji)
        await axios.post(`${API_BASE}/historija/`, {
          korisnikID: user?.id,
          pjesmaID: pjesma.id,
          playlistaID: null,
          kreiranDatumVrijeme: new Date().toISOString(),
          trajanje: pjesma.trajanjeSekunde || 0,
          kontekstPustanjaURL: null,
          offline: false,
          kontekstPustanja: null,
        });
      } catch {
        // ignore error
      }
    };
    addToHistorija();
    // eslint-disable-next-line
  }, [pjesma?.id, korisnik?.id, src]);

  const handlePlayPause = () => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      // Nastavi/zaustavi trenutnu pjesmu iz playliste
      setPlaying((p) => !p);
    } else if (globalPlaylist.length === 0 && src) {
      // Single song
      setPlaying((p) => !p);
    }
    // Ne mijenjaj currentSong ovdje!
  };

   const handleLike = async () => {
    if (!pjesma || !korisnik?.id) return;
    if (liked) {
      // Un-like
      await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnik.id}/${pjesma.id}`).catch(() => {});
      setLiked(false);
    } else {
      await axios.post(`${API_BASE}/korisnik_pjesma/`, {
        korisnikID: korisnik.id,
        pjesmaID: pjesma.id,
        kreiranDatumVrijeme: new Date().toISOString(),
      }).catch(() => {});
      setLiked(true);
    }
  };


  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlaybackRate(Number(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value)); // ensure float
    if (muted && Number(e.target.value) > 0) setMuted(false);
  };

  const handleMuteToggle = () => {
    setMuted((m) => !m);
  };

  // Dodaj funkciju za toggle repeat all (album/playlist)
  const handleRepeatAllToggle = () => {
    setPlaylistRepeat((prev) => !prev);
    // Ako je repeatOne bio aktivan, isključi ga
    if (repeatOne) setRepeatOne(false);
  };

  // Izmijeni handleRepeatToggle da isključuje repeatAll ako uključuje repeatOne i obrnuto
  const handleRepeatToggle = () => {
    setRepeatOne((prev) => {
      if (!prev) setPlaylistRepeat(false);
      return !prev;
    });
  };

  // Dohvati korisnika
  useEffect(() => {
    async function fetchKorisnik() {
      if (!korisnikID) {
        setKorisnik(undefined);
        return;
      }
      const res = await axios
        .get(`${API_BASE}/korisnici/${korisnikID}`)
        .then((res) => res.data)
        .catch(() => undefined);
      setKorisnik(res);
    }
    fetchKorisnik();
  }, [korisnikID]);

  // Dohvati playliste korisnika za modal
  useEffect(() => {
    if (!korisnikID) return;
    axios
      .get(`${API_BASE}/playliste/`)
      .then((res) => setPlaylists(res.data || []))
      .catch(() => setPlaylists([]));
  }, [korisnikID]);

  // Dodavanje pjesme u playlistu
  const handleAddToPlaylist = async (playlistaID: number) => {
    if (!src || !korisnikID) return;
    // Pronađi pjesmu po putanji
    const pjesmaRes = await axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => (res.data as Pjesma[] || []).find((p: Pjesma) => p.putanjaAudio === src));
    if (!pjesmaRes) return;

    // Pozovi backend da doda pjesmu na kraj playliste
    try {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: pjesmaRes.id,
        playlistaID: playlistaID,
      });
      setShowPlaylistModal(false);
      alert("Pjesma dodana u playlistu!");
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
      ) {
        alert((error as { response: { data: { detail: string } } }).response.data.detail);
      } else {
        alert("Greška pri dodavanju pjesme u playlistu.");
      }
      setShowPlaylistModal(false);
    }
  };

  // Slušaj globalni event za puštanje playliste/album
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.playlist && Array.isArray(detail.playlist) && typeof detail.idx === "number") {
        setGlobalPlaylist(detail.playlist);
        setPlaylistIdx(detail.idx);
        setPlaylistRepeat(!!detail.repeatAll);
      } else {
        setGlobalPlaylist([]);
        setPlaylistIdx(-1);
        setPlaylistRepeat(false);
      }
    };
    window.addEventListener("globalAudioPlaylist", handler);
    return () => window.removeEventListener("globalAudioPlaylist", handler);
  }, []);

  // Kad se promijeni playlistIdx ili globalPlaylist, ažuriraj currentSong i pusti pjesmu
  useEffect(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      const song = globalPlaylist[playlistIdx];
      setCurrentSong(song);
      if (audioRef.current && song?.putanjaAudio) {
        audioRef.current.src = song.putanjaAudio;
        audioRef.current.load();
        setPlaying(true);
        setProgress(0);
      }
    }
  }, [playlistIdx, globalPlaylist]);

  useEffect(() => {
    // Postavi currentSong i audioRef.src iz props SAMO ako NIJE aktivna playlista
    if (globalPlaylist.length === 0 && src) {
      setCurrentSong((prev) => {
        // Ako već prikazujemo ovu pjesmu, ne mijenjaj state (zadrži detalje)
        if (prev && prev.putanjaAudio === src) return prev;
        return {
          id: id ?? 0,
          naziv: title ?? "",
          putanjaAudio: src,
          putanjaGif: putanjaGif,
          putanjaSlika: putanjaSlika,
          korisnikID: korisnikID ?? "",
        } as Pjesma;
      });
      if (audioRef.current && globalPlaylist.length === 0) {
        audioRef.current.src = src;
        audioRef.current.load();
      }
    }
    // Ako je aktivna playlista, NE diraj currentSong ni audioRef.src ovdje!
  }, [src, id, title, putanjaGif, putanjaSlika, korisnikID, globalPlaylist.length]);

  // Kada se promijeni currentSong, učitaj vlasnika pjesme
  useEffect(() => {
    if (!currentSong?.korisnikID) {
      setCurrentOwner(undefined);
      return;
    }
    axios
      .get(`${API_BASE}/korisnici/${currentSong.korisnikID}`)
      .then((res) => setCurrentOwner(res.data))
      .catch(() => setCurrentOwner(undefined));
  }, [currentSong?.korisnikID]);

  // Kada se pusti single pjesma, očisti globalPlaylist i postavi currentSong
  useEffect(() => {
    // Ako je došao globalAudioPlay event, očisti playlistu i postavi currentSong
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.src) {
        setGlobalPlaylist([]);
        setPlaylistIdx(-1);
        setPlaylistRepeat(false);
        setCurrentSong({
          id: detail.id ?? 0,
          naziv: detail.title ?? "",
          putanjaAudio: detail.src,
          putanjaGif: detail.putanjaGif,
          putanjaSlika: detail.putanjaSlika,
          korisnikID: detail.korisnikID ?? "",
        } as Pjesma);
        if (audioRef.current) {
          audioRef.current.src = detail.src;
          audioRef.current.load();
          setPlaying(true);
          setProgress(0);
        }
      }
    };
    window.addEventListener("globalAudioPlay", handler);
    return () => window.removeEventListener("globalAudioPlay", handler);
  }, []);

  // On ended: ispravi logiku za repeatOne i playlistRepeat
  const handleEnded = () => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0) {
      if (repeatOne) {
        // Ako je repeatOne aktivan, ponovi istu pjesmu
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        setPlaying(true);
        setProgress(0);
        return;
      }
      const nextIdx = playlistIdx + 1;
      if (nextIdx < globalPlaylist.length) {
        setPlaylistIdx(nextIdx);
      } else if (playlistRepeat) {
        setPlaylistIdx(0);
      } else {
        setPlaying(false);
        setProgress(0);
        setPlaylistIdx(-1);
        setGlobalPlaylist([]);
        setCurrentSong(null);
      }
    } else {
      if (repeatOne) {
        // Single song repeat
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        setPlaying(true);
        setProgress(0);
        return;
      }
      setPlaying(false);
      setProgress(0);
      // NE briši currentSong kod single song!
      // onEnded?.();
    }
  };

 

  // Always call hooks at the top level, not conditionally!
  useEffect(() => {
    if (pretplataValid === false && showNoSubMsg) {
      const timer = setTimeout(() => setShowNoSubMsg(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [pretplataValid, showNoSubMsg]);

  // Ako korisnik koji sluša nema pretplatu ili je istekla, prikaži poruku i dugme za kupovinu
  if (pretplataValid === false) {
    if (showNoSubMsg) {
      return (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 3000,
            background: "#232323",
            color: "#ffe6ec",
            padding: "32px 0 36px 0",
            textAlign: "center",
            boxShadow: "0 -4px 24px #b91d9533",
          }}
        >
          <button
            onClick={() => setShowNoSubMsg(false)}
            style={{
              position: "absolute",
              top: 10,
              right: 24,
              background: "none",
              border: "none",
              color: "#ffe6ec",
              fontSize: 28,
              cursor: "pointer",
              lineHeight: 1,
              zIndex: 10,
            }}
            aria-label="Zatvori"
          >
            ×
          </button>
          <div style={{ fontSize: "1.2rem", marginBottom: 16 }}>
            Za slušanje muzike morate imati aktivnu pretplatu.
          </div>
          <button
            style={{
              background: "#b91d95",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 28px",
              fontWeight: 600,
              fontSize: "1.1rem",
              cursor: "pointer"
            }}
            onClick={() => window.location.href = "/profile/subscription"}
          >
            Kupi pretplatu
          </button>
        </div>
      );
    }
    

    return null;
  }

  if (!visible && !minimized) return null;

  // Minimized floating button
  if (minimized) {
    return (
      <button
        className={styles.miniPlayerBtn}
        onClick={onExpand}
        aria-label="Otvori player"
        style={{
          position: "fixed",
          bottom: "32px",
          right: "32px",
          zIndex: 2500,
          boxShadow: "0 4px 24px #b91d9533",
        }}
      >
        <img
          src={currentSong?.putanjaGif || currentSong?.putanjaSlika || "/logo.gif"}
          alt="Decibel"
          className={styles.miniPlayerImg}
        />
        <span className={styles.miniPlayerText}>{currentSong?.naziv || "Pjesma"}</span>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="#ffe6ec" style={{ marginLeft: 6 }}>
          <rect x="8" y="8" width="7" height="22" rx="2" />
          <rect x="23" y="8" width="7" height="22" rx="2" />
        </svg>
        <audio
          ref={audioRef}
          autoPlay={playing}
          controls={false}
          style={{ display: "none" }}
          src={currentSong?.putanjaAudio || ""}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      </button>
    );
  }

  // Mobilni prikaz
  if (isMobile && visible && !minimized) {
    return (
      <div className={styles.audioPlayerBar}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Minimiziraj player"
          type="button"
        >
          {/* ...existing SVG... */}
          <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="13" fill="#232323" />
          <line
            x1="8"
            y1="8"
            x2="18"
            y2="18"
            stroke="#ffe6ec"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="18"
            y1="8"
            x2="8"
            y2="18"
            stroke="#ffe6ec"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        </button>
        <div className={styles.audioInfo}>
          <img
            src={currentSong?.putanjaGif || currentSong?.putanjaSlika || "/logo.gif"}
            alt="Decibel logo"
            className={styles.audioLogo}
          />
          <div className={styles.audioMeta}>
            <div className={styles.audioDetails}>
              <span className={styles.audioArtist}>
                {currentOwner?.korisnicko_ime || "Nepoznati"} -
              </span>
              <span className={styles.audioTitle}>
                {currentSong?.naziv || "Nema pjesme"}
              </span>
            </div>
            <div className={styles.audioTime}>
              {formatTime(progress)} / {formatTime(duration)}
            </div>
          </div>
        </div>
        <div className={styles.audioControls}>
          <button
            className={styles.controlBtn}
            onClick={handlePlayPause}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 40 40" fill="#fff">
              <rect x="8" y="8" width="7" height="22" rx="2" />
              <rect x="23" y="8" width="7" height="22" rx="2" />
            </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 40 40" fill="#fff">
                <polygon points="10,8 32,19 10,30" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={progress}
            step={0.1}
            onChange={handleSeek}
            className={styles.progressBar}
          />
        </div>
        <audio
          ref={audioRef}
          src={currentSong?.putanjaAudio || ""}
          autoPlay={playing}
          controls={false}
          loop={repeatOne && globalPlaylist.length === 0}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={() => {
            if (audioRef.current) {
              audioRef.current.volume = volume;
              audioRef.current.muted = muted;
            }
          }}
          onEnded={handleEnded}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  return (
    <div className={styles.audioPlayerBar}>
      <button
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Minimiziraj player"
        type="button"
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="13" fill="#232323" />
          <line
            x1="8"
            y1="8"
            x2="18"
            y2="18"
            stroke="#ffe6ec"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="18"
            y1="8"
            x2="8"
            y2="18"
            stroke="#ffe6ec"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className={styles.audioInfo}>
        <img
          src={currentSong?.putanjaGif || currentSong?.putanjaSlika || "/logo.gif"}
          alt="Decibel logo"
          className={styles.audioLogo}
        />
        <div className={styles.audioMeta}>
          <div className={styles.audioDetails}>
            <Link to={`/izvodjac/${currentOwner?.id}`}>
            <span className={styles.audioArtist}>
              {currentOwner?.korisnicko_ime || "Nepoznati korisnik"} -
            </span>
            </Link>
            <Link to={currentSong?.id ? `/pjesma/${currentSong.id}` : "#"}>
              <span className={styles.audioTitle}>
                {currentSong?.naziv || "Trenutno nema pjesme"}
              </span>
            </Link>

             {pjesma && korisnik?.id && (
              <button
                style={{
                  marginLeft: -10,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  verticalAlign: "middle",
                  outline: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                onClick={handleLike}
                title={liked ? "Ukloni lajk" : "Lajkuj pjesmu"}
              >
                <svg width="22" height="22" viewBox="0 0 28 28" fill={liked ? "#e754a2" : "#fff"}>
                  <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                </svg>
              </button>
            )}
          </div>
          <div className={styles.audioTime}>
            {formatTime(progress)} / {formatTime(duration)}
          </div>
        </div>
      </div>
      <div className={styles.audioControls}>
        <button
          className={styles.controlBtn}
          onClick={handlePlayPause}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="#fff">
              <rect x="8" y="8" width="7" height="22" rx="2" />
              <rect x="23" y="8" width="7" height="22" rx="2" />
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="#fff">
              <polygon points="10,8 32,19 10,30" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={progress}
          step={0.1}
          onChange={handleSeek}
          className={styles.progressBar}
        />
      </div>
      <div className={styles.audioExtras}>
        <label className={styles.labelSmall}>
          {t("fast")}
          <select
            value={playbackRate}
            onChange={handleRateChange}
            className={styles.rateSelect}
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </label>
        {/* Repeat one button */}
        <button
          type="button"
          className={styles.muteBtn}
          onClick={handleRepeatToggle}
          aria-label={repeatOne ? "Ponovi ovu pjesmu" : "Ponovi jednu pjesmu"}
          style={{ marginLeft: 16, marginRight: 8 }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <g>
              <path d="M7 14v-2a7 7 0 0 1 7-7h4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              <path d="M21 7l-2-2-2 2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              <path d="M21 14v2a7 7 0 0 1-7 7h-4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              <path d="M7 21l2 2 2-2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              {repeatOne && (
                <text x="13" y="19" fontSize="10" fill="#ffe6ec" fontWeight="bold">
                  1
                </text>
              )}
            </g>
          </svg>
        </button>
        <button
          type="button"
          className={styles.muteBtn}
          onClick={handleRepeatAllToggle}
          aria-label={playlistRepeat ? "Ponovi cijeli album/playlistu" : "Ponovi album/playlistu"}
          style={{ marginLeft: 2, marginRight: 8 }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <g>
              <path d="M7 14v-2a7 7 0 0 1 7-7h4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              <path d="M21 7l-2-2-2 2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              <path d="M21 14v2a7 7 0 0 1-7 7h-4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              <path d="M7 21l2 2 2-2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
              {playlistRepeat && (
                <circle cx="23" cy="5" r="3" fill="#2f0650ff" />
              )}
            </g>
          </svg>
        </button>
        <button
          type="button"
          className={styles.muteBtn}
          onClick={() => setShowPlaylistModal(true)}
          aria-label="Dodaj u playlistu"
          style={{ marginLeft: 8 }}
        >
          <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec">
            <rect x="18" y="8" width="8" height="28" />
            <rect x="8" y="18" width="28" height="8" />
          </svg>
        </button>
        <label className={styles.labelSmall} style={{ marginLeft: 8 }}>
          <button
            type="button"
            className={styles.muteBtn}
            onClick={handleMuteToggle}
            aria-label={muted ? "Unmute" : "Mute"}
            tabIndex={0}
          >
            {muted || volume === 0 ? (
              // Mute ikona
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="#ffe6ec"
                style={{ verticalAlign: "middle" }}
              >
                <path d="M3 9v4h4l5 5V4L7 9H3z" />
                <line x1="17" y1="7" x2="21" y2="15" stroke="#ffe6ec" strokeWidth="2" />
                <line x1="21" y1="7" x2="17" y2="15" stroke="#ffe6ec" strokeWidth="2" />
              </svg>
            ) : (
              // Zvuk ikona
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="#ffe6ec"
                style={{ verticalAlign: "middle" }}
              >
                <path d="M3 9v4h4l5 5V4L7 9H3z" />
                <path d="M16.5 12c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5v3z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={0.30}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className={styles.volumeBar}
          />
        </label>
      </div>
      {/* Modal za dodavanje u playlistu */}
      {showPlaylistModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(24,24,24,0.85)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowPlaylistModal(false)}
        >
          <div
            style={{
              background: "#232323",
              borderRadius: 14,
              padding: "32px 24px 24px 24px",
              minWidth: 320,
              boxShadow: "0 4px 24px #b91d9533",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ color: "#fff", marginBottom: 18 }}>{t("add_song_to_playlist")}</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 18 }}>
              {playlists.map((pl) => (
                <li key={pl.id} style={{ marginBottom: 8 }}>
                  <button
                    style={{
                      background: "#b91d95",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 0",
                      fontSize: "1.08rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      transition: "background 0.18s",
                    }}
                    onClick={() => handleAddToPlaylist(pl.id)}
                  >
                    {pl.naziv}
                  </button>
                </li>
              ))}
            </ul>
            <button
              style={{
                background: "#232323",
                color: "#ffe6ec",
                border: "1px solid #b91d95",
                borderRadius: 8,
                padding: "10px 0",
                fontSize: "1rem",
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
                transition: "background 0.18s, color 0.18s",
              }}
              onClick={() => setShowPlaylistModal(false)}
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
      <audio
        ref={audioRef}
        src={currentSong?.putanjaAudio || ""}
        autoPlay={playing}
        controls={false}
        loop={repeatOne && globalPlaylist.length === 0}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={() => {
          if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.muted = muted;
          }
        }}
        onEnded={handleEnded}
        style={{ display: "none" }}
      />
    </div>
  );
};

function formatTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default AudioPlayer;


