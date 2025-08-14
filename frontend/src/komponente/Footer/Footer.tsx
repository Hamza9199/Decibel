import React, { memo, useMemo } from "react";
import styles from "./Footer.module.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const year = useMemo(() => new Date().getFullYear(), []);
  

  return (
    <footer className={styles.footer}>
      <Link to="/">
        <img
          src="/logo.gif"
          alt="Decibel logo"
          className={styles.footerLogo}
          style={{ height: "38px" }}
        />
      </Link>
      <span className={styles.footerText}>
        © {year} Decibel. {t("all_rights_reserved") || "Sva prava zadržana."}
      </span>

      
      <div className={styles.footerLinks}>
        <a
          href="https://github.com/Hamza9199/Decibel"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          GitHub
        </a>
        <a
          href="mailto:kontakt@decibel.com"
          className={styles.footerLink}
        >
          {t("contact") || "Kontakt"}
        </a>
      </div>
    </footer>
  );
};

export default memo(Footer);
