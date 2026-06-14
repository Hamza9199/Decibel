import React, { useEffect, memo } from "react";
import styles from "./Loading.module.css";
import { useTranslation } from "react-i18next";

const Loading: React.FC = () => {
    const { t } = useTranslation();

  useEffect(() => {
   
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className={styles.loadingWrap} aria-live="polite" aria-busy>
      <div className={styles.notes}>
        <span className={styles.note} style={{ left: "0%" }} />
        <span className={styles.note} style={{ left: "30%" }} />
        <span className={styles.note} style={{ left: "60%" }} />
      </div>
      <div className={styles.text}>{t("loading")}</div>
    </div>
  );
};

export default memo(Loading);
