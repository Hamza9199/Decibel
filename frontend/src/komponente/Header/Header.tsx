import React from "react";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>Decibel</div>
      {/* Dodaj ovde navigaciju ili dugmad po potrebi */}
    </header>
  );
};

export default Header;
