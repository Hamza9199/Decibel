import React, { useMemo, useEffect, useState, memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../assets/logo.css";
import Loading from "../Loading/Loading";

type Styles = Record<string, string>;

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const year = useMemo(() => new Date().getFullYear(), []);
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [cssDelayDone, setCssDelayDone] = useState(false);

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./FooterWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Footer.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      }
      setCssReady(true);
    };
    setCssReady(false);
    loadThemeStyles();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") {
        setCssReady(false);
        setCssDelayDone(false);
        loadThemeStyles(e.newValue || undefined);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!cssReady) { setCssDelayDone(false); return; }
    const t = setTimeout(() => setCssDelayDone(true), 200);
    return () => clearTimeout(t);
  }, [cssReady]);

  if (!cssReady || !cssDelayDone) return <Loading />;

  return (
    <footer className={styles.footer}>
      <Link to="/">
        <img
          src="/logo.gif"
          alt="Decibel logo"
          className="footerLogo"
          style={{ height: "38px" }}
        />
      </Link>
      <span className={styles.footerText}>
        © {year} Decibel. {t("all_rights_reserved") || "Sva prava zadržana."}
      </span>

      <div className={styles.footerLinks}>
        <a
          href="https://github.com/Hamza9199"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          GitHub
        </a>
        <a
          href="mailto:hamza.gacic.22@size.ba"
          className={styles.footerLink}
        >
          {t("contact") || "Kontakt"}
        </a>
      </div>
    </footer>
  );
};

export default memo(Footer);
