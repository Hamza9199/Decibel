import React from "react";
import styles from "./Footer.module.css";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
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
        © {new Date().getFullYear()} Decibel. Sva prava zadržana.
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
        <a
          href="mailto:kontakt@decibel.com"
          className={styles.footerLink}
        >
          Kontakt
        </a>
      </div>
    </footer>
  );
};

export default Footer;
