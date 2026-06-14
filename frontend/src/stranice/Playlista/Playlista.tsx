import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
// import styles from "./Playlista.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Pjesma, Playlista as PlaylistaType } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';
import { playPreview } from "../../utils/playPreview";

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Playlista: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      try {
        const current = theme || localStorage.getItem("decibel_tema") || "dark";
        if (current === "light") {
          const mod = await import("./PlaylistaWhite.module.css");
          setStyles(mod.default || (mod as unknown as Styles));
        } else {
          const mod = await import("./Playlista.module.css");
          setStyles(mod.default || (mod as unknown as Styles));
        }
      } catch (e) {
        console.error("Failed to load Playlista theme styles:", e);
      }
    };
    loadThemeStyles();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") loadThemeStyles(e.newValue || undefined);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { playlistaId } = useParams<{ playlistaId: string }>();
  const [likeCount, setLikeCount] = useState<number>(0);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const draggingRow = useRef<number | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState<null | number>(null);
  const [likePlaylist, setLikePlaylist] = useState(false);
  const [localSongs, setLocalSongs] = useState<Pjesma[]>([]);
  const [playlistLocked, setPlaylistLocked] = useState(false);
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);


  const [songArtists, setSongArtists] = useState<Record<number, { id: string; korisnicko_ime: string }[]>>({});

  const playlistaQ = useQuery<PlaylistaType | null>({
    queryKey: ["playlista", playlistaId],
    enabled: Boolean(playlistaId),
    queryFn: async () => axios.get(`${API_BASE}/playliste/${playlistaId}`).then((r) => r.data as PlaylistaType),
  });

  const songsQ = useQuery<Pjesma[]>({
    queryKey: ["playlistSongs", playlistaId],
    enabled: Boolean(playlistaId),
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistaId}`);
      const ids: number[] = res.data || [];
      if (ids.length === 0) return [] as Pjesma[];
      const arr = await Promise.all(ids.map((id) => axios.get(`${API_BASE}/pjesme/${id}`).then((r) => r.data).catch(() => null)));
      return arr.filter(Boolean) as Pjesma[];
    },
    initialData: [],
  });


  useEffect(() => {
    setLocalSongs(songsQ.data || []);
  }, [songsQ.data]);

  
  const playlistsQ = useQuery<PlaylistaType[]>({
    queryKey: ["playliste"],
    queryFn: async () => axios.get(`${API_BASE}/playliste/`).then((r) => r.data || []),
    initialData: [],
  });

 

  useEffect(() => {
    if (playlistaQ.data?.brojLajkova != null) setLikeCount(playlistaQ.data.brojLajkova);
  }, [playlistaQ.data?.brojLajkova]);

 
  useEffect(() => {
    if (!korisnikID || !playlistaId) {
      setLikePlaylist(false);
      return;
    }

    axios
      .get(
        `${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`
      )
      .then((res) => setLikePlaylist(res.data.liked))
      .catch(() => setLikePlaylist(false));
  }, [korisnikID, playlistaId]);

  const pjesme = localSongs;
  const [likedSongs, setLikedSongs] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadLikedSongs = async () => {
      if (!korisnikID || !pjesme.length) {
        setLikedSongs({});
        return;
      }
      const result: Record<number, boolean> = {};
      await Promise.all(
        pjesme.map(async (p) => {
          try {
            const res = await axios.get(`${API_BASE}/korisnik_pjesma/${korisnikID}/${p.id}`);
            result[p.id] = !!res.data.liked;
          } catch {
            result[p.id] = false;
          }
        })
      );
      setLikedSongs(result);
    };
    loadLikedSongs();
  }, [korisnikID, pjesme]);
  const playlists = useMemo(() => playlistsQ.data || [], [playlistsQ.data]);
  const isOwner = useMemo(() => (playlistaQ.data?.korisnikID && korisnikID ? playlistaQ.data?.korisnikID === korisnikID : false), [playlistaQ.data?.korisnikID, korisnikID]);

  useEffect(() => {
    const loadArtists = async () => {
      if (!pjesme.length) {
        setSongArtists({});
        return;
      }
      try {
        const vezeRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
        const veze = vezeRes.data || [];
        const result: Record<number, { id: string; korisnicko_ime: string }[]> = {};
        for (const song of pjesme) {
          const songVeze = veze.filter((v: { pjesmaID: number }) => v.pjesmaID === song.id);
          const artists = await Promise.all(
            songVeze.map((v: { izvodjacID: string }) =>
              axios.get(`${API_BASE}/korisnici/${v.izvodjacID}`).then((r) => r.data).catch(() => null)
            )
          );
          result[song.id] = artists.filter(Boolean) as { id: string; korisnicko_ime: string }[];
        }
        setSongArtists(result);
      } catch {
        setSongArtists({});
      }
    };
    loadArtists();
  }, [pjesme]);

  const likeSongMut = useMutation({
    mutationFn: async ({ pjesmaId, wasLiked }: { pjesmaId: number; wasLiked: boolean }) => {
      if (!korisnikID) return;
      if (wasLiked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${pjesmaId}`);
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, { korisnikID, pjesmaID: pjesmaId, kreiranDatumVrijeme: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["korisnik_pjesma", korisnikID] });
    },
  });

  const addToPlaylistMut = useMutation({
    mutationFn: async (vars: { pjesmaID: number; playlistaID: number }) => {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, vars);
    },
    onSuccess: () => {
      setShowPlaylistModal(null);
      alert("Pjesma je dodana u playlistu!");
    },
    onError: () => alert("Greška pri dodavanju pjesme u playlistu."),
  });

  const likePlaylistMut = useMutation({
    mutationFn: async (wasLiked: boolean) => {
      if (!korisnikID || !playlistaId) return;

      if (wasLiked) {
        await axios.delete(
          `${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`
        );
      } else {
        await axios.post(`${API_BASE}/korisnik_playlista/`, {
          korisnikID,
          playlistaID: Number(playlistaId),
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      }
    },
  });

  const reorderMut = useMutation({
    mutationFn: async (vars: { draggedPjesmaId: number; prevId: number | null }) => {
      await axios.post(`${API_BASE}/pjesma_playlista/promjeni-redoslijed/`, { playlistaID: Number(playlistaId), pjesmaID: vars.draggedPjesmaId, nova_pozicija_iza_pjesmeID: vars.prevId });
    },
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: ["playlistSongs", playlistaId]
        });
      },

      onSettled: () => {
        setTimeout(() => {
          setPlaylistLocked(false);
        }, 4000);
      },
  });

  const removeSongMut = useMutation({
    mutationFn: async (pjesmaId: number) => {
      if (!playlistaId) return;

      await axios.delete(
        `${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`
      );
    },

    onMutate: async (pjesmaId) => {
      setLocalSongs(prev =>
        prev.filter(p => p.id !== pjesmaId)
      );
    },

    onError: () => {
      qc.invalidateQueries({
        queryKey: ["playlistSongs", playlistaId],
      });

      alert("Greška pri izbacivanju pjesme iz playliste.");
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["playlistSongs", playlistaId],
      });
    },

    onSettled: () => {
      setTimeout(() => {
        setPlaylistLocked(false);
      }, 4000);
    },
  });

  const handlePlaySong = useCallback((p: Pjesma) => {
    if (!p.putanjaAudio) 
    playPreview(p.putanjaAudio?? "");
        

    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: { src: p.putanjaAudio, title: p.naziv, putanjaGif: p.putanjaGif, putanjaSlika: p.putanjaSlika, korisnikID: p.korisnikID } }));
  }, [ ]);

  const handlePlayPlaylist = useCallback(() => {
    if (pjesme.length === 0) return;
    window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: pjesme, idx: 0 } }));
  }, [pjesme]);

  const handleLikeSong = useCallback((pjesmaId: number) => {
    if (!korisnikID) return;
    const wasLiked = likedSongs[pjesmaId] || false;
    setLikedSongs((prev) => ({ ...prev, [pjesmaId]: !wasLiked }));
    likeSongMut.mutate({ pjesmaId, wasLiked });
  }, [likeSongMut, korisnikID, likedSongs]);

  const handleAddToPlaylist = useCallback((pjesmaID: number, plID: number) => {
    addToPlaylistMut.mutate({ pjesmaID, playlistaID: plID });
  }, [addToPlaylistMut]);

  const handleLikeThisPlaylist = useCallback(() => {
    if (likePlaylist) {
      setLikePlaylist(false);
      setLikeCount((c) => Math.max(0, c - 1));
      likePlaylistMut.mutate(true);
    } else {
      setLikePlaylist(true);
      setLikeCount((c) => c + 1);
      likePlaylistMut.mutate(false);
    }
  }, [likePlaylist, likePlaylistMut]);

  const handleDragStart = useCallback((idx: number) => {
    setDraggedIdx(idx);
    draggingRow.current = idx;
  }, []);

  const handleDragOver = useCallback((idx: number) => {
    setDragOverIdx(idx);
  }, []);

 const handleDrop = useCallback(async (idx: number) => {
    if (playlistLocked) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const draggedPjesma = pjesme[draggedIdx];

    const temp = [...pjesme];
    const [moved] = temp.splice(draggedIdx, 1);

    const insertIndex = idx;

    temp.splice(insertIndex, 0, moved);

    setLocalSongs(temp);

    let prevId: number | null = null;

    if (insertIndex !== 0) {
      prevId = temp[insertIndex - 1].id;
    }

    try {
      setPlaylistLocked(true);
      
      await reorderMut.mutateAsync({
        draggedPjesmaId: draggedPjesma.id,
        prevId,
      });
    } catch {
      setLocalSongs(pjesme);
    }

    setDraggedIdx(null);
    setDragOverIdx(null);
  }, [draggedIdx, pjesme, reorderMut, playlistLocked]);

  const handleRemoveSong = useCallback((pjesmaId: number) => {
    if (!playlistaId || playlistLocked) return;

    setPlaylistLocked(true);

    removeSongMut.mutate(pjesmaId);
  }, [removeSongMut, playlistaId, playlistLocked]);

  const formatTrajanje = useCallback((sec?: number) => {
    if (!sec) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const loading = playlistaQ.isLoading || songsQ.isLoading;
  if (loading) return <Loading />;
  if (!playlistaQ.data) {
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
  }

  const playlista = playlistaQ.data;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.playlistaBg}>
        <div className={styles.container}>
          <div className={styles.playlistaMain}>
            <div className={styles.playlistaSlikaWrap}>
              <img src={playlista.putanjaSlika || "/logo.gif"} alt={playlista.naziv} className={styles.playlistaSlika} />
              <div className={styles.playlistActions}>
                <button className={styles.playBtn} onClick={handlePlayPlaylist} title={t("play_playlist") || "Pusti playlistu"}>
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff"><polygon points="12,8 36,22 12,36" /></svg>
                </button>
                <button className={`${styles.likeBtn} ${likePlaylist ? styles.liked : ""}`} onClick={handleLikeThisPlaylist} title={likePlaylist ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj playlistu"}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill={likePlaylist ? "#f7aed5ff" : "#fff"}>
                    <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                  </svg>
                  <span>{likeCount}</span>
                </button>
              </div>
            </div>
            <div className={styles.playlistaInfo}>
              <h2 className={styles.playlistaNaziv}>{playlista.naziv}</h2>
              {playlista.korisnik && (
                <div className={styles.playlistaOpis} style={{ cursor: "pointer" }}
                onClick={() =>
                    playlista.korisnik?.id &&
                    (window.location.href = `/izvodjac/${playlista.korisnik.id}`)
                  }
>
                    {playlista.korisnik.korisnicko_ime}
                  
                </div>
              )}
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
                    <tr key={p.id} draggable={isOwner && !playlistLocked} onDragStart={() => handleDragStart(idx)} onDragOver={(e) => { e.preventDefault(); handleDragOver(idx); }} onDrop={() => handleDrop(idx)} className={`${styles.songRow} ${dragOverIdx === idx ? styles.dragOver : draggedIdx === idx ? styles.dragging : ""}`}>
                      <td data-label="#" className={styles.songNumber}>{idx + 1}</td>
                      <td data-label={t("song_name") || "Naziv"} className={styles.songNameCell}>
                          <div className={styles.songInfo}>
                            <img src={p.putanjaSlika || p.putanjaGif || "/logo.gif"} alt={p.naziv} className={styles.songImage} />
                            <a href={`/pjesma/${p.id}`} className={styles.songNameLink}>{p.naziv}</a>
                          </div>
                        </td>
                      <td data-label={t("duration_seconds") || "Trajanje"}>{formatTrajanje(p.trajanjeSekunde)}</td>
                      <td data-label={t("artist") || "Izvođač"} className={styles.artistCell}>
                        {(songArtists[p.id] || []).map((izv, idx) => (
                          <a key={izv.id} href={`/izvodjac/${izv.id}`} className={styles.artistLink}>
                            {izv.korisnicko_ime}{idx < (songArtists[p.id] || []).length - 1 ? " & " : ""}
                          </a>
                        ))}
                      </td>
                      <td data-label={t("actions") || "Akcije"} className={styles.songActions}>
                        <button className={styles.songPlayBtn} onClick={() => handlePlaySong(p)} title={t("play_song") || "Pusti pjesmu"}>
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff"><polygon points="12,8 36,22 12,36" /></svg>
                        </button>
                        <button className={`${styles.songPlayBtn} ${likedSongs[p.id] ? styles.liked : ""}`} onClick={() => handleLikeSong(p.id)} title={likedSongs[p.id] ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj pjesmu"}>
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likedSongs[p.id] ? "#f6b8d9ff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                        <button className={styles.songPlayBtn} onClick={() => setShowPlaylistModal(p.id)} title={t("add_song_to_playlist") || "Dodaj u playlistu"}>
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec"><rect x="18" y="8" width="8" height="28" /><rect x="8" y="18" width="28" height="8" /></svg>
                        </button>
                        {isOwner && (
                          <button  disabled={playlistLocked} className={styles.removeSongBtn} onClick={() => handleRemoveSong(p.id)} title={t("remove") || "Izbaci iz playliste"}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                          </button>
                        )}
                        {showPlaylistModal === p.id && (
                          <div className={styles.modalOverlay} onClick={() => setShowPlaylistModal(null)}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                              <h4 className={styles.modalTitle}>{t("add_song_to_playlist") || "Dodaj pjesmu u playlistu"}</h4>
                              <ul className={styles.playlistList}>
                                {playlists.filter((pl) => String(pl.id) !== String(playlistaId)).map((pl) => (
                                  <li key={pl.id} className={styles.playlistItem}>
                                    <button className={styles.playlistBtn} onClick={() => handleAddToPlaylist(p.id, pl.id)}>
                                      {pl.naziv}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <button className={styles.modalCloseBtn} onClick={() => setShowPlaylistModal(null)}>{t("close") || "Zatvori"}</button>
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

export default Playlista;




