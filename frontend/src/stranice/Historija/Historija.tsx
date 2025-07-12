import React, { useEffect, useState } from "react";
import styles from "./Historija.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma, HistorijaSlusanja, Playlista, KorisnikPjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Historija: React.FC = () => {
  const [historija, setHistorija] = useState<HistorijaSlusanja[]>([]);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState<null | number>(null); // pjesmaID
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});

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
      return;
    }
    setLoading(true);
    axios
      .get(`${API_BASE}/historija/`)
      .then((res) => {
        const sve: HistorijaSlusanja[] = res.data || [];
        setHistorija(sve.filter((h) => h.korisnikID === korisnikID));
      })
      .catch(() => setHistorija([]));
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => setPjesme(res.data || []))
      .catch(() => setPjesme([]));
    axios
      .get(`${API_BASE}/playliste/`)
      .then((res) => setPlaylists(res.data || []))
      .catch(() => setPlaylists([]));
    // Dohvati lajkove korisnika za pjesme
    axios
      .get(`${API_BASE}/korisnik_pjesma/`)
      .then((res) => {
        const veze = res.data as KorisnikPjesma[];
        const map: { [pjesmaId: number]: boolean } = {};
        veze.filter(v => v.korisnikID === korisnikID).forEach(v => { map[v.pjesmaID] = true; });
        setLikeMap(map);
      })
      .catch(() => setLikeMap({}));
    setLoading(false);
  }, [korisnikID]);

  // Like/Unlike handler
  const handleLike = async (pjesmaId: number) => {
    if (!korisnikID || !pjesmaId) return;
    if (likeMap[pjesmaId]) {
      await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${pjesmaId}`).catch(() => {});
      setLikeMap((prev) => ({ ...prev, [pjesmaId]: false }));
    } else {
      await axios.post(`${API_BASE}/korisnik_pjesma/`, {
        korisnikID,
        pjesmaID: pjesmaId,
        kreiranDatumVrijeme: new Date().toISOString(),
      }).catch(() => {});
      setLikeMap((prev) => ({ ...prev, [pjesmaId]: true }));
    }
  };

  // Dodavanje pjesme u playlistu
   const handleAddToPlaylist = async (pjesmaID: number, playlistaID: number) => {
    try {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID,
        playlistaID,
      });
      setShowPlaylistModal(null);
      alert("Pjesma je dodana u playlistu!");
    } catch {
      alert("Greška pri dodavanju pjesme u playlistu.");
    }
  };

  // Prikupi sve pjesme iz historije (najnovije prve)
  const historijaPjesme = historija
    .sort((a, b) => new Date(b.kreiranDatumVrijeme || "").getTime() - new Date(a.kreiranDatumVrijeme || "").getTime())
    .map((h) => ({
      ...h,
      pjesma: pjesme.find((p) => p.id === h.pjesmaID),
    }))
    .filter((h) => h.pjesma);

  if (loading) return <Loading />;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.historijaBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Historija slušanja</h2>
          {historijaPjesme.length === 0 ? (
            <div className={styles.noSongs}>Nema historije slušanja.</div>
          ) : (
            <table className={styles.pjesmeTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Slika</th>
                  <th>Naziv</th>
                  <th>Izvođač</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {historijaPjesme.map((h, idx) => (
                  <tr key={h.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <Link to={`/pjesma/${h.pjesmaID}`}>
                        <img src={h.pjesma?.putanjaSlika} alt={h.pjesma?.naziv} className={styles.songImage} />
                      </Link>
                    </td>
                    <td>
                      <Link to={`/pjesma/${h.pjesmaID}`} className="link">{h.pjesma?.naziv}</Link>
                    </td>
                    <td>{h.pjesma?.korisnik?.korisnicko_ime || ""}</td>
                    <td>
                      <button
                        className={styles.songPlayBtn}
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("globalAudioPlay", {
                              detail: {
                                id: h.pjesma?.id,
                                src: h.pjesma?.putanjaAudio,
                                title: h.pjesma?.naziv,
                                putanjaGif: h.pjesma?.putanjaGif,
                                putanjaSlika: h.pjesma?.putanjaSlika,
                                korisnikID: h.pjesma?.korisnikID,
                              },
                            })
                          )
                        }
                        title="Pusti pjesmu"
                      >
                        <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.likeBtn} ${likeMap[h.pjesmaID] ? styles.liked : ""}`}
                        onClick={() => handleLike(h.pjesmaID)}
                        title={likeMap[h.pjesmaID] ? "Ukloni lajk" : "Lajkuj pjesmu"}
                      >
                        <svg width="22" height="22" viewBox="0 0 28 28" fill={likeMap[h.pjesmaID] ? "#fcbaddff" : "#fff"}>
                          <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                        </svg>
                      </button>
                      <button
                        className={styles.addBtn}
                        onClick={() => setShowPlaylistModal(h.pjesmaID)}
                        title="Dodaj u playlistu"
                      >
                        <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec">
                          <rect x="18" y="8" width="8" height="28" />
                          <rect x="8" y="18" width="28" height="8" />
                        </svg>
                      </button>
                      {/* Modal za izbor playliste */}
                      {showPlaylistModal === h.pjesmaID && (
                        <div className={styles.modalOverlay} onClick={() => setShowPlaylistModal(null)}>
                          <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h4>Dodaj pjesmu u playlistu</h4>
                            <ul className={styles.playlistList}>
                              {playlists.map((pl) => (
                                <li key={pl.id}>
                                  <button
                                    className={styles.playlistBtn}
                                    onClick={() => handleAddToPlaylist(h.pjesmaID, pl.id)}
                                  >
                                    {pl.naziv}
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <button className={styles.closeModalBtn} onClick={() => setShowPlaylistModal(null)}>
                              Zatvori
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Historija;
