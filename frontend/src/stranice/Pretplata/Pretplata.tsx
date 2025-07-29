import React, { useEffect, useState } from "react";
import styles from "./Pretplata.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import Loading from "../../komponente/Loading/Loading";
import { useNavigate } from "react-router-dom";
import type { KorisnikPretplata, Pretplata } from "../../types";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Pretplata: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [korisnikPretplata, setKorisnikPretplata] = useState<KorisnikPretplata | null>(null);
  const [ponude, setPonude] = useState<Pretplata[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kupovinaLoading, setKupovinaLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  useEffect(() => {
    if (!korisnikID) {
      setLoading(false);
      setError("Morate biti prijavljeni.");
      return;
    }
    setLoading(true);
    axios
      .get(`${API_BASE}/korisnik_pretplata/`)
      .then((res) => {
        const pretplate: KorisnikPretplata[] = res.data || [];
        const moja = pretplate.find((p) => p.korisnikID === korisnikID);
        setKorisnikPretplata(moja || null);
        if (!moja) {
          axios
            .get(`${API_BASE}/pretplate/`)
            .then((r) => setPonude((r.data || []).filter((p: Pretplata) => p.dostupno)))
            .catch(() => setPonude([]));
        }
      })
      .catch((error) => setError("Greška pri dohvatu podataka. " + (error?.response?.status === 404 ? "Nema podataka." : error)))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  const handleOtkaziPretplatu = async () => {
    if (!korisnikPretplata) return;
    if (!window.confirm("Jeste li sigurni da želite otkazati pretplatu?")) return;
    setKupovinaLoading(true);
    try {
      await axios.delete(`${API_BASE}/korisnik_pretplata/${korisnikPretplata.id}`);
      window.location.reload();
    } catch {
      setError("Greška pri otkazivanju pretplate.");
    } finally {
      setKupovinaLoading(false);
    }
  };

  const handleObnoviPretplatu = () => {
    if (!korisnikPretplata?.pretplataID) return;
    navigate(`/nova-pretplata/${korisnikPretplata.pretplataID}`);
  };

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.pretplataBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("subscription")}</h2>
          {loading ? (
            <Loading />
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : korisnikPretplata ? (
            <div className={styles.infoBox}>
              <div className={styles.status}>
                {t("status") || "Status"}: <b>{korisnikPretplata.pretplataStatus}</b>
              </div>
              <div className={styles.naziv}>
                {t("package") || "Paket"}: <b>{korisnikPretplata.pretplata?.naziv || t("no_data")}</b>
              </div>
              <div className={styles.opis}>
                {korisnikPretplata.pretplata?.opis}
              </div>
              <div className={styles.cijena}>
                {t("price") || "Cijena"}: <b>{korisnikPretplata.pretplata?.cijena} KM / mj</b>
              </div>
              {korisnikPretplata.datumIsteka && (
                <div className={styles.istice}>
                  {t("expires") || "Ističe"}: <b>{new Date(korisnikPretplata.datumIsteka).toLocaleDateString()} ({new Date(korisnikPretplata.datumIsteka).toLocaleTimeString()})</b>
                </div>
              )}
              <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "center" }}>
                <button
                  className={styles.kupiBtn}
                  style={{ background: "#e754a2" }}
                  onClick={handleObnoviPretplatu}
                  disabled={kupovinaLoading}
                >
                  {t("renew_subscription") || "Obnovi pretplatu"}
                </button>
                <button
                  className={styles.kupiBtn}
                  style={{ background: "#232323", color: "#ffe6ec", border: "1px solid #b91d95" }}
                  onClick={handleOtkaziPretplatu}
                  disabled={kupovinaLoading}
                >
                  {t("cancel_subscription") || "Otkaži pretplatu"}
                </button>
              </div>
              <div className={styles.success}>{t("active_subscription") || "Imate aktivnu pretplatu."}</div>
            </div>
          ) : (
            <div className={styles.noSub}>
              <div className={styles.warning}>
                {t("no_active_subscription") || "Nemate aktivnu pretplatu. Kupite jednu od ponuđenih pretplata:"}
              </div>
              <div className={styles.ponudeGrid}>
                {ponude.length === 0 ? (
                  <div className={styles.error}>{t("no_available_subscriptions") || "Nema dostupnih pretplata."}</div>
                ) : (
                  ponude.map((p) => (
                    <div key={p.id} className={styles.ponudaCard}>
                      <div className={styles.ponudaNaziv}>{p.naziv}</div>
                      <div className={styles.ponudaOpis}>{p.opis}</div>
                      <div className={styles.ponudaCijena}>{p.cijena} KM / mj</div>
                      <button
                        className={styles.kupiBtn}
                        onClick={() => navigate(`/nova-pretplata/${p.id}`)}
                        disabled={kupovinaLoading}
                      >
                        {t("buy_subscription")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Pretplata;


