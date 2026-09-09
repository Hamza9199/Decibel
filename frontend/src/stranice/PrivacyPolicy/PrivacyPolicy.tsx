import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../komponente/Header/Header';
import Footer from '../../komponente/Footer/Footer';
import Sidebar from '../../komponente/Sidebar/Sidebar';
import styles from './PrivacyPolicy.module.css';

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.privacyPolicy}>
        <h1>{t("privacy_policy") || "Politika privatnosti"}</h1>
        <p>{t("privacy_policy_text") || "Ovdje se nalazi politika privatnosti aplikacije Decibel."}</p>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
