import React from "react";
import styles from "./Footer.module.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer: React.FC = () => {
  const { t } = useTranslation();
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
        © {new Date().getFullYear()} Decibel.{" "}
        {t("all_rights_reserved") || "Sva prava zadržana."}
      </span>
      <div className={styles.footerLinks}>
        <a
          href="https://github.com/ajaykrsingh/decibel"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          GitHub
        </a>
        <a href="mailto:kontakt@decibel.com" className={styles.footerLink}>
          {t("contact") || "Kontakt"}
        </a>
      </div>
    </footer>
  );
};

export default Footer;
