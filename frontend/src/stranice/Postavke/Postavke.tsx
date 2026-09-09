import React, { useState, useEffect, useCallback, memo } from "react";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Loading from "../../komponente/Loading/Loading";
import axios from "axios";
import { useTranslation } from "react-i18next";
import "../../i18n";
import { useNavigate } from "react-router-dom";
import { getApiBase } from "../../utils/apiBase";

type Styles = Record<string, string>;

const API_BASE = getApiBase();

const Postavke: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [poruka, setPoruka] = useState("");
  const [brisanje, setBrisanje] = useState(false);
  const { t, i18n } = useTranslation();
  const [jezik, setJezik] = useState(i18n.language || "bs");
  const [tema, setTema] = useState(localStorage.getItem("decibel_tema") || "dark");
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [postDataDelayDone, setPostDataDelayDone] = useState(false);
    const isElectron = navigator.userAgent.toLowerCase().includes("electron");

const navigate = useNavigate();

  const handleNavigate = useCallback((path: string) => {
    setTimeout(() => navigate(path), 10);
  }, [navigate]);

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./PostavkeWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Postavke.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      }
    };
    const boot = async () => {
      await loadThemeStyles();
      setCssReady(true);
    };
    boot();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") loadThemeStyles(e.newValue || undefined);
    };
    const onThemeChanged = (e: Event) => {
      const theme = (e as CustomEvent<string>).detail;
      loadThemeStyles(theme);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("themeChanged", onThemeChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("themeChanged", onThemeChanged);
    };
  }, []);

  useEffect(() => {
    if (cssReady) {
      setPostDataDelayDone(false);
      const t = setTimeout(() => setPostDataDelayDone(true), 200);
      return () => clearTimeout(t);
    }
    setPostDataDelayDone(false);
  }, [cssReady]);

  const handleChangeTema = useCallback((newTema: string) => {
      setTema(newTema);
      localStorage.setItem("decibel_tema", newTema);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "decibel_tema",
          newValue: newTema,
        })
      );
    }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", tema);
    localStorage.setItem("decibel_tema", tema);
  }, [tema]);

  const handleOpenModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
    setBrisanje(false);
  }, []);

  const handleOpenBrisanje = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
    setBrisanje(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setPoruka("");
  }, []);

  const handlePorukaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPoruka(e.target.value);
  }, []);

  const handleSend = useCallback(async () => {
    const korisnikID = localStorage.getItem("korisnik") ? JSON.parse(localStorage.getItem("korisnik") as string).id : "";
    if (!poruka.trim() || !korisnikID) {
      alert("Morate unijeti poruku i biti prijavljeni.");
      return;
    }
    try {
      await axios.post(`${API_BASE}/prijave_izvodjaca/`, { korisnikID, poruka, datum: new Date().toISOString() });
      alert("Prijava je uspješno poslana!");
    } catch {
      alert("Greška pri slanju prijave.");
    }
    handleCloseModal();
  }, [poruka, handleCloseModal]);

  const handleBrisanje = useCallback(async () => {
    const korisnikID = localStorage.getItem("korisnik") ? JSON.parse(localStorage.getItem("korisnik") as string).id : "";
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
  }, [handleCloseModal]);

  const handleJezikChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setJezik(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("decibel_lang", lang);
  }, [i18n]);

  const handleDownloadData = useCallback(async () => {
    const korisnik = localStorage.getItem("korisnik");
    if (!korisnik) {
      alert("Morate biti prijavljeni da biste preuzeli podatke.");
      return;
    }
    const korisnikID = JSON.parse(korisnik).id;
    try {
      const response = await axios.get(`${API_BASE}/korisnici/${korisnikID}/izvoz-podataka`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `korisnik_${korisnikID}_podaci.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Greška pri preuzimanju podataka.");
    }
  }, []);

    const handleDiscordLink = useCallback(() => {
        navigate("/discord-link");
    } , []);

  if (!cssReady || !postDataDelayDone) return <Loading />;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.settingsBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("settings")}</h2>
          <div className={styles.form}>
            <div className={styles.label}>
              <span>{t("appearance")}:</span>
              <select className={styles.input} value={tema} onChange={e => handleChangeTema(e.target.value)}>
                <option value="dark">{t("dark_mode")}</option>
                <option value="light">{t("white_mode")}</option>
              </select>
            </div>
            <div className={styles.label}>
              <span>{t("language")}:</span>
              <select className={styles.input} value={jezik} onChange={handleJezikChange}>
                <option value="bs">Bosanski/Srpski/Hrvatski</option>
                <option value="en">English</option>
                <option value="de">German</option>
              </select>
            </div>
            <div className={styles.label}>
              <span>{t("artist_application")}:</span>
              <span style={{ marginLeft: 8 }}>
                <a href="#" className={styles.link} style={{ color: "#1e90ff" }} onClick={handleOpenModal}>
                  {t("apply_here")}
                </a>
              </span>
            </div>
            {!isElectron && (
              <div className={styles.label}>
              <span>{t("discordLink.title")}:</span>
              <span style={{ marginLeft: 8 }}>
                <a href="#" className={styles.link} style={{ color: "#1e90ff" }} onClick={() => handleDiscordLink()}>
                  {t("discordLink.description")}
                </a>
              </span>
            </div>
            )}
            <div className={styles.label}>
              <span>{t("delete_profile")}:</span>
              <span style={{ marginLeft: 8 }}>
                <a href="#" className={styles.link} style={{ color: "#1e90ff" }} onClick={handleOpenBrisanje}>
                  {t("deleting")}
                </a>
              </span>
            </div>
            
            <button className={styles.downloadButton} type="button" onClick={handleDownloadData}>
              {t("download_my_data") || "Preuzmi moje podatke"}
            </button>

            <div className={styles.label} style={{ marginTop: 8 }}>
              <a onClick={() => handleNavigate("/privacy-policy")} className={styles.link} style={{ color: "#1e90ff" }}>
                {t("privacy_policy") || "Politika privatnosti"}
              </a>
            </div>
            <div className={styles.label}>
              <a onClick={() => handleNavigate("/terms-conditions")} className={styles.link} style={{ color: "#1e90ff" }}>
                {t("terms_conditions") || "Uslovi korištenja"}
              </a>
            </div>
          </div>
        </div>
      </div>
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#222", padding: 24, borderRadius: 8, minWidth: 320, maxWidth: 400, color: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 12 }}>
            {!brisanje ? (
              <>
                <h3 style={{ margin: 0 }}>{t("artist_application")}</h3>
                <label>
                  {t("why_choose_you")}
                  <textarea value={poruka} onChange={handlePorukaChange} rows={5} style={{ width: "100%", marginTop: 6, borderRadius: 4, border: "1px solid #444", padding: 8, resize: "vertical", background: "#181818", color: "#fff" }} placeholder={t("experience_genre_links")} />
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button onClick={handleCloseModal} style={{ background: "#444", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", cursor: "pointer" }}>
                    {t("cancel")}
                  </button>
                  <button onClick={handleSend} disabled={!poruka.trim()} style={{ background: "#1e90ff", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", cursor: poruka.trim() ? "pointer" : "not-allowed", opacity: poruka.trim() ? 1 : 0.7 }}>
                    {t("send_application")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: 0, color: "#e754a2" }}>{t("deactivate_account")}</h3>
                <div style={{ marginBottom: 12 }}>{t("account_deactivated_info")}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button onClick={handleCloseModal} style={{ background: "#444", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", cursor: "pointer" }}>
                    {t("cancel")}
                  </button>
                  <button onClick={handleBrisanje} style={{ background: "#e754a2", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", cursor: "pointer" }}>
                    {t("deactivate_account")}
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

export default memo(Postavke);