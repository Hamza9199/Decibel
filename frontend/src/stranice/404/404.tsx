import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../../komponente/Header/Header';
import Footer from '../../komponente/Footer/Footer';
import Sidebar from '../../komponente/Sidebar/Sidebar';
import styles from './404.module.css';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.notFound}>
        <h1>404</h1>
        <h2>{t("not_found") || "Stranica nije pronađena"}</h2>
        <Link to="/">{t("go_back") || "Vrati se na početnu"}</Link>
      </div>
      <Footer />
    </>
  );
};

export default NotFound;
