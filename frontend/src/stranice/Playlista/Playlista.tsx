import React, { useEffect, useState, useRef } from "react";
import styles from "./Playlista.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Pjesma, KorisnikPjesma, Playlista as PlaylistaType } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Playlista: React.FC = () => {
  const { playlistaId } = useParams<{ playlistaId: string }>();
  const [playlista, setPlaylista] = useState<PlaylistaType | null>(null);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const draggingRow = useRef<number | null>(null);
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});
  const [showPlaylistModal, setShowPlaylistModal] = useState<null | number>(null); // pjesmaID za modal
  const [playlists, setPlaylists] = useState<PlaylistaType[]>([]);
  const [likePlaylist, setLikePlaylist] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const { t } = useTranslation();

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  useEffect(() => {
    if (!playlistaId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/playliste/${playlistaId}`)
      .then((res) => {
        setPlaylista(res.data);
        setLikeCount(res.data.brojLajkova || 0);
        setIsOwner(res.data.korisnikID === korisnikID);
      })
      .catch(() => setPlaylista(null));

    axios
      .get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`)
      .then(async (res) => {
        const idsZaDohvat: number[] = res.data || [];
        if (idsZaDohvat.length === 0) {
          setPjesme([]);
          setLoading(false);
          return;
        }
        const pjesmeArr = await Promise.all(
          idsZaDohvat.map((id) =>
            axios
              .get(`${API_BASE}/pjesme/${id}`)
              .then((r) => r.data)
              .catch(() => null)
          )
        );
        setPjesme(pjesmeArr.filter(Boolean));
        setLoading(false);
      })
      .catch(() => {
        setPjesme([]);
        setLoading(false);
      });

    axios
      .get(`${API_BASE}/korisnik_pjesma/`)
      .then((res) => {
        const veze = res.data as KorisnikPjesma[];
        const map: { [pjesmaId: number]: boolean } = {};
        veze.filter(v => v.korisnikID === korisnikID).forEach(v => { map[v.pjesmaID] = true; });
        setLikeMap(map);
      })
      .catch(() => setLikeMap({}));

    axios
      .get(`${API_BASE}/playliste/`)
      .then((res) => setPlaylists(res.data || []))
      .catch(() => setPlaylists([]));

    if (korisnikID && playlistaId) {
      axios
        .get(`${API_BASE}/korisnik_playlista/`)
        .then((res) => {
          const veze = res.data as { korisnikID: string; playlistaID: number }[];
          setLikePlaylist(!!veze.find((v) => v.korisnikID === korisnikID && String(v.playlistaID) === String(playlistaId)));
        })
        .catch(() => setLikePlaylist(false));
    }
  }, [playlistaId, korisnikID]);

  const handlePlaySong = (p: Pjesma) => {
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

  const handlePlayPlaylist = () => {
    if (pjesme.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("globalAudioPlaylist", {
        detail: {
          playlist: pjesme,
          idx: 0,
        }
      })
    );
  };

  const handleLikeSong = async (pjesmaId: number) => {
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

  const handleLikeThisPlaylist = async () => {
    if (!korisnikID || !playlistaId) return;
    if (likePlaylist) {
      await axios.delete(`${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`).catch(() => {});
      setLikePlaylist(false);
      setLikeCount((prev) => prev - 1);
    } else {
      await axios.post(`${API_BASE}/korisnik_playlista/`, {
        korisnikID,
        playlistaID: Number(playlistaId),
        kreiranDatumVrijeme: new Date().toISOString(),
      }).catch(() => {});
      setLikePlaylist(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
    draggingRow.current = idx;
  };
  const handleDragOver = (idx: number) => {
    setDragOverIdx(idx);
  };
 const handleDrop = async (idx: number) => {
  if (draggedIdx === null || draggedIdx === idx) {
    setDraggedIdx(null);
    setDragOverIdx(null);
    return;
  }

  const draggedPjesma = pjesme[draggedIdx];
  let nova_pozicija_iza_pjesmeID: number | null = null;

  if (idx === 0) {
    // Stavi na početak - prva pjesma ima pokazivacNaPrethodnuPjesmuID = NULL
    nova_pozicija_iza_pjesmeID = null;
  } else {
    // Stavi iza pjesme na poziciji idx-1
    nova_pozicija_iza_pjesmeID = pjesme[idx - 1].id;
  }

  try {
    const response = await axios.post(`${API_BASE}/pjesma_playlista/promjeni-redoslijed/`, {
      playlistaID: Number(playlistaId),
      pjesmaID: draggedPjesma.id,
      nova_pozicija_iza_pjesmeID,
    });

    if (response.data?.success) {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`);
      const idsZaDohvat: number[] = res.data || [];
      
      if (idsZaDohvat.length === 0) {
        setPjesme([]);
      } else {
        const pjesmeArr = await Promise.all(
          idsZaDohvat.map((id) =>
            axios
              .get(`${API_BASE}/pjesme/${id}`)
              .then((r) => r.data)
              .catch(() => null)
          )
        );
        setPjesme(pjesmeArr.filter(Boolean));
      }
    } else {
      console.error("Backend je vratio neuspješan odgovor");
    }
  } catch (error) {
    console.error("Greška pri promjeni redoslijeda:", error);
  } finally {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }
};

  const handleRemoveSong = async (pjesmaId: number) => {
    if (!playlistaId) return;
    try {
      await axios.delete(`${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`);
      setPjesme((prev) => prev.filter((p) => p.id !== pjesmaId));
    } catch {
      alert("Greška pri izbacivanju pjesme iz playliste.");
    }
  };

  if (loading) return <Loading />;
  if (!playlista)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>{t("playlist_not_found") || "Playlista nije pronađena."}</h2>
        </div>
        <Footer />
      </div>
    );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.playlistaBg}>
        <div className={styles.container}>
          <div className={styles.playlistaMain}>
            <div className={styles.playlistaSlikaWrap}>
              <img
                src={playlista.putanjaSlika || "/logo.gif"}
                alt={playlista.naziv}
                className={styles.playlistaSlika}
              />
              <div className={styles.playlistActions}>
              <button className={styles.playBtn} onClick={handlePlayPlaylist} title={t("play_playlist") || "Pusti playlistu"}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff">
                  <polygon points="12,8 36,22 12,36" />
                </svg>
              </button>
              <button
                className={`${styles.likeBtn} ${likePlaylist ? styles.liked : ""}`}
                onClick={handleLikeThisPlaylist}
                title={likePlaylist ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj playlistu"}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill={likePlaylist ? "#f7aed5ff" : "#fff"}>
                  <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                </svg>
                <span>{likeCount}</span>
              </button>
              </div>
              
            </div>
            <div className={styles.playlistaInfo}>
              <h2 className={styles.playlistaNaziv}>{playlista.naziv}</h2>
              <div className={styles.playlistaOpis}>{playlista.opis}</div>
              <div className={styles.playlistaMeta}>
                <span>
                  {t("number_of_songs") || "Broj pjesama"}: <b>{pjesme.length}</b>
                </span>
                <span>
                  {t("number_of_likes") || "Lajkova"}: <b>{likeCount}</b>
                </span>
                <span>
                  {t("public_playlist") || "Javno"}: <b>{playlista.javno ? t("yes") || "Da" : t("no") || "Ne"}</b>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.pjesmeSection}>
            <h3 className={styles.pjesmeTitle}>{t("songs_in_playlist") || "Pjesme u playlisti"}</h3>
            {pjesme.length === 0 ? (
              <div className={styles.noSongs}>{t("no_songs_in_playlist") || "Nema pjesama u ovoj playlisti."}</div>
            ) : (
              <table className={styles.pjesmeTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("song_name") || "Naziv"}</th>
                    <th>{t("duration_seconds") || "Trajanje"}</th>
                    <th>{t("artist") || "Izvođač"}</th>
                    <th>{t("actions") || "Akcije"}</th>
                  </tr>
                </thead>
                <tbody>
                  {pjesme.map((p, idx) => (
                    <tr
                      key={p.id}
                      draggable={isOwner}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver(idx);
                      }}
                      onDrop={() => handleDrop(idx)}
                      className={`${styles.songRow} ${
                        dragOverIdx === idx ? styles.dragOver : 
                        draggedIdx === idx ? styles.dragging : ''
                      }`}
                    >
                      <td data-label="#" className={styles.songNumber}>{idx + 1}</td>
                      <td data-label={t("song_name") || "Naziv"} className={styles.songNameCell}>
                        <div className={styles.songInfo}>
                          <img 
                            src={p.putanjaSlika || p.putanjaGif || "/logo.gif"} 
                            alt={p.naziv}
                            className={styles.songImage}
                          />
                          <span className={styles.songName}>{p.naziv}</span>
                        </div>
                      </td>
                      <td data-label={t("duration_seconds") || "Trajanje"}>{formatTrajanje(p.trajanjeSekunde)}</td>
                      <td data-label={t("artist") || "Izvođač"}>{p.korisnik?.korisnicko_ime || ""}</td>
                      <td data-label={t("actions") || "Akcije"} className={styles.songActions}>
                        <button
                          className={styles.songPlayBtn}
                          onClick={() => handlePlaySong(p)}
                          title={t("play_song") || "Pusti pjesmu"}
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.songPlayBtn} ${likeMap[p.id] ? styles.liked : ""}`}
                          onClick={() => handleLikeSong(p.id)}
                          title={likeMap[p.id] ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj pjesmu"}
                        >
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likeMap[p.id] ? "#f6b8d9ff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                        <button
                          className={styles.songPlayBtn}
                          onClick={() => setShowPlaylistModal(p.id)}
                          title={t("add_song_to_playlist") || "Dodaj u playlistu"}
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec">
                            <rect x="18" y="8" width="8" height="28" />
                            <rect x="8" y="18" width="28" height="8" />
                          </svg>
                        </button>
                        {isOwner && (
                          <button
                            className={styles.removeSongBtn}
                            onClick={() => handleRemoveSong(p.id)}
                            title={t("remove") || "Izbaci iz playliste"}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        )}
                        {showPlaylistModal === p.id && (
                          <div className={styles.modalOverlay} onClick={() => setShowPlaylistModal(null)}>
                            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                              <h4 className={styles.modalTitle}>{t("add_song_to_playlist") || "Dodaj pjesmu u playlistu"}</h4>
                              <ul className={styles.playlistList}>
                                {playlists
                                  .filter((pl) => String(pl.id) !== String(playlistaId))
                                  .map((pl) => (
                                    <li key={pl.id} className={styles.playlistItem}>
                                      <button
                                        className={styles.playlistBtn}
                                        onClick={() => handleAddToPlaylist(p.id, pl.id)}
                                      >
                                        {pl.naziv}
                                      </button>
                                    </li>
                                  ))}
                              </ul>
                              <button className={styles.modalCloseBtn} onClick={() => setShowPlaylistModal(null)}>
                                {t("close") || "Zatvori"}
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

export default Playlista;




