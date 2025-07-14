import React, { useEffect, useState } from "react";
import styles from "./Album.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams } from "react-router-dom";
import type { Album, Pjesma, Playlista, KorisnikPjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Album: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [loading, setLoading] = useState(true);
  const [repeatAll, setRepeatAll] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Pjesma | null>(null);
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});
  const { t } = useTranslation();

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  useEffect(() => {
    if (!albumId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/albumi/${albumId}`)
      .then((res) => {
        setAlbum(res.data);
        setLikeCount(res.data.brojLajkova || 0);
      })
      .catch(() => setAlbum(null));
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        setPjesme((res.data || []).filter((p: Pjesma) => String(p.albumID) === String(albumId)));
      })
      .catch(() => setPjesme([]));
    if (korisnikID) {
      axios
        .get(`${API_BASE}/playliste/`)
        .then((res) => setPlaylists(res.data || []))
        .catch(() => setPlaylists([]));
      // Provjeri da li je korisnik lajkao album
      axios
        .get(`${API_BASE}/korisnik_album/`)
        .then((res) => {
          const veze = res.data as { korisnikID: string; albumID: number }[];
          setLiked(!!veze.find((v) => v.korisnikID === korisnikID && String(v.albumID) === String(albumId)));
        })
        .catch(() => setLiked(false));
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
    }
    setLoading(false);
  }, [albumId, korisnikID]);

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

  const handlePlayAlbum = () => {
    if (pjesme.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("globalAudioPlaylist", {
        detail: {
          playlist: pjesme,
          idx: 0,
          repeatAll,
        }
      })
    );
  };

  const handleLike = async () => {
    if (!album || !korisnikID) return;
    if (liked) {
      // Un-like
      await axios.delete(`${API_BASE}/korisnik_album/${korisnikID}/${album.id}`).catch(() => {});
      setLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      await axios
        .post(`${API_BASE}/korisnik_album/`, {
          korisnikID,
          albumID: album.id,
          kreiranDatumVrijeme: new Date().toISOString(),
        })
        .catch(() => {});
      setLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  const handleAddToPlaylist = (p: Pjesma) => {
    setSelectedSong(p);
    setShowPlaylistModal(true);
  };

  const handleSelectPlaylist = async (playlistId: number) => {
    if (!selectedSong) return;
    try {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, {
        pjesmaID: selectedSong.id,
        playlistaID: playlistId,
      });
      setShowPlaylistModal(false);
      setSelectedSong(null);
      alert("Pjesma je dodana u playlistu!");
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { detail?: string } } }).response === "object" &&
        (e as { response?: { data?: { detail?: string } } }).response !== null &&
        "data" in (e as { response?: { data?: { detail?: string } } }).response! &&
        typeof ((e as { response?: { data?: { detail?: string } } }).response as { data?: { detail?: string } }).data === "object" &&
        ((e as { response?: { data?: { detail?: string } } }).response as { data?: { detail?: string } }).data !== null &&
        "detail" in ((e as { response?: { data?: { detail?: string } } }).response as { data?: { detail?: string } }).data!
      ) {
        alert(
          ((e as { response?: { data?: { detail?: string } } }).response as { data?: { detail?: string } }).data!.detail
        );
      } else {
        alert("Greška pri dodavanju pjesme u playlistu.");
      }
      setShowPlaylistModal(false);
      setSelectedSong(null);
    }
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

  if (loading) return <Loading />;
  if (!album)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>Album nije pronađen.</h2>
        </div>
        <Footer />
      </div>
    );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.albumBg}>
        <div className={styles.container}>
          <div className={styles.albumMain}>
            <div className={styles.albumSlikaWrap}>
              <img
                src={album.putanjaSlika || "/logo.gif"}
                alt={album.naziv}
                className={styles.albumSlika}
              />
              <button className={styles.playBtn} onClick={handlePlayAlbum} title={t("play_album") || "Pusti album"}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff">
                  <polygon points="12,8 36,22 12,36" />
                </svg>
              </button>
              <button
                className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
                onClick={handleLike}
                title={liked ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj album"}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill={liked ? "#f6b6d8ff" : "#fff"}>
                  <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                </svg>
                <span>{likeCount}</span>
              </button>
              <button
                className={styles.repeatBtn}
                onClick={() => setRepeatAll((r) => !r)}
                title={repeatAll ? t("cancel") || "Isključi ponavljanje albuma" : t("play_album") || "Ponovi album"}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="#fff">
                  <g>
                    <path d="M7 14v-2a7 7 0 0 1 7-7h4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 7l-2-2-2 2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M21 14v2a7 7 0 0 1-7 7h-4" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                    <path d="M7 21l2 2 2-2" stroke="#ffe6ec" strokeWidth="2" fill="none" />
                  </g>
                </svg>
              </button>
            </div>
            <div className={styles.albumInfo}>
              <h2 className={styles.albumNaziv}>{album.naziv}</h2>
              <div className={styles.albumOpis}>{album.opis}</div>
              <div className={styles.albumMeta}>
                <span>
                  {t("number_of_songs") || "Broj pjesama"}: <b>{pjesme.length}</b>
                </span>
                <span>
                  {t("number_of_likes") || "Lajkova"}: <b>{likeCount}</b>
                </span>
               
              </div>
            </div>
          </div>
          <div className={styles.pjesmeSection}>
            <h3 className={styles.pjesmeTitle}>{t("songs_on_album") || "Pjesme na albumu"}</h3>
            {pjesme.length === 0 ? (
              <div className={styles.noSongs}>{t("no_songs_on_album") || "Nema pjesama na ovom albumu."}</div>
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
                    <tr key={p.id}>
                      <td>{idx + 1}</td>
                      <td>{p.naziv}</td>
                      <td>{formatTrajanje(p.trajanjeSekunde)}</td>
                      <td>{p.korisnik?.korisnicko_ime || ""}</td>
                      <td>
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
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likeMap[p.id] ? "#f2a9d0ff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                        <button
                          className={styles.songAddBtn}
                          onClick={() => handleAddToPlaylist(p)}
                          title={t("add_song_to_playlist") || "Dodaj u playlistu"}
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec">
            <rect x="18" y="8" width="8" height="28" />
            <rect x="8" y="18" width="28" height="8" />
          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {showPlaylistModal && (
          <div className={styles.modalOverlay} onClick={() => setShowPlaylistModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h4>{t("add_song_to_playlist") || "Dodaj pjesmu u playlistu"}</h4>
              <ul className={styles.playlistList}>
                {playlists.map((pl) => (
                  <li key={pl.id}>
                    <button
                      className={styles.playlistBtn}
                      onClick={() => handleSelectPlaylist(pl.id)}
                    >
                      {pl.naziv}
                    </button>
                  </li>
                ))}
              </ul>
              <button className={styles.closeModalBtn} onClick={() => setShowPlaylistModal(false)}>
                {t("close") || "Zatvori"}
              </button>
            </div>
          </div>
        )}
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

export default Album;

