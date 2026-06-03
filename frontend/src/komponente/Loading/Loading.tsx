import React, { useEffect, memo } from "react";
import styles from "./Loading.module.css";

const Loading: React.FC = () => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className={styles.loadingWrap} aria-live="polite" aria-busy>
      <div className={styles.notes}>
        <span className={styles.note} style={{ left: "0%" }} />
        <span className={styles.note} style={{ left: "30%" }} />
        <span className={styles.note} style={{ left: "60%" }} />
      </div>
      <div className={styles.text}>Učitavanje...</div>
    </div>
  );
};

export default memo(Loading);
