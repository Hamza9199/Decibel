import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CookieConsent.module.css';

const CookieConsent: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => {
    try {
      const value = localStorage.getItem('cookie_consent');
      return value === null;
    } catch {
      return true;
    }
  });

  const handleCookieAccept = useCallback(() => {
    try {
      localStorage.setItem('cookie_consent', 'true');
    } catch { /* ignore */ }
    setVisible(false);
  }, []);

  const handleCookieDecline = useCallback(() => {
    try {
      localStorage.setItem('cookie_consent', 'false');
    } catch { /* ignore */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.cookieConsent}>
      <p>{t("cookie_text") || "Koristimo kolačiće za poboljšanje iskustva."}</p>
      <div className={styles.cookieButtons}>
        <button className={styles.cookieBtn} onClick={handleCookieAccept}>
          {t("cookie_accept") || "Prihvati"}
        </button>
        <button className={styles.cookieBtn} onClick={handleCookieDecline}>
          {t("cookie_decline") || "Odbij"}
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
