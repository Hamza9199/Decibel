import React, { useRef, useEffect, useState } from "react";
import styles from "./AudioPlayer.module.css";
import axios from "axios";
import { Korisnik } from "../../types";

type Props = {
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
  src,
  title,
  putanjaGif,
  putanjaSlika,
  korisnikID,
  visible,
  onEnded,
  onClose,
  minimized,
  onExpand,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [korisnik, setKorisnik] = useState<Korisnik>();
  const [lastSrc, setLastSrc] = useState<string | undefined>(undefined);
  const [wasMinimized, setWasMinimized] = useState(false);

  // Sync audio src and play new song immediately
  useEffect(() => {
    if (audioRef.current && src) {
      if (audioRef.current.src !== src) {
        audioRef.current.src = src;
        audioRef.current.load();
        setPlaying(true);
        setProgress(0);
        setLastSrc(src);
      } else if (!playing) {
        setPlaying(true);
      }
    }
    // eslint-disable-next-line
  }, [src]);

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
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync volume and muted state always, including on minimize/maximize
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted, minimized]);

  // When minimized, keep audio playing in background and keep progress/volume
  useEffect(() => {
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
    if (audioRef.current && src && playing && audioRef.current.src !== src) {
      audioRef.current.src = src;
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
      setProgress(0);
      setLastSrc(src);
    }
    // eslint-disable-next-line
  }, [src, playing]);

  const handlePlayPause = () => {
    setPlaying((p) => !p);
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
    setVolume(Number(e.target.value));
    if (muted && Number(e.target.value) > 0) setMuted(false);
  };

  const handleMuteToggle = () => {
    setMuted((m) => !m);
  };

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
          src={putanjaGif || putanjaSlika || "/logo.gif"}
          alt="Decibel"
          className={styles.miniPlayerImg}
        />
        <span className={styles.miniPlayerText}>{title || "Pjesma"}</span>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="#ffe6ec" style={{ marginLeft: 6 }}>
          <rect x="8" y="8" width="7" height="22" rx="2" />
          <rect x="23" y="8" width="7" height="22" rx="2" />
        </svg>
        <audio
          ref={audioRef}
          autoPlay={playing}
          controls={false}
          style={{ display: "none" }}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
            onEnded?.();
          }}
        />
      </button>
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
          src={putanjaGif || putanjaSlika || "/logo.gif"}
          alt="Decibel logo"
          className={styles.audioLogo}
        />
        <div className={styles.audioMeta}>
          <div className={styles.audioDetails}>
            <span className={styles.audioArtist}>
              {korisnik?.korisnicko_ime || "Nepoznati korisnik"}
            </span>
            <span className={styles.audioTitle}>
              {title || "Trenutno nema pjesme"}
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
          Brzina:
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
        <label className={styles.labelSmall} style={{ marginLeft: 18 }}>
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
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className={styles.volumeBar}
          />
        </label>
      </div>
      <audio
        ref={audioRef}
        src={src}
        autoPlay={playing}
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          onEnded?.();
        }}
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
