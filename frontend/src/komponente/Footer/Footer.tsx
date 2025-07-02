import React from "react";
import styles from "./Footer.module.css";

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} Decibel. Sva prava zadržana.</span>
    </footer>
  );
};

export default Footer;
