import React, { useMemo, useCallback, useState, memo, useEffect } from "react";
// import styles from "./AdminPanel.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma, Album, Playlista } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pjesme" | "albumi" | "playliste">("pjesme");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPjesme, setLocalPjesme] = useState<Pjesma[]>([]);
  const [localAlbumi, setLocalAlbumi] = useState<Album[]>([]);
  const repeatAll = false;
  const { t } = useTranslation();
  const [styles, setStyles] = useState<Styles>({});

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./AdminPanelWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./AdminPanel.module.css");
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

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["admin", "pjesme"],
    queryFn: async () => axios.get(`${API_BASE}/pjesme/`).then(r => r.data || []),
    staleTime: 0,
  });
  const albumiQ = useQuery<Album[]>({
    queryKey: ["admin", "albumi"],
    queryFn: async () => axios.get(`${API_BASE}/albumi/`).then(r => r.data || []),
    staleTime: 0,
  });
  const playlisteQ = useQuery<Playlista[]>({
    queryKey: ["admin", "playliste"],
    queryFn: async () => axios.get(`${API_BASE}/playliste/`).then(r => r.data || []),
    staleTime: 0,
  });

  useEffect(() => {
    setLocalPjesme(pjesmeQ.data || []);
  }, [pjesmeQ.data]);

  useEffect(() => {
    setLocalAlbumi(albumiQ.data || []);
  }, [albumiQ.data]);

  const loading = useMemo(() => pjesmeQ.isLoading || albumiQ.isLoading || playlisteQ.isLoading, [pjesmeQ.isLoading, albumiQ.isLoading, playlisteQ.isLoading]);
  const pjesme = localPjesme;
  const albumi = localAlbumi;
  const playliste = useMemo(() => playlisteQ.data || [], [playlisteQ.data]);

  type Artist = { id: string; korisnicko_ime: string };
  const [songArtists, setSongArtists] = useState<Record<number, Artist[]>>({});

  useEffect(() => {
    if (!pjesme.length) {
      setSongArtists({});
      return;
    }
        const loadArtists = async () => {
          try {
            const vezeRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
            const veze = vezeRes.data || [];
            const result: Record<number, Artist[]> = {};
            for (const song of pjesme) {
              const songVeze = veze.filter((v: { pjesmaID: number; potvrdjeno?: boolean }) => v.pjesmaID === song.id && v.potvrdjeno);
              const artists = await Promise.all(
                songVeze.map((v: { izvodjacID: string }) =>
                  axios.get(`${API_BASE}/korisnici/${v.izvodjacID}`).then(r => r.data as Artist).catch(() => null)
                )
              );
              result[song.id] = artists.filter(Boolean) as Artist[];
            }
            setSongArtists(result);
          } catch {
            setSongArtists({});
          }
        };
    loadArtists();
  }, [pjesme]);

  const filtriranePjesme = useMemo(() => {
    const filtered = pjesme.filter(p => p.naziv.toLowerCase().includes(search.toLowerCase()));
    return filtered.sort((a, b) => Number(a.odobreno) - Number(b.odobreno));
  }, [pjesme, search]);
  const filtriraniAlbumi = useMemo(() => albumi.filter(a => a.naziv.toLowerCase().includes(search.toLowerCase())), [albumi, search]);
  const filtriranePlayliste = useMemo(() => playliste.filter(pl => pl.naziv.toLowerCase().includes(search.toLowerCase())), [playliste, search]);

  const odobriPjesmuMut = useMutation({
    mutationFn: async (vars: { pjesma: Pjesma; odobreno: boolean }) => {
      await axios.put(`${API_BASE}/pjesme/${vars.pjesma.id}`, { ...vars.pjesma, odobreno: vars.odobreno }, { headers: { "Content-Type": "multipart/form-data" } });
      return vars;
    },
   onSuccess: () => {
    qc.invalidateQueries({
      queryKey: ["admin", "pjesme"],
    });

    setSuccess("Status pjesme je ažuriran.");
    setError(null);
  },
    onError: (_e, vars) => {
    setLocalPjesme(prev =>
      prev.map(x =>
        x.id === vars.pjesma.id
          ? { ...x, odobreno: !vars.odobreno }
          : x
      )
    );
  }
  });

  const odobriAlbumMut = useMutation({
    mutationFn: async (vars: { album: Album; odobreno: boolean }) => {
      await axios.put(`${API_BASE}/albumi/${vars.album.id}`, { ...vars.album, odobreno: vars.odobreno }, { headers: { "Content-Type": "multipart/form-data" } });
      return vars;
    },
   onSuccess: () => {
    qc.invalidateQueries({
      queryKey: ["admin", "albumi"],
    });

    setSuccess("Status albuma je ažuriran.");
    setError(null);
  },
    onError: (_e, vars) => {
      setLocalAlbumi(prev =>
        prev.map(x =>
          x.id === vars.album.id
            ? { ...x, odobreno: !vars.odobreno }
            : x
        )
      );
    }
  });

  const obrisiPjesmuMut = useMutation({
    mutationFn: async (pjesmaId: number) => {
      await axios.delete(`${API_BASE}/pjesme/${pjesmaId}`);
      return pjesmaId;
    },
    onSuccess: (pjesmaId) => {
      qc.setQueryData<Pjesma[] | undefined>(["admin", "pjesme"], old => (old || []).filter(p => p.id !== pjesmaId));
      setSuccess("Pjesma je obrisana.");
      setError(null);
    },
    onError: () => {
      setError("Greška pri brisanju pjesme.");
      setSuccess(null);
    },
  });

  const obrisiAlbumMut = useMutation({
    mutationFn: async (albumId: number) => {
      await axios.delete(`${API_BASE}/albumi/${albumId}`);
      return albumId;
    },
    onSuccess: (albumId) => {
      qc.setQueryData<Album[] | undefined>(["admin", "albumi"], old => (old || []).filter(a => a.id !== albumId));
      setSuccess("Album je obrisan.");
      setError(null);
    },
    onError: () => {
      setError("Greška pri brisanju albuma.");
      setSuccess(null);
    },
  });

  const obrisiPlaylistuMut = useMutation({
    mutationFn: async (playlistaId: number) => {
      await axios.delete(`${API_BASE}/playliste/${playlistaId}`);
      return playlistaId;
    },
    onSuccess: (playlistaId) => {
      qc.setQueryData<Playlista[] | undefined>(["admin", "playliste"], old => (old || []).filter(pl => pl.id !== playlistaId));
      setSuccess("Playlista je obrisana.");
      setError(null);
    },
    onError: () => {
      setError("Greška pri brisanju playliste.");
      setSuccess(null);
    },
  });

  const playPlaylistSongsMut = useMutation({
    mutationFn: async (playlistId: number) => {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const ids: number[] = res.data || [];
      const pjesmeArr = await Promise.all(
        ids.map(id => axios.get(`${API_BASE}/pjesme/${id}`).then(r => r.data).catch(() => null))
      );
      return (pjesmeArr.filter(Boolean) as Pjesma[]);
    },
    onSuccess: (playlistSongs) => {
      if (playlistSongs.length === 0) return;
      window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: playlistSongs, idx: 0, repeatAll } }));
    },
    onError: () => setError("Greška pri dohvatu pjesama iz playliste."),
  });

  const handleOdobriPjesmu = useCallback((p: Pjesma, odobreno: boolean) => {
    const artists = songArtists[p.id] || [];
    if (artists.length === 0) {
      setError(t("no_accepted_artists") || "Song has no accepted artists. Cannot approve.");
      return;
    }

    setLocalPjesme(prev =>
      prev.map(x =>
        x.id === p.id
          ? { ...x, odobreno }
          : x
      )
    );

    odobriPjesmuMut.mutate({ pjesma: p, odobreno });
  }, [odobriPjesmuMut, songArtists, setError, t]);

  const handleOdobriAlbum = useCallback((a: Album, odobreno: boolean) => {
    setLocalAlbumi(prev =>
      prev.map(x =>
        x.id === a.id
          ? { ...x, odobreno }
          : x
      )
    );

    odobriAlbumMut.mutate({ album: a, odobreno });
  }, [odobriAlbumMut]);

  const handlePlaySong = useCallback((p: Pjesma) => {
    if (!p.putanjaAudio) return;
    window.dispatchEvent(new CustomEvent("globalAudioPlay", { detail: { id: p.id, src: p.putanjaAudio, title: p.naziv, putanjaGif: p.putanjaGif, putanjaSlika: p.putanjaSlika, korisnikID: p.korisnikID } }));
  }, []);

  const handlePlayAlbumSongs = useCallback((albumId: number) => {
    const albumSongs = pjesme.filter(p => p.albumID === albumId && p.putanjaAudio);
    if (albumSongs.length === 0) return;
    window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: albumSongs, idx: 0, repeatAll } }));
  }, [pjesme, repeatAll]);

  const handlePlayPlaylistSongs = useCallback((playlistId: number) => {
    playPlaylistSongsMut.mutate(playlistId);
  }, [playPlaylistSongsMut]);

  const handleObrisiPjesmu = useCallback((pjesmaId: number) => {
    if (!window.confirm("Da li ste sigurni da želite obrisati ovu pjesmu?")) return;
    setError(null);
    setSuccess(null);
    obrisiPjesmuMut.mutate(pjesmaId);
  }, [obrisiPjesmuMut]);

  const handleObrisiAlbum = useCallback((albumId: number) => {
    if (!window.confirm("Da li ste sigurni da želite obrisati ovaj album?")) return;
    setError(null);
    setSuccess(null);
    obrisiAlbumMut.mutate(albumId);
  }, [obrisiAlbumMut]);

  const handleObrisiPlaylistu = useCallback((playlistaId: number) => {
    if (!window.confirm("Da li ste sigurni da želite obrisati ovu playlistu?")) return;
    setError(null);
    setSuccess(null);
    obrisiPlaylistuMut.mutate(playlistaId);
  }, [obrisiPlaylistuMut]);

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.adminBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("admin_panel") || "Admin panel"}</h2>
          <div className={styles.tabContainer}>
            <button className={`${styles.tabButton} ${activeTab === "pjesme" ? styles.active : ""}`} onClick={() => { setActiveTab("pjesme"); setSearch(""); }}>
              {t("songs") || "Pjesme"}
            </button>
            <button className={`${styles.tabButton} ${activeTab === "albumi" ? styles.active : ""}`} onClick={() => { setActiveTab("albumi"); setSearch(""); }}>
              {t("albums") || "Albumi"}
            </button>
            <button className={`${styles.tabButton} ${activeTab === "playliste" ? styles.active : ""}`} onClick={() => { setActiveTab("playliste"); setSearch(""); }}>
              {t("playlists") || "Playliste"}
            </button>
          </div>
          <input
            type="text"
            placeholder={activeTab === "pjesme" ? t("search_songs") || "Pretraži pjesme..." : activeTab === "albumi" ? t("search_albums") || "Pretraži albume..." : t("search_playlists") || "Pretraži playliste..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : (
            <>
              {success && <div className={styles.success}>{success}</div>}
              {error && <div className={styles.error}>{error}</div>}

              {activeTab === "pjesme" && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>{t("songs")}</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("song_name") || "Naziv"}</th>
                        <th>{t("artist") || "Izvođač"}</th>
                        <th>{t("play") || "Preslušaj"}</th>
                        <th>{t("approved") || "Odobreno"}</th>
                        <th>{t("action") || "Akcija"}</th>
                        <th>{t("delete") || "Obriši"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtriranePjesme.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ color: "#b3b3b3", textAlign: "center" }}>
                            {pjesme.length === 0 ? t("no_songs_user") || "Nema pjesama." : t("no_results") || "Nema rezultata."}
                          </td>
                        </tr>
                      ) : (
                        filtriranePjesme.map((p) => (
                          <tr key={p.id}>
                            <td data-label={t("song_name") || "Naziv"}>
                              <Link className={styles.link} to={`/pjesma/${p.id}`}>{p.naziv}</Link>
                            </td>
                            <td data-label={t("artist") || "Izvođač"}>
                              {songArtists[p.id] && songArtists[p.id].length > 0 ? (
                                songArtists[p.id].map((artist, idx) => (
                                  <React.Fragment key={artist.id}>
                                    <Link className={styles.link} to={`/izvodjac/${artist.id}`}>
                                      {artist.korisnicko_ime}
                                    </Link>
                                    {idx < songArtists[p.id].length - 1 && ' & '}
                                  </React.Fragment>
                                ))
                              ) : (
                                <Link className={styles.link} to={`/izvodjac/${p.korisnik?.id || p.korisnikID}`}>
                                  {p.korisnik?.korisnicko_ime || p.korisnikID}
                                </Link>
                              )}
                            </td>
                            <td data-label={t("play") || "Preslušaj"}>
                              {p.putanjaAudio && (
                                <button className={styles.btn} style={{ background: "#2ecc40", margin: 0 }} onClick={() => handlePlaySong(p)} title={t("play_song") || "Preslušaj pjesmu"}>
                                  ▶
                                </button>
                              )}
                            </td>
                            <td data-label={t("approved") || "Odobreno"}>
                              <span className={p.odobreno ? styles.odobreno : styles.neodobreno}>
                                {p.odobreno ? t("yes") || "DA" : t("no") || "NE"}
                              </span>
                            </td>
                            <td data-label={t("action") || "Akcija"}>
                              <button className={styles.btn} style={{ background: p.odobreno ? "#e754a2" : "#b91d95" }} onClick={() => handleOdobriPjesmu(p, !p.odobreno)}>
                                {p.odobreno ? t("revoke_approval") || "Poništi odobrenje" : t("approve") || "Odobri"}
                              </button>
                            </td>
                            <td data-label={t("delete") || "Obriši"}>
                              <button className={styles.btn} style={{ background: "#e53935", margin: 0 }} onClick={() => handleObrisiPjesmu(p.id)} title={t("delete") || "Obriši pjesmu"}>
                                {t("delete") || "Obriši"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              )}

              {activeTab === "albumi" && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>{t("albums")}</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("album_name") || "Naziv"}</th>
                        <th>{t("artist") || "Korisnik"}</th>
                        <th>{t("number_of_likes") || "Broj lajkova"}</th>
                        <th>{t("play") || "Preslušaj"}</th>
                        <th>{t("approved") || "Odobreno"}</th>
                        <th>{t("action") || "Akcija"}</th>
                        <th>{t("delete") || "Obriši"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtriraniAlbumi.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ color: "#b3b3b3", textAlign: "center" }}>
                            {albumi.length === 0 ? t("no_albums_user") || "Nema albuma." : t("no_results") || "Nema rezultata."}
                          </td>
                        </tr>
                      ) : (
                        filtriraniAlbumi.map((a) => (
                          <tr key={a.id}>
                            <td data-label={t("album_name") || "Naziv"}>
                              <Link className={styles.link} to={`/album/${a.id}`}>{a.naziv}</Link>
                            </td>
                            <td data-label={t("artist") || "Korisnik"}>
                              <Link className={styles.link} to={`/izvodjac/${a.korisnik?.id || a.korisnikID}`}>
                                {a.korisnik?.korisnicko_ime || a.korisnikID}
                              </Link>
                            </td>
                            <td data-label={t("number_of_likes") || "Broj lajkova"}>{a.brojLajkova}</td>
                            <td data-label={t("play") || "Preslušaj"}>
                              <button className={styles.btn} style={{ background: "#2ecc40", margin: 0 }} onClick={() => handlePlayAlbumSongs(a.id)} title={t("play_album") || "Preslušaj album"}>
                                ▶
                              </button>
                            </td>
                            <td data-label={t("approved") || "Odobreno"}>
                              <span className={a.odobreno ? styles.odobreno : styles.neodobreno}>
                                {a.odobreno ? t("yes") || "DA" : t("no") || "NE"}
                              </span>
                            </td>
                            <td data-label={t("action") || "Akcija"}>
                              <button className={styles.btn} style={{ background: a.odobreno ? "#e754a2" : "#b91d95" }} onClick={() => handleOdobriAlbum(a, !a.odobreno)}>
                                {a.odobreno ? t("revoke_approval") || "Poništi odobrenje" : t("approve") || "Odobri"}
                              </button>
                            </td>
                            <td data-label={t("delete") || "Obriši"}>
                              <button className={styles.btn} style={{ background: "#e53935", margin: 0 }} onClick={() => handleObrisiAlbum(a.id)} title={t("delete") || "Obriši album"}>
                                {t("delete") || "Obriši"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              )}

              {activeTab === "playliste" && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>{t("playlists")}</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("playlist_name") || "Naziv"}</th>
                        <th>{t("artist") || "Korisnik"}</th>
                        <th>{t("number_of_likes") || "Broj lajkova"}</th>
                        <th>{t("play") || "Preslušaj"}</th>
                        <th>{t("delete") || "Obriši"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtriranePlayliste.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ color: "#b3b3b3", textAlign: "center" }}>
                            {playliste.length === 0 ? t("no_playlists_user") || "Nema playlista." : t("no_results") || "Nema rezultata."}
                          </td>
                        </tr>
                      ) : (
                        filtriranePlayliste.map((pl) => (
                          <tr key={pl.id}>
                            <td data-label={t("playlist_name") || "Naziv"}>
                              <Link className={styles.link} to={`/playlista/${pl.id}`}>{pl.naziv}</Link>
                            </td>
                            <td data-label={t("artist") || "Korisnik"}>
                              <Link className={styles.link} to={`/izvodjac/${pl.korisnik?.id || pl.korisnikID}`}>
                                {pl.korisnik?.korisnicko_ime || pl.korisnikID}
                              </Link>
                            </td>
                            <td data-label={t("number_of_likes") || "Broj lajkova"}>{pl.brojLajkova}</td>
                            <td data-label={t("play") || "Preslušaj"}>
                              <button className={styles.btn} style={{ background: "#2ecc40", margin: 0 }} onClick={() => handlePlayPlaylistSongs(pl.id)} title={t("play_playlist") || "Preslušaj playlistu"}>
                                ▶
                              </button>
                            </td>
                            <td data-label={t("delete") || "Obriši"}>
                              <button className={styles.btn} style={{ background: "#e53935", margin: 0 }} onClick={() => handleObrisiPlaylistu(pl.id)} title={t("delete") || "Obriši playlistu"}>
                                {t("delete") || "Obriši"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(AdminPanel);
