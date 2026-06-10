import { useEffect, useState} from "react";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type Styles = Record<string, string>;

const DiscordLink = () => {
    const [styles, setStyles] = useState<Styles>({});
    const [cssReady, setCssReady] = useState(false);
    const [postDataDelayDone, setPostDataDelayDone] = useState(false);
    const [kod, setKod] = useState<string>("");
    const [loadingKod, setLoadingKod] = useState(false);
    const { t } = useTranslation();

    const korisnik = JSON.parse(
        localStorage.getItem("korisnik") || "null"
    );

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
        const t = setTimeout(() => setPostDataDelayDone(true), 200);
        return () => clearTimeout(t);
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
        await axios.delete(
        `${API_BASE}/discordlink/unlink/${korisnik.id}`
        );

        korisnik.discordID = null;

        localStorage.setItem(
        "korisnik",
        JSON.stringify(korisnik)
        );

        window.location.reload();
    } catch (err) {
        console.error(err);
    }
    };


    const refreshStatus = () => {
        window.location.reload();
    }


     if (!cssReady || !postDataDelayDone) return <Loading />;
        


    return (
        <>
            <Header />
            <div className={styles.container}>
                <Sidebar />
                <main className={styles.main}>
                    <div className={styles.card}>
                        <h1 className={styles.title}>
                         {t("discordLink.title")}
                        </h1>
                        <p className={styles.description}>
                         {t("discordLink.description")}
                        </p>

                        <div className={styles.statusBox}>
                        <span className={styles.statusLabel}>
                            {t("discordLink.status")}:
                        </span>

                       

                        <span
                            className={
                                isLinked
                                ? styles.statusConnected
                                : styles.statusDisconnected
                            }
                            >
                            {isLinked
                                ? t("discordLink.connected")
                                : t("discordLink.notConnected")}
                            </span>


                             <button onClick={refreshStatus} className={styles.refreshBtn}>
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
                        <button
                            className={styles.unlinkBtn}
                            onClick={unlinkDiscord}
                        >
                            {t("discordLink.unlink")}
                        </button>
                        )}

                        {!isLinked && (
                            <div className={styles.codeBox}>
                            <div className={styles.codeTitle}>
                                {t("discordLink.yourCode")}
                            </div>

                            <div className={styles.code}>
                                {kod || "--------"}
                            </div>
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

                                <ol>
                                    <li>{t("discordLink.step1")}</li>
                                    <li>{t("discordLink.step2")}</li>
                                    <li>{t("discordLink.step3")}</li>
                                </ol>

                                <div className={styles.command}>
                                    {kod ? `/link ${kod}` : "/link XXXXXXXX"}
                                </div>
                            </div>

                        )}

                        <a
                        href="https://discord.gg/decibel"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.discordBtn}
                        >
                        {t("discordLink.joinServer")}
                        </a>
                    </div>
                    </main>
            </div>
            <Footer />
        </>
    );
}

export default DiscordLink;