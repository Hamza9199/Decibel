import React from "react";
import styles from "./Postavke.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";


const Postavke: React.FC = () => {






  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.settingsBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Postavke stranice</h2>
          <div className={styles.form}>
            <div className={styles.label}>
              <span>Izgled aplikacije:</span>
              <select className={styles.input} disabled>
                <option>Svijetli (uskoro)</option>
                <option>Tamni</option>
              </select>
            </div>
            <div className={styles.label}>
              <span>Jezik:</span>
              <select className={styles.input} disabled>
                <option>Bosanski/Srpski/Hrvatski</option>
                <option>English (uskoro)</option>
              </select>
            </div>
            <div className={styles.label}>
              <span>Obavijesti:</span>
              <input type="checkbox" checked disabled />{" "}
              <span style={{ marginLeft: 8 }}>
                Uključi obavijesti (uskoro)
              </span>
            </div>
            <div className={styles.label}>
              <span>Automatska reprodukcija:</span>
              <input type="checkbox" checked disabled />{" "}
              <span style={{ marginLeft: 8 }}>
                Uključi autoplay (uskoro)
              </span>
            </div>
            <div
              className={styles.label}
              style={{
                marginTop: 24,
                color: "#b3b3b3",
                fontSize: "0.98rem",
              }}
            >
              Ovdje će biti dodatne postavke aplikacije (tema, jezik, obavijesti,
              privatnost, itd.).
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Postavke;
           
