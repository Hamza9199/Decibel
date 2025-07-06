import React, { useEffect, useState } from "react";
import styles from "./Pjesma.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import type { Pjesma, Korisnik } from "../../types";
import Loading from "../../komponente/Loading/Loading";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Pjesma: React.FC = () => {
  const { pjesmaId } = useParams<{ pjesmaId: string }>();
  const [pjesma, setPjesma] = useState<Pjesma | null>(null);
  const [izvodjaci, setIzvodjaci] = useState<Korisnik[]>([]);
  const [topPjesme, setTopPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    if (!pjesmaId) {
      setLoading(false);
      setPjesma(null);
      return;
    }
    setLoading(true);

    // Dohvati pjesmu
    axios
      .get(`${API_BASE}/pjesme/${pjesmaId}`)
      .then((res) => {
        if (!isMounted) return;
        setPjesma(res.data);
        // Dohvati izvođače za pjesmu
        axios
          .get(`${API_BASE}/izvodjac_pjesma/`)
          .then((resp) => {
            type IzvodjacPjesmaVeza = { pjesmaID: number; izvodjacID: string };
            const veze = (resp.data as IzvodjacPjesmaVeza[]).filter(
              (v) => String(v.pjesmaID) === String(pjesmaId)
            );
            if (!veze.length) {
              setIzvodjaci([]);
              return;
            }
            Promise.all(
              veze.map((v) =>
                axios
                  .get(`${API_BASE}/korisnici/${v.izvodjacID}`)
                  .then((r) => r.data)
                  .catch(() => null)
              )
            ).then((izv) => {
              if (isMounted) setIzvodjaci(izv.filter(Boolean));
            });
          })
          .catch(() => {
            if (isMounted) setIzvodjaci([]);
          });
      })
      .catch(() => {
        if (isMounted) setPjesma(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Dohvati top pjesme za reklamu
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        if (!isMounted) return;
        const top = (res.data || [])
          .filter((p: Pjesma) => String(p.id) !== String(pjesmaId))
          .sort((a: Pjesma, b: Pjesma) => (b.brojLajkova || 0) - (a.brojLajkova || 0))
          .slice(0, 6);
        setTopPjesme(top);
      })
      .catch(() => {
        if (isMounted) setTopPjesme([]);
      });

    return () => {
      isMounted = false;
    };
  }, [pjesmaId]);

  const handlePlay = (p: Pjesma) => {
    window.dispatchEvent(
      new CustomEvent("globalAudioPlay", {
        detail: {
          src: p.putanjaAudio,
          title: p.naziv,
          putanjaGif: p.putanjaGif,
          putanjaSlika: p.putanjaSlika,
          korisnikID: p.korisnikID,
        },
      })
    );
  };

  if (loading) return <Loading />;

  if (!pjesma)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>Pjesma nije pronađena.</h2>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            Nazad
          </button>
        </div>
        <Footer />
      </div>
    );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.pjesmaBg}>
        <div className={styles.container}>
          <div className={styles.pjesmaMain}>
            <div className={styles.pjesmaSlikaWrap}>
              <img
                src={pjesma.putanjaSlika || "/logo.gif"}
                alt={pjesma.naziv}
                className={styles.pjesmaSlika}
              />
              {pjesma.putanjaAudio && (
                <button
                  className={styles.playBtn}
                  onClick={() => handlePlay(pjesma)}
                  title="Pusti pjesmu"
                >
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff">
                    <polygon points="12,8 36,22 12,36" />
                  </svg>
                </button>
              )}
            </div>
            <div className={styles.pjesmaInfo}>
              <h2 className={styles.pjesmaNaziv}>{pjesma.naziv}</h2>
              <div className={styles.pjesmaOpis}>{pjesma.opis}</div>
              <div className={styles.pjesmaMeta}>
                <span>
                  Trajanje: <b>{formatTrajanje(pjesma.trajanjeSekunde)}</b>
                </span>
                <span>
                  Žanr: <b>{pjesma.zanr}</b>
                </span>
                <span>
                  Lajkova: <b>{pjesma.brojLajkova}</b>
                </span>
                <span>
                  Jezik: <b>{pjesma.jezikPjesme || "Nepoznato"}</b>
                </span>
              </div>
              <div className={styles.izvodjaciWrap}>
                <span className={styles.izvodjaciLabel}>Izvođači:</span>
                {izvodjaci.length === 0 ? (
                  <span className={styles.izvodjacIme}>Nepoznato</span>
                ) : (
                  izvodjaci.map((izv) => (
                    <span key={izv.id} className={styles.izvodjacIme}>
                      <img
                        src={izv.putanjaProfilneSlike || "/logo.gif"}
                        alt={izv.korisnicko_ime}
                        className={styles.izvodjacSlika}
                      />
                      {izv.korisnicko_ime}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className={styles.topPjesmeSection}>
            <h3 className={styles.topPjesmeTitle}>Preporučene pjesme</h3>
            <div className={styles.topPjesmeGrid}>
              {topPjesme.map((p) => (
                <div key={p.id} className={styles.topPjesmaCard}>
                  <div className={styles.topPjesmaSlikaWrap}>
                    <img
                      src={p.putanjaSlika || "/logo.gif"}
                      alt={p.naziv}
                      className={styles.topPjesmaSlika}
                    />
                    {p.putanjaAudio && (
                      <button
                        className={styles.topPlayBtn}
                        onClick={() => handlePlay(p)}
                        title="Pusti pjesmu"
                      >
                        <svg width="28" height="28" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className={styles.topPjesmaNaziv}>{p.naziv}</div>
                  <div className={styles.topPjesmaIzvodjac}>
                    {p.korisnik?.korisnicko_ime || ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

function formatTrajanje(sec?: number) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default Pjesma;
