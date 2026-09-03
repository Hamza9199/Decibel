import { useEffect, useState } from "react";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { getApiBase } from "../../utils/apiBase";

const API_BASE = getApiBase();

type Styles = Record<string, string>;

const DiscordLink = () => {
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [postDataDelayDone, setPostDataDelayDone] = useState(false);
  const [kod, setKod] = useState<string>("");
  const [loadingKod, setLoadingKod] = useState(false);
  const { t } = useTranslation();

  const korisnik = JSON.parse(localStorage.getItem("korisnik") || "null");

  useEffect(() => {
    const fetchKorisnik = async () => {
      if (!korisnik?.id) return;
      axios
        .get(`${API_BASE}/korisnici/${korisnik?.id}`)
        .then((res) => {
          const updatedKorisnik = res.data;
          localStorage.setItem("korisnik", JSON.stringify(updatedKorisnik));
        })
        .catch((err) => console.error("Greška pri dohvaćanju korisnika:", err));
    };

    fetchKorisnik();
  }, []);

  const isLinked = !!korisnik?.discordID;

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./DiscordLinkWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./DiscordLink.module.css");
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
      const timer = setTimeout(() => setPostDataDelayDone(true), 200);
      return () => clearTimeout(timer);
    }
    setPostDataDelayDone(false);
  }, [cssReady]);

  const generateCode = async () => {
    if (!korisnik?.id) return;

    try {
      setLoadingKod(true);
      const res = await axios.post(
        `${API_BASE}/discordlink/generate/${korisnik.id}`
      );
      setKod(res.data.kod);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKod(false);
    }
  };

  const unlinkDiscord = async () => {
    try {
      await axios.delete(`${API_BASE}/discordlink/unlink/${korisnik.id}`);
      korisnik.discordID = null;
      localStorage.setItem("korisnik", JSON.stringify(korisnik));
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const refreshStatus = () => {
    window.location.reload();
  };

  if (!cssReady || !postDataDelayDone) return <Loading />;

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.discordHeaderIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div>
                <h1 className={styles.title}>{t("discordLink.title")}</h1>
                <p className={styles.description}>{t("discordLink.description")}</p>
              </div>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusInfo}>
                <span className={styles.statusLabel}>{t("discordLink.status")}:</span>
                <span
                  className={`${styles.statusBadge} ${
                    isLinked
                      ? styles.statusBadgeConnected
                      : styles.statusBadgeDisconnected
                  }`}
                >
                  <span className={styles.statusDot} />
                  {isLinked
                    ? t("discordLink.connected")
                    : t("discordLink.notConnected")}
                </span>
              </div>

              <button onClick={refreshStatus} className={styles.refreshBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                {t("discordLink.refresh")}
              </button>
            </div>

            {!isLinked && (
              <button
                className={styles.generateBtn}
                onClick={generateCode}
                disabled={loadingKod}
              >
                {loadingKod
                  ? t("discordLink.generating")
                  : t("discordLink.generateCode")}
              </button>
            )}

            {isLinked && (
              <button className={styles.unlinkBtn} onClick={unlinkDiscord}>
                {t("discordLink.unlink")}
              </button>
            )}

            {!isLinked && (
              <div className={styles.codeBox}>
                <div className={styles.codeTitle}>{t("discordLink.yourCode")}</div>
                <div className={styles.code}>{kod || "--------"}</div>
              </div>
            )}

            {isLinked && (
              <div className={styles.discordInfo}>
                {t("discordLink.discordID")}: {korisnik.discordID}
              </div>
            )}

            {!isLinked && (
              <div className={styles.instructions}>
                <h3>{t("discordLink.howToLink")}</h3>
                <ol className={styles.stepsList}>
                  <li>{t("discordLink.step1")}</li>
                  <li>{t("discordLink.step2")}</li>
                  <li>{t("discordLink.step3")}</li>
                </ol>

                <div className={styles.commandBox}>
                  <span className={styles.commandText}>
                    {kod ? `/link ${kod}` : "/link XXXXXXXX"}
                  </span>
                </div>
              </div>
            )}

            <a
              href="https://discord.gg/cKUexW8cta"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.discordBtn}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z"/>
              </svg>
              {t("discordLink.joinServer")}
            </a>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
};

export default DiscordLink;