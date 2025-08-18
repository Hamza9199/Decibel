import React, { useEffect, useRef,memo } from "react";
import { createPortal } from "react-dom";
import styles from "./Loading.module.css";

const Loading: React.FC = () => {
  const elRef = useRef<HTMLDivElement | null>(null);
  if (!elRef.current) elRef.current = document.createElement("div");

  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      try {
        document.body.removeChild(el);
      } catch {
        // ignore
      }
    };
  }, []);

  return createPortal(
    <div className={styles.loadingWrap} aria-live="polite" aria-busy>
      <div className={styles.notes}>
        <span className={styles.note} style={{ left: "0%" }} />
        <span className={styles.note} style={{ left: "30%" }} />
        <span className={styles.note} style={{ left: "60%" }} />
      </div>
      <div className={styles.text}>Učitavanje...</div>
    </div>,
    elRef.current!
  );
};

export default memo(Loading);
