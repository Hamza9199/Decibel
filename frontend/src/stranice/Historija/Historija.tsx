import React, { useMemo, useCallback, useState, memo, useEffect } from "react";
// import styles from "./Historija.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma, HistorijaSlusanja, Playlista } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Historija: React.FC = () => {
  const { t } = useTranslation();
  const [showPlaylistModal, setShowPlaylistModal] = useState<null | number>(null);
  const [styles, setStyles] = useState<Styles>({});

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./HistorijaWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Historija.module.css");
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

  const historijaQ = useQuery<HistorijaSlusanja[]>({
    queryKey: ["historija", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/historija/`);
      const sve: HistorijaSlusanja[] = r.data || [];
      return sve
        .filter((h) => h.korisnikID === korisnikID)
        .sort(
          (a, b) => new Date(b.kreiranDatumVrijeme || "").getTime() - new Date(a.kreiranDatumVrijeme || "").getTime()
        );
    },
  });

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme"],
    queryFn: async () => axios.get(`${API_BASE}/pjesme/`).then((r) => r.data || []),
  });

  const playlisteQ = useQuery<Playlista[]>({
    queryKey: ["playliste", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/playliste/`).then((r) => r.data || []),
    initialData: [],
  });

  const likeMapQ = useQuery<Record<number, boolean>>({
    queryKey: ["likeMap", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/korisnik_pjesma/`);
      const veze = (r.data || []) as { korisnikID: string; pjesmaID: number }[];
      const map: Record<number, boolean> = {};
      veze.filter((v) => v.korisnikID === korisnikID).forEach((v) => (map[v.pjesmaID] = true));
      return map;
    },
    initialData: {},
  });

  const likeMutation = useMutation({
    mutationFn: async (vars: { pjesmaId: number; liked: boolean }) => {
      if (!korisnikID || !vars.pjesmaId) return;
      if (vars.liked) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${vars.pjesmaId}`);
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID,
          pjesmaID: vars.pjesmaId,
          kreiranDatumVrijeme: new Date().toISOString(),
        });
      }
      return vars.pjesmaId;
    },
    onSuccess: (pId) => {
      qc.setQueryData<Record<number, boolean>>(["likeMap", korisnikID], (old) => ({ ...(old || {}), [pId as number]: !((old || {})[pId as number]) }));
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async (vars: { pjesmaID: number; playlistaID: number }) => {
      await axios.post(`${API_BASE}/pjesma_playlista/dodaj-na-kraj/`, vars);
    },
    onSuccess: () => {
      setShowPlaylistModal(null);
    },
    onError: () => {
      alert("Greška pri dodavanju pjesme u playlistu.");
    },
  });

  const historijaPjesme = useMemo(() => {
    const h = historijaQ.data || [];
    const p = pjesmeQ.data || [];
    return h
      .map((x) => ({ ...x, pjesma: p.find((pp) => pp.id === x.pjesmaID) }))
      .filter((x) => x.pjesma && x.pjesma.odobreno);
  }, [historijaQ.data, pjesmeQ.data]);

  const loading = useMemo(() => {
    const a = historijaQ.isLoading || pjesmeQ.isLoading;
    const b = korisnikID ? playlisteQ.isLoading || likeMapQ.isLoading : false;
    return a || b;
  }, [historijaQ.isLoading, pjesmeQ.isLoading, playlisteQ.isLoading, likeMapQ.isLoading, korisnikID]);

  const handleLike = useCallback(
    (pjesmaId: number) => {
      const lm = likeMapQ.data || {};
      likeMutation.mutate({ pjesmaId, liked: !!lm[pjesmaId] });
    },
    [likeMutation, likeMapQ.data]
  );

  const handleAddToPlaylist = useCallback(
    (pjesmaID: number, playlistaID: number) => {
      addToPlaylistMutation.mutate({ pjesmaID, playlistaID });
    },
    [addToPlaylistMutation]
  );

  if (loading) return <Loading />;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.historijaBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("history")}</h2>
          {historijaPjesme.length === 0 ? (
            <div className={styles.noSongs}>{t("no_history")}</div>
          ) : (
            <table className={styles.pjesmeTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("image") || "Slika"}</th>
                  <th>{t("songs")}</th>
                  <th>{t("artists")}</th>
                  <th>{t("actions") || "Akcije"}</th>
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
                        title={t("play_song")}
                      >
                        <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.likeBtn} ${(likeMapQ.data || {})[h.pjesmaID] ? styles.liked : ""}`}
                        onClick={() => handleLike(h.pjesmaID)}
                        title={(likeMapQ.data || {})[h.pjesmaID] ? t("remove") : t("add_to_favorites") || "Lajkuj pjesmu"}
                      >
                        <svg width="22" height="22" viewBox="0 0 28 28" fill={(likeMapQ.data || {})[h.pjesmaID] ? "#fcbaddff" : "#fff"}>
                          <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                        </svg>
                      </button>
                      <button
                        className={styles.addBtn}
                        onClick={() => setShowPlaylistModal(h.pjesmaID)}
                        title={t("add_to_playlist")}
                      >
                        <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec">
                          <rect x="18" y="8" width="8" height="28" />
                          <rect x="8" y="18" width="28" height="8" />
                        </svg>
                      </button>
                      {showPlaylistModal === h.pjesmaID && (
                        <div className={styles.modalOverlay} onClick={() => setShowPlaylistModal(null)}>
                          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <h4>{t("add_song_to_playlist")}</h4>
                            <ul className={styles.playlistList}>
                              {(playlisteQ.data || []).map((pl) => (
                                <li key={pl.id}>
                                  <button className={styles.playlistBtn} onClick={() => handleAddToPlaylist(h.pjesmaID, pl.id)}>
                                    {pl.naziv}
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <button className={styles.closeModalBtn} onClick={() => setShowPlaylistModal(null)}>
                              {t("close")}
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

export default memo(Historija);
