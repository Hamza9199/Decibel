import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../komponente/Header/Header';
import Footer from '../../komponente/Footer/Footer';
import Sidebar from '../../komponente/Sidebar/Sidebar';
import styles from './TermsConditions.module.css';

const TermsConditions: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.termsConditions}>
        <h1>{t("terms_conditions") || "Uslovi korištenja"}</h1>
        <p>{t("terms_conditions_text") || "Ovdje se nalaze uslovi korištenja aplikacije Decibel."}</p>
      </div>
      <Footer />
    </>
  );
};

export default TermsConditions;
