import React, { useRef, useEffect } from "react";
import styles from "./AudioPlayer.module.css";

type Props = {
  src?: string;
  title?: string;
  visible: boolean;
  onEnded?: () => void;
};

const AudioPlayer: React.FC<Props> = ({ src, title, visible, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && src) {
      audioRef.current.src = src;
      audioRef.current.play().catch(() => {});
    }
  }, [src]);

  if (!visible) return null;

  return (
    <div className={styles.audioPlayerBar}>
      <div className={styles.audioInfo}>
        <span className={styles.audioTitle}>{title || "Trenutno nema pjesme"}</span>
      </div>
      <audio
        ref={audioRef}
        className={styles.audio}
        controls
        onEnded={onEnded}
        style={{ width: "100%" }}
      />
    </div>
  );
};

export default AudioPlayer;
