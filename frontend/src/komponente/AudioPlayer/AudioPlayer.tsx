import { useEffect, useRef, useState, memo, useMemo, useCallback } from "react";
import styles from "./AudioPlayer.module.css";
import axios from "axios";
import { Korisnik, Playlista, Pjesma, KorisnikPretplata } from "../../types";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from '../../config/queryClient';

type Props = {
  id?: number;
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

type MediaSessionWithPositionState = MediaSession & {
  setPositionState?: (state: { duration?: number; playbackRate?: number; position?: number }) => void;
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
  const [currentSong, setCurrentSong] = useState<Pjesma | null>(null);
  const [currentOwner, setCurrentOwner] = useState<Korisnik | undefined>(undefined);
  const [pretplataValid, setPretplataValid] = useState<boolean | null>(null);
  const [showNoSubMsg, setShowNoSubMsg] = useState(true);
  const location = useLocation();
  const isMobile = useMemo(() => window.innerWidth <= 480, []);


  const slusacID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  const pretplateQuery = useQuery({
    queryKey: ["korisnik_pretplata"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/korisnik_pretplata/`);
      return (res.data || []) as KorisnikPretplata[];
    },
    enabled: !!slusacID,
  });

  useEffect(() => {
    if (!slusacID) {
      setPretplataValid(false);
      return;
    }
    if (pretplateQuery?.data) {
      const moja = pretplateQuery.data.find((p) => p.korisnikID === slusacID);
      setPretplataValid(!!(moja && moja.datumIsteka && new Date(moja.datumIsteka) > new Date()));
    } else if (pretplateQuery.isError) {
      setPretplataValid(false);
    }
  }, [pretplateQuery.data, pretplateQuery.isError, slusacID]);

  const korisnikQuery = useQuery({
    queryKey: ["korisnik", korisnikID],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/korisnici/${korisnikID}`);
      return res.data as Korisnik;
    },
    enabled: !!korisnikID,
  });
  useEffect(() => {
    if (korisnikQuery.data) setKorisnik(korisnikQuery.data);
    if (korisnikQuery.isError) setKorisnik(undefined);
  }, [korisnikQuery.data, korisnikQuery.isError]);

  const playlistsQuery = useQuery({
    queryKey: ["playliste", korisnikID],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/playliste/`);
      return (res.data || []) as Playlista[];
    },
    enabled: !!korisnikID,
  });
  useEffect(() => {
    if (playlistsQuery.data) setPlaylists(playlistsQuery.data);
    if (playlistsQuery.isError) setPlaylists([]);
  }, [playlistsQuery.data, playlistsQuery.isError]);

  const pjesmaQuery = useQuery({
    queryKey: ["pjesmaBySrc", src],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/pjesme/`);
      const list = (res.data as Pjesma[]) || [];
      return list.find((p: Pjesma) => p.putanjaAudio === src);
    },
    enabled: !!src,
  });
  useEffect(() => {
    if (pjesmaQuery.data !== undefined) {
      setPjesma(pjesmaQuery.data);
      if (!pjesmaQuery.data) setLiked(false);
    }
    if (pjesmaQuery.isError) {
      setPjesma(undefined);
      setLiked(false);
    }
  }, [pjesmaQuery.data, pjesmaQuery.isError]);

  const likedQuery = useQuery({
    queryKey: ["korisnik_pjesma_liked", korisnik?.id, pjesma?.id],
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const veze = r.data as { korisnikID: string; pjesmaID: number }[];
      return !!veze.find((v) => v.korisnikID === korisnik?.id && v.pjesmaID === pjesma?.id);
    },
    enabled: !!korisnik?.id && !!pjesma?.id,
  });
  useEffect(() => {
    if (likedQuery.data !== undefined) setLiked(!!likedQuery.data);
    if (likedQuery.isError) setLiked(false);
  }, [likedQuery.data, likedQuery.isError]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!pjesma || !korisnik?.id) return;
      await axios
        .post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: korisnik.id,
          pjesmaID: pjesma.id,
          kreiranDatumVrijeme: new Date().toISOString(),
        })
        .catch(() => {});
    },
    onSuccess: () => {
      setLiked(true);
      queryClient.invalidateQueries({
        queryKey: ["korisnik_pjesma_liked", korisnik?.id, pjesma?.id],
      });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      if (!pjesma || !korisnik?.id) return;
      await axios
        .delete(`${API_BASE}/korisnik_pjesma/${korisnik.id}/${pjesma.id}`)
        .catch(() => {});
    },
    onSuccess: () => {
      setLiked(false);
      queryClient.invalidateQueries({
        queryKey: ["korisnik_pjesma_liked", korisnik?.id, pjesma?.id],
      });
    },
  });

  const historijaMutation = useMutation({
    mutationFn: async ({
      userId,
      pjesmaId,
      trajanje,
    }: {
      userId: string;
      pjesmaId: number;
      trajanje: number;
    }) => {
      await axios
        .delete(`${API_BASE}/historija/obrisi/${userId}/${pjesmaId}`)
        .catch(() => {});
      await axios.post(`${API_BASE}/historija/`, {
        korisnikID: userId,
        pjesmaID: pjesmaId,
        playlistaID: null,
        kreiranDatumVrijeme: new Date().toISOString(),
        trajanje,
        kontekstPustanjaURL: null,
        offline: false,
        kontekstPustanja: null,
      });
    },
  });

  const statistikaMutation = useMutation({
    mutationFn: async (payload: {
      korisnikID: string;
      pjesmaID: number;
      ukupnoTrajanje: number;
    }) => {
      await axios
        .post(`${API_BASE}/statistika/`, {
          korisnikID: payload.korisnikID,
          pjesmaID: payload.pjesmaID,
          brojReprodukcija: 1,
          ukupnoTrajanje: payload.ukupnoTrajanje,
          zadnjePustanje: new Date().toISOString(),
        })
        .catch(() => {});

      await axios
        .put(`${API_BASE}/pjesme/${payload.pjesmaID}`, {
          ...pjesma,
          brojReprodukcija: (pjesma?.brojReprodukcija || 0) + 1,
        })
        .catch(() => {});
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async (playlistaID: number) => {
      if (!pjesma?.id) throw new Error("No song");
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: pjesma.id,
        playlistaID,
      });
    },
    onSuccess: () => {
      setShowPlaylistModal(false);
      alert("Pjesma dodana u playlistu!");
    },
    onError: (error: unknown) => {
      const detail =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      alert(detail || "Greška pri dodavanju pjesme u playlistu.");
      setShowPlaylistModal(false);
    },
  });

  const ownerQuery = useQuery({
    queryKey: ["owner", currentSong?.korisnikID],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/korisnici/${currentSong?.korisnikID}`);
      return res.data as Korisnik;
    },
    enabled: !!currentSong?.korisnikID,
  });
  useEffect(() => {
    if (ownerQuery.data) setCurrentOwner(ownerQuery.data);
    if (ownerQuery.isError) setCurrentOwner(undefined);
  }, [ownerQuery.data, ownerQuery.isError]);

  useEffect(() => {
    let isMounted = true;
    if (!slusacID) {
      setPretplataValid(false);
      return;
    }
    if (isMounted) {
      const moja = pretplateQuery.data?.find((p) => p.korisnikID === slusacID);
      setPretplataValid(!!(moja && moja.datumIsteka && new Date(moja.datumIsteka) > new Date()));
    }
    return () => {
      isMounted = false;
    };
  }, [slusacID, pretplateQuery.data]);

  useEffect(() => {
    const handler = () => setShowNoSubMsg(false);
    window.addEventListener("hideSubscriptionMsg", handler);
    return () => window.removeEventListener("hideSubscriptionMsg", handler);
  }, []);

  useEffect(() => {
    if (pretplataValid === false && showNoSubMsg) {
      const timer = setTimeout(() => setShowNoSubMsg(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [pretplataValid, showNoSubMsg]);

  useEffect(() => {
    setShowNoSubMsg(true);
  }, [location.pathname]);

  useEffect(() => {
    if (audioRef.current && src) {
      if (audioRef.current.src !== src) {
        audioRef.current.src = src;
        audioRef.current.load();
        audioRef.current.volume = 0.3; 
        setPlaying(true);
        setProgress(0);
        setLastSrc(src);
      } else if (!playing) {
        setPlaying(true);
      }
    }
    // eslint-disable-next-line
  }, [src, globalPlaylist.length]);

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

  useEffect(() => {
    if (pretplataValid === false) return;
    if (audioRef.current) {
      audioRef.current.volume = Number(volume); 
      audioRef.current.muted = muted;
    }
  }, [volume, muted, minimized,pretplataValid]);

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

  useEffect(() => {
    if (pretplataValid === false) return;
    if (!minimized && wasMinimized && audioRef.current) {
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
    }
  }, [src]);

  useEffect(() => {
    if (!pjesma || !korisnik?.id || !playing || !src) {
      setStatistikaSent(false);
      return;
    }
    if (progress < 30 || statistikaSent) return;

    statistikaMutation.mutate({
      korisnikID: korisnik.id,
      pjesmaID: pjesma.id,
      ukupnoTrajanje: pjesma.trajanjeSekunde || 0,
    });
    setStatistikaSent(true);
    // eslint-disable-next-line
  }, [progress, pjesma, korisnik?.id, statistikaSent, src]);

  useEffect(() => {
    setStatistikaSent(false);
  }, [src]);

  useEffect(() => {
    if (!pjesma || !korisnik?.id || !src) return;
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      historijaMutation.mutate({
        userId: user?.id,
        pjesmaId: pjesma.id,
        trajanje: pjesma.trajanjeSekunde || 0,
      });
    } catch {
      console.error("Failed to add pjesma to historija");
    }
    // eslint-disable-next-line
  }, [pjesma?.id, korisnik?.id, src]);

  const handlePlayPause = useCallback(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0 && playlistIdx < globalPlaylist.length) {
      setPlaying((p) => !p);
    } else if (globalPlaylist.length === 0 && src) {
      setPlaying((p) => !p);
    }
  }, [globalPlaylist.length, playlistIdx, src]);

  const handleLike = useCallback(() => {
    if (!pjesma || !korisnik?.id) return;
    if (liked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  }, [pjesma, korisnik?.id, liked, unlikeMutation, likeMutation]);

  const handleAddToPlaylist = useCallback((playlistaID: number) => {
    if (!src || !korisnikID || !pjesma?.id) return;
    addToPlaylistMutation.mutate(playlistaID);
  }, [src, korisnikID, pjesma?.id, addToPlaylistMutation]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
  }, []);

  const handleRateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlaybackRate(Number(e.target.value));
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (muted && val > 0) setMuted(false);
  }, [muted]);

  const handleMuteToggle = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const handleRepeatAllToggle = useCallback(() => {
    setPlaylistRepeat((prev) => !prev);
    if (repeatOne) setRepeatOne(false);
  }, [repeatOne]);

  const handleRepeatToggle = useCallback(() => {
    setRepeatOne((prev) => {
      if (!prev) setPlaylistRepeat(false);
      return !prev;
    });
  }, []);

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
    if (globalPlaylist.length === 0 && src) {
      setCurrentSong((prev) => {
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
  }, [src, id, title, putanjaGif, putanjaSlika, korisnikID, globalPlaylist.length]);

  // Remove axios owner fetch; rely on query for owner and clear when no korisnikID
  useEffect(() => {
    if (!currentSong?.korisnikID) {
      setCurrentOwner(undefined);
    }
  }, [currentSong?.korisnikID]);

  useEffect(() => {
    if (currentSong) {
      const bgGif = currentSong.putanjaGif;
      const bgSlika = currentSong.putanjaSlika;
      console.log('AudioPlayer dispatching background change:', { gif: bgGif, slika: bgSlika }); // Debug log
      window.dispatchEvent(
        new CustomEvent("activeSongBg", { detail: { gif: bgGif, slika: bgSlika } })
      );
    } else {
      console.log('AudioPlayer resetting background - no current song'); // Debug log
      window.dispatchEvent(new CustomEvent("activeSongBg", { detail: {} }));
    }
  }, [currentSong, currentSong?.putanjaGif, currentSong?.putanjaSlika]);

  useEffect(() => {
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

  const handleEnded = useCallback(() => {
    if (globalPlaylist.length > 0 && playlistIdx >= 0) {
      if (repeatOne) {
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
    }
  }, [globalPlaylist.length, playlistIdx, repeatOne, playlistRepeat]);

  useEffect(() => {
    if (pretplataValid === false && showNoSubMsg) {
      const timer = setTimeout(() => setShowNoSubMsg(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [pretplataValid, showNoSubMsg]);


    useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [playing]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.naziv || '',
        artist: currentOwner?.korisnicko_ime || '',
        album: '',
        artwork: [
          {
            src: currentSong.putanjaSlika || currentSong.putanjaGif || '/logo.gif',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });
    }
  }, [currentSong, currentOwner]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try { ms.setActionHandler('play', () => setPlaying(true)); } catch {
      console.log('The play action is not supported.');
    }
    try { ms.setActionHandler('pause', () => setPlaying(false)); } catch {
      console.log('The pause action is not supported.');
    }
    try { ms.setActionHandler('stop', () => { setPlaying(false); if (audioRef.current){ audioRef.current.pause(); audioRef.current.currentTime = 0; }}); } catch {
      console.log('The stop action is not supported.');
    }
    try { ms.setActionHandler('previoustrack', () => { if (globalPlaylist.length>0){ if (playlistIdx>0) setPlaylistIdx(i=>i-1); else if (playlistRepeat && globalPlaylist.length>0) setPlaylistIdx(globalPlaylist.length-1); }}); } catch {
      console.log('The previoustrack action is not supported.');
    }
    try { ms.setActionHandler('nexttrack', () => { if (globalPlaylist.length>0){ if (playlistIdx+1<globalPlaylist.length) setPlaylistIdx(i=>i+1); else if (playlistRepeat) setPlaylistIdx(0); }}); } catch {
      console.log('The nexttrack action is not supported.');
    }
    try { ms.setActionHandler('seekbackward', () => { if (audioRef.current){ audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }}); } catch {
      console.log('The seekbackward action is not supported.');
    }
    try { ms.setActionHandler('seekforward', () => { if (audioRef.current){ const d = audioRef.current.duration || 0; audioRef.current.currentTime = Math.min(d, audioRef.current.currentTime + 10); }}); } catch {
      console.log('The seekforward action is not supported.');
    }
    try { ms.setActionHandler('seekto', (details: MediaSessionActionDetails) => { if (audioRef.current && details.seekTime != null){ audioRef.current.currentTime = details.seekTime; }}); } catch {
      console.log('The seekto action is not supported.');
    }
  }, [globalPlaylist.length, playlistIdx, playlistRepeat]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if ((navigator.mediaSession as MediaSessionWithPositionState).setPositionState && isFinite(duration)) {
      try { navigator.mediaSession.setPositionState({ duration: duration || 0, playbackRate, position: progress }); } catch {
      console.log('Failed to set position state.');
      }
    }
  }, [progress, duration, playbackRate]);


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

   if (isMobile && visible && !minimized) {
    return (
      <div className={styles.audioPlayerBar}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Minimiziraj player"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 26 26" fill="none">
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
        
        <img
          src={currentSong?.putanjaGif || currentSong?.putanjaSlika || "/logo.gif"}
          alt="Decibel logo"
          className={styles.audioLogo}
        />
        
        <div className={styles.audioMeta}>
          <div className={styles.audioDetails}>
            <Link to={`/izvodjac/${currentOwner?.id}`}>
              <span className={styles.audioArtist}>
                {currentOwner?.korisnicko_ime || "Nepoznati korisnik"}
              </span>
            </Link>
            <Link to={currentSong?.id ? `/pjesma/${currentSong.id}` : "#"}>
              <span className={styles.audioTitle}>
                {currentSong?.naziv || "Trenutno nema pjesme"}
              </span>
            </Link>
          </div>
          <div className={styles.audioTime}>
            {formatTime(progress)} / {formatTime(duration)}
          </div>
        </div>
        
        <div className={styles.audioControls}>
          <button
            className={styles.controlBtn}
            onClick={handlePlayPause}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 40 40" fill="#fff">
                <rect x="8" y="8" width="7" height="22" rx="2" />
                <rect x="23" y="8" width="7" height="22" rx="2" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 40 40" fill="#fff">
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
          <div className={styles.mobileControlsRow}>
            <div className={styles.mobileControlsLeft}>
              <button
                type="button"
                className={styles.muteBtn}
                onClick={handleMuteToggle}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 22 22"
                    fill="#ffe6ec"
                  >
                    <path d="M3 9v4h4l5 5V4L7 9H3z" />
                    <line x1="17" y1="7" x2="21" y2="15" stroke="#ffe6ec" strokeWidth="2" />
                    <line x1="21" y1="7" x2="17" y2="15" stroke="#ffe6ec" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 22 22"
                    fill="#ffe6ec"
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
            </div>
            
            <div className={styles.mobileControlsRight}>
              <button
                type="button"
                className={styles.muteBtn}
                onClick={handleRepeatToggle}
                aria-label={repeatOne ? "Ponovi ovu pjesmu" : "Ponovi jednu pjesmu"}
              >
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                  <g>
                    <path d="M7 14v-2a7 7 0 0 1 7-7h4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 7l-2-2-2 2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 14v2a7 7 0 0 1-7 7h-4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M7 21l2 2 2-2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    {repeatOne && (
                      <text x="10" y="17" fontSize="6" fill="#ffe6ec" fontWeight="bold">
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
              >
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                  <g>
                    <path d="M7 14v-2a7 7 0 0 1 7-7h4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 7l-2-2-2 2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 14v2a7 7 0 0 1-7 7h-4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M7 21l2 2 2-2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    {playlistRepeat && (
                      <circle cx="23" cy="5" r="2" fill="#2f0650ff" />
                    )}
                  </g>
                </svg>
              </button>
              
              <button
                type="button"
                className={styles.muteBtn}
                onClick={() => setShowPlaylistModal(true)}
                aria-label="Dodaj u playlistu"
              >
                <svg width="14" height="14" viewBox="0 0 44 44" fill="#ffe6ec">
                  <rect x="18" y="8" width="8" height="28" />
                  <rect x="8" y="18" width="28" height="8" />
                </svg>
              </button>
              
              <label className={styles.labelSmall}>
                <select
                  value={playbackRate}
                  onChange={handleRateChange}
                  className={styles.rateSelect}
                  aria-label="Brzina"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </label>
            </div>
          </div>
        </div>
        
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
                padding: "24px 16px 16px 16px",
                minWidth: 280,
                maxWidth: "90vw",
                boxShadow: "0 4px 24px #b91d9533",
                textAlign: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 style={{ color: "#fff", marginBottom: 16, fontSize: "1rem" }}>
                {t("add_song_to_playlist")}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 16 }}>
                {playlists.map((pl) => (
                  <li key={pl.id} style={{ marginBottom: 6 }}>
                    <button
                      style={{
                        background: "#b91d95",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 0",
                        fontSize: "0.9rem",
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
                  borderRadius: 6,
                  padding: "8px 0",
                  fontSize: "0.9rem",
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
              borderRadius: 8,
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

export default memo(AudioPlayer);