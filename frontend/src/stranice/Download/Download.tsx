import React, { useEffect, useState, memo} from "react";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";

type Styles = Record<string, string>;
const MOBILE_LINK = import.meta.env.VITE_MOBILE_LINK as string;
const DESKTOP_LINK = import.meta.env.VITE_DESKTOP_LINK as string;
const DISCORD_BOT_LINK = import.meta.env.VITE_DISCORD_BOT_LINK as string;


const Download: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [postDataDelayDone, setPostDataDelayDone] = useState(false);
  const { t } = useTranslation();

  
  
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




   const handleDownloadDesktop = () => {
      const desktopLink = DESKTOP_LINK ;

      window.open(
        desktopLink,
        "_blank"
      );
  };


   const handleDownloadMobile = () => {
      const mobileLink = MOBILE_LINK ;

      window.open(
        mobileLink,
        "_blank"
      );
  };

  const handleDownloadDiscordBot = () => {
      const discordBot = DISCORD_BOT_LINK ;

      window.open(
        discordBot,
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

        <div className={styles.downloadButtons}>
          <a   className={styles.downloadLink}>
            
            <button onClick={() => handleDownloadDesktop()} className={styles.downloadBtn}>
                <svg viewBox="0 0 20 20" width="30" height="30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" fill="#ffffff" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>windows [#174]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-60.000000, -7439.000000)" fill="#ffffff"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M13.1458647,7289.43426 C13.1508772,7291.43316 13.1568922,7294.82929 13.1619048,7297.46884 C16.7759398,7297.95757 20.3899749,7298.4613 23.997995,7299 C23.997995,7295.84873 24.002005,7292.71146 23.997995,7289.71311 C20.3809524,7289.71311 16.7649123,7289.43426 13.1458647,7289.43426 M4,7289.43526 L4,7296.22153 C6.72581454,7296.58933 9.45162907,7296.94113 12.1724311,7297.34291 C12.1774436,7294.71736 12.1704261,7292.0908 12.1704261,7289.46524 C9.44661654,7289.47024 6.72380952,7289.42627 4,7289.43526 M4,7281.84344 L4,7288.61071 C6.72581454,7288.61771 9.45162907,7288.57673 12.1774436,7288.57973 C12.1754386,7285.96017 12.1754386,7283.34361 12.1724311,7280.72405 C9.44461153,7281.06486 6.71679198,7281.42567 4,7281.84344 M24,7288.47179 C20.3879699,7288.48578 16.7759398,7288.54075 13.1619048,7288.55175 C13.1598997,7285.88921 13.1598997,7283.22967 13.1619048,7280.56914 C16.7689223,7280.01844 20.3839599,7279.50072 23.997995,7279 C24,7282.15826 23.997995,7285.31353 24,7288.47179" id="windows-[#174]"> </path> </g> </g> </g> </g></svg>
              {t("download_desktop")}
            </button>
          </a>

           <a   className={styles.downloadLink}>
            <button onClick={() => handleDownloadMobile()} className={styles.downloadBtn}>
                <svg fill="#ffffff"  width="30" height="30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" enable-background="new 0 0 512 512"  stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="b75708d097f2188dff6617b0f00f7c43"> <path display="inline" d="M120.606,169h270.788v220.663c0,13.109-10.628,23.737-23.721,23.737h-27.123v67.203 c0,17.066-13.612,30.897-30.415,30.897c-16.846,0-30.438-13.831-30.438-30.897v-67.203h-47.371v67.203 c0,17.066-13.639,30.897-30.441,30.897c-16.799,0-30.437-13.831-30.437-30.897v-67.203h-27.099 c-13.096,0-23.744-10.628-23.744-23.737V169z M67.541,167.199c-16.974,0-30.723,13.963-30.723,31.2v121.937 c0,17.217,13.749,31.204,30.723,31.204c16.977,0,30.723-13.987,30.723-31.204V198.399 C98.264,181.162,84.518,167.199,67.541,167.199z M391.395,146.764H120.606c3.342-38.578,28.367-71.776,64.392-90.998 l-25.746-37.804c-3.472-5.098-2.162-12.054,2.946-15.525c5.102-3.471,12.044-2.151,15.533,2.943l28.061,41.232 c15.558-5.38,32.446-8.469,50.208-8.469c17.783,0,34.672,3.089,50.229,8.476L334.29,5.395c3.446-5.108,10.41-6.428,15.512-2.957 c5.108,3.471,6.418,10.427,2.946,15.525l-25.725,37.804C363.047,74.977,388.055,108.175,391.395,146.764z M213.865,94.345 c0-8.273-6.699-14.983-14.969-14.983c-8.291,0-14.99,6.71-14.99,14.983c0,8.269,6.721,14.976,14.99,14.976 S213.865,102.614,213.865,94.345z M329.992,94.345c0-8.273-6.722-14.983-14.99-14.983c-8.291,0-14.97,6.71-14.97,14.983 c0,8.269,6.679,14.976,14.97,14.976C323.271,109.321,329.992,102.614,329.992,94.345z M444.48,167.156 c-16.956,0-30.744,13.984-30.744,31.222v121.98c0,17.238,13.788,31.226,30.744,31.226c16.978,0,30.701-13.987,30.701-31.226 v-121.98C475.182,181.14,461.458,167.156,444.48,167.156z"> </path> </g> </g></svg>
              {t("download_mobile")}
            </button>
          </a>

          <a   className={styles.downloadLink}>
            <button onClick={() => handleDownloadDiscordBot()} className={styles.downloadBtn}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18.59 5.88997C17.36 5.31997 16.05 4.89997 14.67 4.65997C14.5 4.95997 14.3 5.36997 14.17 5.69997C12.71 5.47997 11.26 5.47997 9.83001 5.69997C9.69001 5.36997 9.49001 4.95997 9.32001 4.65997C7.94001 4.89997 6.63001 5.31997 5.40001 5.88997C2.92001 9.62997 2.25001 13.28 2.58001 16.87C4.23001 18.1 5.82001 18.84 7.39001 19.33C7.78001 18.8 8.12001 18.23 8.42001 17.64C7.85001 17.43 7.31001 17.16 6.80001 16.85C6.94001 16.75 7.07001 16.64 7.20001 16.54C10.33 18 13.72 18 16.81 16.54C16.94 16.65 17.07 16.75 17.21 16.85C16.7 17.16 16.15 17.42 15.59 17.64C15.89 18.23 16.23 18.8 16.62 19.33C18.19 18.84 19.79 18.1 21.43 16.87C21.82 12.7 20.76 9.08997 18.61 5.88997H18.59ZM8.84001 14.67C7.90001 14.67 7.13001 13.8 7.13001 12.73C7.13001 11.66 7.88001 10.79 8.84001 10.79C9.80001 10.79 10.56 11.66 10.55 12.73C10.55 13.79 9.80001 14.67 8.84001 14.67ZM15.15 14.67C14.21 14.67 13.44 13.8 13.44 12.73C13.44 11.66 14.19 10.79 15.15 10.79C16.11 10.79 16.87 11.66 16.86 12.73C16.86 13.79 16.11 14.67 15.15 14.67Z" fill="#ffffff"></path> </g></svg>              {t("download_discord_bot")}
            </button>
          </a>

        </div>
         
      </div>
     
      <Footer />
    </>
  );
};

export default memo(Download);
