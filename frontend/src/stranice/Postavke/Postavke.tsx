import React, { useState } from "react";
import styles from "./Postavke.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";

const Postavke: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [poruka, setPoruka] = useState("");
  const [brisanje, setBrisanje] = useState(false);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
    setBrisanje(false);
  };

  const handleOpenBrisanje = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
    setBrisanje(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPoruka("");
  };

  const handlePorukaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPoruka(e.target.value);
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

  const handleSend = async () => {
    // Slanje prijave na backend
    let korisnikID = "";
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      korisnikID = user?.id || "";
    } catch {
      korisnikID = "";
    }
    if (!poruka.trim() || !korisnikID) {
      alert("Morate unijeti poruku i biti prijavljeni.");
      return;
    }
    try {
      await axios.post(`${API_BASE}/prijave_izvodjaca/`, {
        korisnikID,
        poruka,
        datum: new Date().toISOString(),
      });
      alert("Prijava je uspješno poslana!");
    } catch {
      alert("Greška pri slanju prijave.");
    }
    handleCloseModal();
  };

  const handleBrisanje = async () => {
    let korisnikID = "";
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      korisnikID = user?.id || "";
    } catch {
      korisnikID = "";
    }
    if (!korisnikID) {
      alert("Morate biti prijavljeni.");
      return;
    }
    if (!window.confirm("Da li ste sigurni da želite obrisati svoj nalog? Vaš nalog će biti deaktiviran.")) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/korisnici/${korisnikID}`);
      localStorage.removeItem("korisnik");
      alert("Vaš nalog je deaktiviran.");
      window.location.href = "/login";
    } catch {
      alert("Greška pri deaktivaciji naloga.");
    }
    handleCloseModal();
  };

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
            <div className={styles.label}>
              <span>Prijava za izvođača:</span>
              <span style={{ marginLeft: 8 }}>
                <a
                  href="#"
                  className={styles.link}
                  style={{ color: "#1e90ff" }}
                  onClick={handleOpenModal}
                >
                  Prijavi se ovdje
                </a>
              </span>
            </div>
             <div className={styles.label}>
              <span>Obrisi profil:</span>
              <span style={{ marginLeft: 8 }}>
                <a
                  href="#"
                  className={styles.link}
                  style={{ color: "#1e90ff" }}
                  onClick={handleOpenBrisanje}
                >
                  Brisanje
                </a>
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
      {/* Modalni prozor */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#222",
              padding: 24,
              borderRadius: 8,
              minWidth: 320,
              maxWidth: 400,
              color: "#fff",
              boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {!brisanje ? (
              <>
                <h3 style={{ margin: 0 }}>Prijava za izvođača</h3>
                <label>
                  Zašto bi baš vas izabrali? (Napišite bitne informacije)
                  <textarea
                    value={poruka}
                    onChange={handlePorukaChange}
                    rows={5}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      borderRadius: 4,
                      border: "1px solid #444",
                      padding: 8,
                      resize: "vertical",
                      background: "#181818",
                      color: "#fff",
                    }}
                    placeholder="Npr. iskustvo, žanr, linkovi, kontakt..."
                  />
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      background: "#444",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!poruka.trim()}
                    style={{
                      background: "#1e90ff",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 16px",
                      cursor: poruka.trim() ? "pointer" : "not-allowed",
                      opacity: poruka.trim() ? 1 : 0.7,
                    }}
                  >
                    Pošalji
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: 0, color: "#e754a2" }}>Deaktivacija naloga</h3>
                <div style={{ marginBottom: 12 }}>
                  Da li ste sigurni da želite deaktivirati svoj nalog? Vaš profil će biti postavljen kao neaktivan i više neće biti vidljiv drugim korisnicima.
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      background: "#444",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    onClick={handleBrisanje}
                    style={{
                      background: "#e754a2",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Deaktiviraj nalog
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default Postavke;

