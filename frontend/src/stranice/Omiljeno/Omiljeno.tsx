import React, { useMemo, useState, useCallback, memo, useEffect } from "react";
// import styles from "./Omiljeno.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { Pjesma, Album, Playlista, Korisnik, KorisnikPjesma, KorisnikAlbum, KorisnikPlaylista } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Omiljeno: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./OmiljenoWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Omiljeno.module.css");
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

  const { "*": tipRaw } = useParams(); 
  const tip = (tipRaw ?? window.location.pathname.split("/").pop() ?? "").toLowerCase(); 
  const [showPlaylistModal, setShowPlaylistModal] = useState<null | number>(null);
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  const likedSongsQ = useQuery<KorisnikPjesmaWithData[]>({
    queryKey: ["likedSongs", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/korisnik_pjesma/korisnik/${korisnikID}`).then((r) => r.data || []),
    initialData: [],
  });
  const likedAlbumsQ = useQuery<KorisnikAlbumWithData[]>({
    queryKey: ["likedAlbums", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/korisnik_album/korisnik/${korisnikID}`).then((r) => r.data || []),
    initialData: [],
  });
  const likedPlaylistsQ = useQuery<KorisnikPlaylistaWithData[]>({
    queryKey: ["likedPlaylists", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/korisnik_playlista/korisnik/${korisnikID}`).then((r) => r.data || []),
    initialData: [],
  });
  const korisniciQ = useQuery<Korisnik[]>({
    queryKey: ["korisnici"],
    queryFn: async () => axios.get(`${API_BASE}/korisnici/`).then((r) => r.data || []),
    initialData: [],
  });
  const allPlaylistsQ = useQuery<Playlista[]>({
    queryKey: ["playliste"],
    queryFn: async () => axios.get(`${API_BASE}/playliste/`).then((r) => r.data || []),
    initialData: [],
  });

  interface KorisnikPjesmaWithData extends KorisnikPjesma { pjesma?: Pjesma; korisnik?: Korisnik; }
  interface KorisnikAlbumWithData extends KorisnikAlbum { album?: Album; korisnik?: Korisnik; }
  interface KorisnikPlaylistaWithData extends KorisnikPlaylista { playlista?: Playlista; korisnik?: Korisnik; }

  const omiljenePjesme = useMemo(() => {
    return (likedSongsQ.data || [])
      .filter((l) => l.pjesma && l.pjesma.odobreno && l.pjesma.putanjaAudio)
      .map((l) => ({ korisnikID: l.korisnikID, pjesmaID: l.pjesmaID, kreiranDatumVrijeme: l.kreiranDatumVrijeme }));
  }, [likedSongsQ.data]);
  const pjesme = useMemo(() => {
    return (likedSongsQ.data || [])
      .filter((l) => l.pjesma && l.pjesma.odobreno && l.pjesma.putanjaAudio)
      .map((l) => ({ ...(l.pjesma as Pjesma), korisnik: l.korisnik || l.pjesma?.korisnik || null } as Pjesma));
  }, [likedSongsQ.data]);

  const omiljeniAlbumi = useMemo(() => {
    return (likedAlbumsQ.data || [])
      .filter((l) => l.album && l.album.odobreno)
      .map((l) => ({ korisnikID: l.korisnikID, albumID: l.albumID, kreiranDatumVrijeme: l.kreiranDatumVrijeme }));
  }, [likedAlbumsQ.data]);
  const albumi = useMemo(() => {
    return (likedAlbumsQ.data || [])
      .filter((l) => l.album && l.album.odobreno)
      .map((l) => ({ ...(l.album as Album), korisnik: l.korisnik || l.album?.korisnik || null } as Album));
  }, [likedAlbumsQ.data]);

  const omiljenePlayliste = useMemo(() => {
    return (likedPlaylistsQ.data || [])
      .filter((l) => l.playlista && l.playlista.javno)
      .map((l) => ({ korisnikID: l.korisnikID, playlistaID: l.playlistaID, kreiranDatumVrijeme: l.kreiranDatumVrijeme }));
  }, [likedPlaylistsQ.data]);
  const playliste = useMemo(() => {
    return (likedPlaylistsQ.data || [])
      .filter((l) => l.playlista && l.playlista.javno)
      .map((l) => ({ ...(l.playlista as Playlista), korisnik: l.korisnik || l.playlista?.korisnik || null } as Playlista));
  }, [likedPlaylistsQ.data]);

  const likeMap = useMemo(() => {
    const m: Record<number, boolean> = {};
    omiljenePjesme.forEach((l) => (m[l.pjesmaID] = true));
    return m;
  }, [omiljenePjesme]);
  const likeAlbumMap = useMemo(() => {
    const m: Record<number, boolean> = {};
    omiljeniAlbumi.forEach((l) => (m[l.albumID] = true));
    return m;
  }, [omiljeniAlbumi]);
  const likePlaylistMap = useMemo(() => {
    const m: Record<number, boolean> = {};
    omiljenePlayliste.forEach((l) => (m[l.playlistaID] = true));
    return m;
  }, [omiljenePlayliste]);

  const likeSongMut = useMutation({
    mutationFn: async (p: Pjesma) => {
      if (!korisnikID || !p.id) return;
      if (likeMap[p.id]) {
        await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${p.id}`);
      } else {
        await axios.post(`${API_BASE}/korisnik_pjesma/`, { korisnikID, pjesmaID: p.id, kreiranDatumVrijeme: new Date().toISOString() });
      }
      return p.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["likedSongs", korisnikID] });
    },
  });

  const likeAlbumMut = useMutation({
    mutationFn: async (albumId: number) => {
      if (!korisnikID || !albumId) return;
      if (likeAlbumMap[albumId]) {
        await axios.delete(`${API_BASE}/korisnik_album/${korisnikID}/${albumId}`);
      } else {
        await axios.post(`${API_BASE}/korisnik_album/`, { korisnikID, albumID: albumId, kreiranDatumVrijeme: new Date().toISOString() });
      }
      return albumId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["likedAlbums", korisnikID] });
    },
  });

  const likePlaylistMut = useMutation({
    mutationFn: async (playlistaId: number) => {
      if (!korisnikID || !playlistaId) return;
      if (likePlaylistMap[playlistaId]) {
        await axios.delete(`${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`);
      } else {
        await axios.post(`${API_BASE}/korisnik_playlista/`, { korisnikID, playlistaID: playlistaId, kreiranDatumVrijeme: new Date().toISOString() });
      }
      return playlistaId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["likedPlaylists", korisnikID] });
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

  const playPlaylistSongsMut = useMutation({
    mutationFn: async (playlistId: number) => {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const ids: number[] = res.data || [];
      if (ids.length === 0) return [] as Pjesma[];
      const pjesmeArr = await Promise.all(ids.map((id) => axios.get(`${API_BASE}/pjesme/${id}`).then((r) => r.data).catch(() => null)));
      return (pjesmeArr.filter(Boolean) as Pjesma[]);
    },
    onSuccess: (playlistSongs) => {
      if (!playlistSongs || playlistSongs.length === 0) return;
      window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: playlistSongs, idx: 0, repeatAll: false } }));
    },
    onError: () => console.error("Greška pri dohvaćanju pjesama iz playliste"),
  });

  const handlePlay = useCallback((p: Pjesma) => {
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: { id: p.id, src: p.putanjaAudio, title: p.naziv, putanjaGif: p.putanjaGif, putanjaSlika: p.putanjaSlika, korisnikID: p.korisnikID } }));
  }, []);

  const handlePlayAlbum = useCallback((albumId: number) => {
    const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
    if (albumSongs.length === 0) return;
    window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: albumSongs, idx: 0, repeatAll: false } }));
  }, [pjesme]);

  const handlePlayPlaylist = useCallback((playlistId: number) => {
    playPlaylistSongsMut.mutate(playlistId);
  }, [playPlaylistSongsMut]);

  const handleLike = useCallback((p: Pjesma) => {
    likeSongMut.mutate(p);
  }, [likeSongMut]);

  const handleLikeAlbum = useCallback((albumId: number) => {
    likeAlbumMut.mutate(albumId);
  }, [likeAlbumMut]);

  const handleLikePlaylist = useCallback((playlistaId: number) => {
    likePlaylistMut.mutate(playlistaId);
  }, [likePlaylistMut]);

  const handleAddToPlaylist = useCallback((pjesmaID: number, playlistaID: number) => {
    addToPlaylistMut.mutate({ pjesmaID, playlistaID });
  }, [addToPlaylistMut]);

  const loading = useMemo(() => {
    return (
      likedSongsQ.isLoading || likedAlbumsQ.isLoading || likedPlaylistsQ.isLoading || korisniciQ.isLoading || allPlaylistsQ.isLoading
    );
  }, [likedSongsQ.isLoading, likedAlbumsQ.isLoading, likedPlaylistsQ.isLoading, korisniciQ.isLoading, allPlaylistsQ.isLoading]);

  if (loading) return <Loading />;

  const korisnici = korisniciQ.data || [];
  const playlists = allPlaylistsQ.data || [];

  let content = null as React.ReactNode;
  if (tip === "pjesme" || tip === "albumi" || tip === "playliste") {
    if (tip === "pjesme") {
      content = (
        <div>
          <h2 className={styles.title}>{t("favorites_songs") || "Omiljene pjesme"}</h2>
          {omiljenePjesme.length === 0 ? (
            <div className={styles.noItems}>{t("no_favorites_songs") || "Nemate omiljenih pjesama."}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("image")}</th>
                  <th>{t("songs")}</th>
                  <th>{t("artists")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {omiljenePjesme.map((kp, idx) => {
                  const p = pjesme.find((pp) => pp.id === kp.pjesmaID && pp.odobreno); 
                  if (!p) return null;
                  const izvodjac = korisnici.find((k) => k.id === p.korisnikID);
                  return (
                    <tr key={kp.pjesmaID}>
                      <td>{idx + 1}</td>
                      <td>
                        <Link to={`/pjesma/${p.id}`}>
                          <img src={p.putanjaSlika || "/logo.gif"} alt={p.naziv} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        </Link>
                      </td>
                      <td>
                        <Link to={`/pjesma/${p.id}`} className="link">{p.naziv}</Link>
                      </td>
                      <td>
                        {izvodjac ? (
                          <Link to={`/izvodjac/${izvodjac.id}`} className="link">{izvodjac.korisnicko_ime}</Link>
                        ) : ""}
                      </td>
                      <td>
                        {p.putanjaAudio && (
                          <>
                            <button
                              style={{ background: "#b91d95", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", cursor: "pointer", marginRight: 6 }}
                              onClick={() => handlePlay(p)}
                              title="Pusti pjesmu"
                            >
                              <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                                <polygon points="12,8 36,22 12,36" />
                              </svg>
                            </button>
                            <button
                              style={{
                                background: likeMap[p.id] ? "#e754a2" : "#efe6edff",
                                border: "none",
                                borderRadius: "50%",
                                width: 38,
                                height: 38,
                                color: "#fff",
                                cursor: "pointer",
                                marginRight: 6
                              }}
                              onClick={() => handleLike(p)}
                              title={likeMap[p.id] ? "Ukloni lajk" : "Lajkuj pjesmu"}
                            >
                              <svg width="22" height="22" viewBox="0 0 28 28" fill={likeMap[p.id] ? "#fdb9ddff" : "#fff"}>
                                <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                              </svg>
                            </button>
                            <button
                              style={{
                                background: "#b91d95",
                                border: "none",
                                borderRadius: "50%",
                                width: 38,
                                height: 38,
                                color: "#fff",
                                cursor: "pointer"
                              }}
                              onClick={() => setShowPlaylistModal(p.id)}
                              title="Dodaj u playlistu"
                            >
                              <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec">
                                <rect x="18" y="8" width="8" height="28" />
                                <rect x="8" y="18" width="28" height="8" />
                              </svg>
                            </button>
                            {showPlaylistModal === p.id && (
                              <div
                                style={{
                                  position: "fixed",
                                  inset: 0,
                                  background: "rgba(24,24,24,0.85)",
                                  zIndex: 3000,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() => setShowPlaylistModal(null)}
                              >
                                <div
                                  style={{
                                    background: "#232323",
                                    borderRadius: 14,
                                    padding: "32px 24px 24px 24px",
                                    minWidth: 320,
                                    boxShadow: "0 4px 24px #b91d9533",
                                    textAlign: "center",
                                  }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <h4 style={{ color: "#fff", marginBottom: 18 }}>Dodaj pjesmu u playlistu</h4>
                                  <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 18 }}>
                                    {playlists.map((pl) => (
                                      <li key={pl.id} style={{ marginBottom: 8 }}>
                                        <button
                                          style={{
                                            background: "#b91d95",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 8,
                                            padding: "10px 0",
                                            fontSize: "1.08rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            width: "100%",
                                            transition: "background 0.18s",
                                          }}
                                          onClick={() => handleAddToPlaylist(p.id, pl.id)}
                                        >
                                          {pl.naziv}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                  <button
                                    style={{
                                      background: "#232323",
                                      color: "#ffe6ec",
                                      border: "1px solid #b91d95",
                                      borderRadius: 8,
                                      padding: "10px 0",
                                      fontSize: "1rem",
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      width: "100%",
                                      transition: "background 0.18s, color 0.18s",
                                    }}
                                    onClick={() => setShowPlaylistModal(null)}
                                  >
                                    Zatvori
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    } else if (tip === "albumi") {
      content = (
        <div>
          <h2 className={styles.title}>{t("favorites_albums") || "Omiljeni albumi"}</h2>
          {omiljeniAlbumi.length === 0 ? (
            <div className={styles.noItems}>{t("no_favorites_albums") || "Nemate omiljenih albuma."}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("image")}</th>
                  <th>{t("albums")}</th>
                  <th>{t("artists")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {omiljeniAlbumi.map((ka, idx) => {
                  const a = albumi.find((aa) => aa.id === ka.albumID);
                  if (!a) return null;
                  const izvodjac = korisnici.find((k) => k.id === a.korisnikID);
                  return (
                    <tr key={ka.albumID}>
                      <td>{idx + 1}</td>
                      <td>
                        <Link to={`/album/${a.id}`}>
                          <img src={a.putanjaSlika || "/logo.gif"} alt={a.naziv} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        </Link>
                      </td>
                      <td>
                        <Link to={`/album/${a.id}`} className="link">{a.naziv}</Link>
                      </td>
                      <td>
                        {izvodjac ? (
                          <Link to={`/izvodjac/${izvodjac.id}`} className="link">{izvodjac.korisnicko_ime}</Link>
                        ) : ""}
                      </td>
                      <td>
                        <button
                          style={{ background: "#b91d95", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", cursor: "pointer", marginRight: 6 }}
                          onClick={() => handlePlayAlbum(a.id)}
                          title="Pusti album"
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                        <button
                          style={{
                            background: likeAlbumMap[a.id] ? "#e754a2" : "#efe6edff",
                            border: "none",
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            color: "#fff",
                            cursor: "pointer"
                          }}
                          onClick={() => handleLikeAlbum(a.id)}
                          title={likeAlbumMap[a.id] ? "Ukloni lajk" : "Lajkuj album"}
                        >
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likeAlbumMap[a.id] ? "#fdb9ddff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    } else if (tip === "playliste") {
      content = (
        <div>
          <h2 className={styles.title}>{t("favorites_playlists") || "Omiljene playliste"}</h2>
          {omiljenePlayliste.length === 0 ? (
            <div className={styles.noItems}>{t("no_favorites_playlists") || "Nemate omiljenih plejlista."}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("image")}</th>
                  <th>{t("playlists")}</th>
                  <th>{t("profile")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {omiljenePlayliste.map((kpl, idx) => {
                  const pl = playliste.find((pll) => pll.id === kpl.playlistaID);
                  if (!pl) return null;
                  const vlasnik = korisnici.find((k) => k.id === pl.korisnikID);
                  return (
                    <tr key={kpl.playlistaID}>
                      <td>{idx + 1}</td>
                      <td>
                        <Link to={`/playlista/${pl.id}`}>
                          <img src={pl.putanjaSlika || "/logo.gif"} alt={pl.naziv} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        </Link>
                      </td>
                      <td>
                        <Link to={`/playlista/${pl.id}`} className="link">{pl.naziv}</Link>
                      </td>
                      <td>
                        {vlasnik ? (
                          <Link to={`/izvodjac/${vlasnik.id}`} className="link">{vlasnik.korisnicko_ime}</Link>
                        ) : ""}
                      </td>
                      <td>
                        <button
                          style={{ background: "#b91d95", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", cursor: "pointer", marginRight: 6 }}
                          onClick={() => handlePlayPlaylist(pl.id)}
                          title="Pusti playlistu"
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                        <button
                          style={{
                            background: likePlaylistMap[pl.id] ? "#e754a2" : "#efe6edff",
                            border: "none",
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            color: "#fff",
                            cursor: "pointer"
                          }}
                          onClick={() => handleLikePlaylist(pl.id)}
                          title={likePlaylistMap[pl.id] ? "Ukloni lajk" : "Lajkuj playlistu"}
                        >
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likePlaylistMap[pl.id] ? "#fdb9ddff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    }
  } else {
    content = <div className={styles.noItems}>{t("unknown_favorites_type") || "Nepoznat tip omiljenih."}</div>;
  }

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.pjesmaBg}>
        <div className={styles.container}>
          {content}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(Omiljeno);

