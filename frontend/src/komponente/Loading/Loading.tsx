import React from "react";
import styles from "./Loading.module.css";

const Loading: React.FC = () => (
  <div className={styles.loadingWrap}>
    <div className={styles.notes}>
      <span className={styles.note} style={{ left: "0%" }} />
      <span className={styles.note} style={{ left: "30%" }} />
      <span className={styles.note} style={{ left: "60%" }} />
    </div>
    <div className={styles.text}>Učitavanje...</div>
  </div>
);

export default Loading;
