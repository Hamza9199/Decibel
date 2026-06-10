import React, { useEffect, useState, memo} from "react";
// import styles from "./UrediProfil.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";

type Styles = Record<string, string>;
const MOBILE_LINK = import.meta.env.VITE_MOBILE_LINK as string;
const DESKTOP_LINK = import.meta.env.VITE_DESKTOP_LINK as string;


const Download: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [postDataDelayDone, setPostDataDelayDone] = useState(false);
  const { t } = useTranslation();

  const getIsMobile = () => {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
  };

  const isMobile = getIsMobile();
  
  
   useEffect(() => {
      const loadThemeStyles = async (theme?: string) => {
        const current = theme || localStorage.getItem("decibel_tema") || "dark";
        if (current === "light") {
          const mod = await import("./DownloadWhite.module.css");
          setStyles(mod.default || (mod as unknown as Styles));
        } else {
          const mod = await import("./Download.module.css");
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




   const handleDownload = () => {
      const mobileLink = MOBILE_LINK ;
      const desktopLink = DESKTOP_LINK ;

      window.open(
        isMobile ? mobileLink : desktopLink,
        "_blank"
      );
  };

    if (!cssReady || !postDataDelayDone) return <Loading />;
  

  return (
    <>
      <Header />
      <Sidebar />

      <div className={styles.container}>
        <h1 className={styles.naslov}>{t("download")}</h1>
        <p className={styles.opis}>{t("download_desc")}</p>
        
        <a   className={styles.downloadLink}>
          <button onClick={() => handleDownload()} className={styles.downloadBtn}>
            {t("download")}
          </button>
        </a>
       
        
      </div>
     
      <Footer />
    </>
  );
};

export default memo(Download);
