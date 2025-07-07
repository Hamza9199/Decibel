import React, { useEffect, useState } from "react";
import styles from "./Izvodjac.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import type { Korisnik, Pjesma, Album, Playlista } from "../../types";
import Loading from "../../komponente/Loading/Loading";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Izvodjac: React.FC = () => {
  const { izvodjacId } = useParams<{ izvodjacId: string }>();
  const [izvodjac, setIzvodjac] = useState<Korisnik | null>(null);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [pratim, setPratim] = useState(false);
  const [loading, setLoading] = useState(true);

  let mojID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    mojID = user?.id || "";
  } catch {
    mojID = "";
  }

  useEffect(() => {
    if (!izvodjacId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/korisnici/${izvodjacId}`)
      .then((res) => setIzvodjac(res.data))
      .catch(() => setIzvodjac(null));
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) =>
        setPjesme((res.data || []).filter((p: Pjesma) => p.korisnikID === izvodjacId))
      )
      .catch(() => setPjesme([]));
    axios
      .get(`${API_BASE}/albumi/`)
      .then((res) =>
        setAlbumi((res.data || []).filter((a: Album) => a.korisnikID === izvodjacId))
      )
      .catch(() => setAlbumi([]));
    axios
      .get(`${API_BASE}/playliste/`)
      .then((res) =>
        setPlayliste((res.data || []).filter((pl: Playlista) => pl.korisnikID === izvodjacId))
      )
      .catch(() => setPlayliste([]));
    // Provjeri da li pratim
    if (mojID && izvodjacId) {
      axios
        .get(`${API_BASE}/pratioci/${izvodjacId}/${mojID}`)
        .then(() => setPratim(true))
        .catch(() => setPratim(false));
    }
    setLoading(false);
  }, [izvodjacId, mojID]);

  const handlePrati = async () => {
    if (!mojID || !izvodjacId) return;
    if (pratim) {
      await axios.delete(`${API_BASE}/pratioci/${izvodjacId}/${mojID}`).catch(() => {});
      setPratim(false);
    } else {
      await axios.post(`${API_BASE}/pratioci/`, {
        korisnikID: izvodjacId,
        pratilacID: mojID,
      }).catch(() => {});
      setPratim(true);
    }
  };

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
  if (!izvodjac)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>Izvođač nije pronađen.</h2>
        </div>
        <Footer />
      </div>
    );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.izvodjacBg}>
        <div className={styles.container}>
          <div className={styles.izvodjacMain}>
            <img
              src={izvodjac.putanjaProfilneSlike || "/logo.gif"}
              alt={izvodjac.korisnicko_ime}
              className={styles.izvodjacSlika}
            />
            <div className={styles.izvodjacInfo}>
              <h2 className={styles.izvodjacNaziv}>{izvodjac.korisnicko_ime}</h2>
              <div className={styles.izvodjacMeta}>
                <span>Ime: <b>{izvodjac.ime}</b></span>
                <span>Prezime: <b>{izvodjac.prezime}</b></span>
                <span>Pratilaca: <b>{izvodjac.brojPratilaca}</b></span>
              </div>
              <div className={styles.izvodjacBio}>{izvodjac.bio}</div>
              {mojID && mojID !== izvodjac.id && (
                <button
                  className={`${styles.pratiBtn} ${pratim ? styles.pratim : ""}`}
                  onClick={handlePrati}
                >
                  {pratim ? "Pratim" : "Prati"}
                </button>
              )}
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Pjesme</h3>
            <div className={styles.gridRow}>
              {pjesme.length === 0 ? (
                <div className={styles.noItems}>Nema pjesama.</div>
              ) : (
                pjesme.map((p) => (
                  <div key={p.id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      <img
                        src={p.putanjaSlika || "/logo.gif"}
                        alt={p.naziv}
                        className={styles.cardImage}
                      />
                      {p.putanjaAudio && (
                        <button
                          className={styles.playBtn}
                          onClick={() => handlePlay(p)}
                          title="Pusti pjesmu"
                        >
                          <svg width="28" height="28" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <Link to={`/pjesma/${p.id}`} className={styles.cardTitle}>
                      {p.naziv}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Albumi</h3>
            <div className={styles.gridRow}>
              {albumi.length === 0 ? (
                <div className={styles.noItems}>Nema albuma.</div>
              ) : (
                albumi.map((a) => (
                  <div key={a.id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      <img
                        src={a.putanjaSlika || "/logo.gif"}
                        alt={a.naziv}
                        className={styles.cardImage}
                      />
                    </div>
                    <Link to={`/album/${a.id}`} className={styles.cardTitle}>
                      {a.naziv}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Playliste</h3>
            <div className={styles.gridRow}>
              {playliste.length === 0 ? (
                <div className={styles.noItems}>Nema playlista.</div>
              ) : (
                playliste.map((pl) => (
                  <div key={pl.id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      <img
                        src={pl.putanjaSlika || "/logo.gif"}
                        alt={pl.naziv}
                        className={styles.cardImage}
                      />
                    </div>
                    <Link to={`/playlista/${pl.id}`} className={styles.cardTitle}>
                      {pl.naziv}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Izvodjac;
