import React, { useMemo, useCallback, useState, memo, useEffect } from "react";
// import styles from "./Album.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams } from "react-router-dom";
import type { Album as AlbumType, Pjesma, Playlista } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Album: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const { t } = useTranslation();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Pjesma | null>(null);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [styles, setStyles] = useState<Styles>({});

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./AlbumWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Album.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      }
    };
    loadThemeStyles();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") loadThemeStyles(e.newValue || undefined);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const korisnikID = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("korisnik") || "");
      return u?.id || "";
    } catch {
      return "";
    }
  }, []);

  const albumQ = useQuery<AlbumType | null>({
    queryKey: ["album", albumId],
    enabled: Boolean(albumId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/albumi/${albumId}`);
      return r.data as AlbumType;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setLikeCount(albumQ.data?.brojLajkova || 0);
  }, [albumQ.data?.brojLajkova]);

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["albumSongs", albumId],
    enabled: Boolean(albumId),
    queryFn: async () => {
      try {
        const r1 = await axios.get(`${API_BASE}/pjesme/album/${albumId}`);
        return (r1.data || []) as Pjesma[];
      } catch {
        const r = await axios.get(`${API_BASE}/pjesme/`);
        const all: Pjesma[] = r.data || [];
        return all.filter((p) => String(p.albumID) === String(albumId));
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const playlistsQ = useQuery<Playlista[]>({
    queryKey: ["playlists", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/playliste/`).then((r) => r.data || []),
    initialData: [],
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const likedAlbumQ = useQuery<boolean>({
    queryKey: ["likedAlbum", korisnikID, albumId],
    enabled: Boolean(korisnikID && albumId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/korisnik_album/`);
      const veze = (r.data || []) as { korisnikID: string; albumID: number }[];
      return !!veze.find((v) => v.korisnikID === korisnikID && String(v.albumID) === String(albumId));
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const likedSongsMapQ = useQuery<Record<number, boolean>>({
    queryKey: ["likedSongsMap", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const veze = (r.data || []) as { korisnikID: string; pjesmaID: number }[];
      const map: Record<number, boolean> = {};
      veze.filter((v) => v.korisnikID === korisnikID).forEach((v) => (map[v.pjesmaID] = true));
      return map;
    },
    initialData: {},
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const liked = likedAlbumQ.data || false;
  const likeMap = likedSongsMapQ.data || {};

  const albumIdNum = useMemo(() => (albumId ? Number(albumId) : undefined), [albumId]);

  const likeAlbumMut = useMutation({
    mutationFn: async () => {
      if (!albumIdNum || !korisnikID) return;
      if (liked) {
        await axios.delete(`${API_BASE}/korisnik_album/${korisnikID}/${albumIdNum}`);
      } else {
        await axios.post(`${API_BASE}/korisnik_album/`, {
          korisnikID,
          albumID: albumIdNum,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      }
    },
    onMutate: async () => {
      setLikeCount((prev) => prev + (liked ? -1 : 1));
    },
    onError: () => {
      setLikeCount((prev) => prev + (liked ? 1 : -1));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["likedAlbum", korisnikID, albumId] });
    },
  });

  const likeSongMut = useMutation({
    mutationFn: async (pjesmaId: number) => {
      if (!korisnikID || !pjesmaId) return;
      if (likeMap[pjesmaId]) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${pjesmaId}`);
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: pjesmaId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      }
      return pjesmaId;
    },
    onSuccess: (pjesmaId) => {
      qc.setQueryData<Record<number, boolean>>(["likedSongsMap", korisnikID], (old) => ({ ...(old || {}), [pjesmaId as number]: !likeMap[pjesmaId as number] }));
    },
  });

  const addToPlaylistMut = useMutation({
    mutationFn: async ({ playlistaId, pjesmaId }: { playlistaId: number; pjesmaId: number }) => {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, { pjesmaID: pjesmaId, playlistaID: playlistaId });
    },
    onSuccess: () => {
      setShowPlaylistModal(false);
      setSelectedSong(null);
      alert("Pjesma je dodana u playlistu!");
    },
    onError: (e: unknown) => {
      let msg = "Greška pri dodavanju pjesme u playlistu.";
      if (typeof e === "object" && e !== null && "response" in e && (e as { response?: { data?: { detail?: string } } }).response?.data?.detail) {
        msg = (e as { response: { data: { detail: string } } }).response.data.detail;
      }
      alert(msg);
      setShowPlaylistModal(false);
      setSelectedSong(null);
    },
  });

  const handlePlaySong = useCallback((p: Pjesma) => {
    if (!p.putanjaAudio) return;
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: { src: p.putanjaAudio, title: p.naziv, putanjaGif: p.putanjaGif, putanjaSlika: p.putanjaSlika, korisnikID: p.korisnikID } }));
  }, []);

  const handlePlayAlbum = useCallback(() => {
    const list = pjesmeQ.data || [];
    if (list.length === 0) return;
    window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: list, idx: 0 } }));
  }, [pjesmeQ.data]);

  const handleLike = useCallback(() => {
    likeAlbumMut.mutate();
  }, [likeAlbumMut]);

  const handleAddToPlaylist = useCallback((p: Pjesma) => {
    setSelectedSong(p);
    setShowPlaylistModal(true);
  }, []);

  const handleSelectPlaylist = useCallback((playlistId: number) => {
    if (!selectedSong) return;
    addToPlaylistMut.mutate({ playlistaId: playlistId, pjesmaId: selectedSong.id });
  }, [addToPlaylistMut, selectedSong]);

  const handleLikeSong = useCallback((pjesmaId: number) => {
    likeSongMut.mutate(pjesmaId);
  }, [likeSongMut]);

  const loading = useMemo(() => {
    return albumQ.isLoading || pjesmeQ.isLoading;
  }, [albumQ.isLoading, pjesmeQ.isLoading]);

  if (loading) return <Loading />;
  if (!albumQ.data)
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

  const album = albumQ.data as AlbumType;
  const pjesme = pjesmeQ.data || [];
  const playlists = playlistsQ.data || [];

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.albumBg}>
        <div className={styles.container}>
          <div className={styles.albumMain}>
            <div className={styles.albumSlikaWrap}>
              <img src={album.putanjaSlika || "/logo.gif"} alt={album.naziv} className={styles.albumSlika} />
              <button className={styles.playBtn} onClick={handlePlayAlbum} title={t("play_album") || "Pusti album"}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff">
                  <polygon points="12,8 36,22 12,36" />
                </svg>
              </button>
              <button className={`${styles.likeBtn} ${liked ? styles.liked : ""}`} onClick={handleLike} title={liked ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj album"}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill={liked ? "#f6b6d8ff" : "#fff"}>
                  <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                </svg>
                <span>{likeCount}</span>
              </button>
            </div>
            <div className={styles.albumInfo}>
              <h2 className={styles.albumNaziv}>{album.naziv}</h2>
              <div className={styles.albumOpis}>{album.opis}</div>
              
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
                    <tr key={p.id} className={styles.songRow}>
                      <td data-label="#" className={styles.songNumber}>{idx + 1}</td>
                      <td data-label={t("song_name") || "Naziv"} className={styles.songNameCell}>
                        <div className={styles.songInfo}>
                          <img src={p.putanjaSlika || p.putanjaGif || "/logo.gif"} alt={p.naziv} className={styles.songImage} />
                          <div className={styles.songDetails}>
                            <span className={styles.songName}>{p.naziv}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label={t("duration_seconds") || "Trajanje"}>{formatTrajanje(p.trajanjeSekunde)}</td>
                      <td data-label={t("artist") || "Izvođač"}>{p.korisnik?.korisnicko_ime || ""}</td>
                      <td data-label={t("actions") || "Akcije"} className={styles.songActions}>
                        <button className={styles.songPlayBtn} onClick={() => handlePlaySong(p)} title={t("play_song") || "Pusti pjesmu"}>
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                        <button className={`${styles.songPlayBtn} ${likeMap[p.id] ? styles.liked : ""}`} onClick={() => handleLikeSong(p.id)} title={likeMap[p.id] ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj pjesmu"}>
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likeMap[p.id] ? "#f2a9d0ff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                        <button className={styles.songAddBtn} onClick={() => handleAddToPlaylist(p)} title={t("add_song_to_playlist") || "Dodaj u playlistu"}>
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
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h4 className={styles.modalTitle}>{t("add_song_to_playlist") || "Dodaj pjesmu u playlistu"}</h4>
              <ul className={styles.playlistList}>
                {playlists.map((pl) => (
                  <li key={pl.id} className={styles.playlistItem}>
                    <button className={styles.playlistBtn} onClick={() => handleSelectPlaylist(pl.id)}>
                      {pl.naziv}
                    </button>
                  </li>
                ))}
              </ul>
              <button className={styles.modalCloseBtn} onClick={() => setShowPlaylistModal(false)}>
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

export default memo(Album);

