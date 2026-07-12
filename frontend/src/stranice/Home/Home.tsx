import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import axios from "axios";
import { Pjesma, Album, Playlista, Korisnik, IzvodjacPjesmaVeza } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { playPreview } from "../../utils/playPreview";

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;


const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNavigate = useCallback((path: string) => {
    setTimeout(() => navigate(path), 10);
  }, [navigate]);

  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [activeSong, setActiveSong] = useState<Pjesma | null>(null);
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [postDataDelayDone, setPostDataDelayDone] = useState(false);
  const [pjesmaIzvodjaci, setPjesmaIzvodjaci] = useState<
    Record<number, Korisnik[]>
  >({});
  const repeatAll = false;

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      try {
        const current = theme || localStorage.getItem("decibel_tema") || "dark";
        if (current === "light") {
          const mod = await import("./HomeWhite.module.css");
          setStyles(mod.default || (mod as unknown as Styles));
        } else {
          const mod = await import("./Home.module.css");
          setStyles(mod.default || (mod as unknown as Styles));
        }
      } catch (e) {
        console.error("Failed to load theme styles for Home:", e);
      }
    };
    const boot = async () => {
      await loadThemeStyles();
      setCssReady(true);
    };
    boot();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") loadThemeStyles(e.newValue || undefined);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme"],
    queryFn: async () => axios.get(`${API_BASE}/pjesme/`).then((res) => res.data || []),
  });
  
  const albumiQ = useQuery<Album[]>({
    queryKey: ["albumi"],
    queryFn: async () => axios.get(`${API_BASE}/albumi/`).then((res) => res.data || []),
  });

  const playlisteQ = useQuery<Playlista[]>({
    queryKey: ["playliste"],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_BASE}/playliste/`);
        return res.data || [];
      } catch (e) {
        console.error("playliste fetch failed:", e);
        throw e;
      }
    },
    
  });

  const korisniciQ = useQuery<Korisnik[]>({
    queryKey: ["korisnici"],
    queryFn: async () => axios.get(`${API_BASE}/korisnici/`).then((res) => res.data || []),
  });


  const queriesLoading = useMemo(
    () => pjesmeQ.isLoading || albumiQ.isLoading || playlisteQ.isLoading || korisniciQ.isLoading || pjesmaIzvodjaci === null,
    [pjesmeQ.isLoading, albumiQ.isLoading, playlisteQ.isLoading, korisniciQ.isLoading, pjesmaIzvodjaci]
  );
  const dataReady = useMemo(() => !queriesLoading, [queriesLoading]);

  useEffect(() => {
    if (cssReady && dataReady) {
      setPostDataDelayDone(false);
      const t = setTimeout(() => setPostDataDelayDone(true), 200);
      return () => clearTimeout(t);
    }
    setPostDataDelayDone(false);
  }, [cssReady, dataReady]);

  const showLoading = useMemo(
    () => queriesLoading || !cssReady || !postDataDelayDone,
    [queriesLoading, cssReady, postDataDelayDone]
  );

  const sample = <T,>(arr: readonly T[] | undefined, n: number): T[] => {
    if (!arr) return [];
    const shuffled = arr.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const pjesme = useMemo(
  () => sample((pjesmeQ.data || []).filter((p) => p.odobreno), 10),
  [pjesmeQ.data]
  );
  const albumi = useMemo(
    () => sample((albumiQ.data || []).filter((a) => a.odobreno), 10),
    [albumiQ.data]
  );
  const playliste = useMemo(
    () => sample((playlisteQ.data || []).filter((pl) => pl.javno), 10),
    [playlisteQ.data]
  );
  const korisnici = useMemo(
    () =>
      sample(
        (korisniciQ.data || []).filter(
          (k) => k.rola === "izvodac" && k.statusKorisnika !== "suspendovan"
        ),
        10
      ),
    [korisniciQ.data]
  );


  useEffect(() => {
  const loadArtists = async () => {
    try {
      const vezeRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const veze: IzvodjacPjesmaVeza[] = vezeRes.data || [];

      const result: Record<number, Korisnik[]> = {};

      for (const pjesma of pjesme) {
        const songVeze = veze.filter(
          (v) => v.pjesmaID === pjesma.id
        );

        const artists = await Promise.all(
          songVeze.map((v) =>
            axios
              .get(`${API_BASE}/korisnici/${v.izvodjacID}`)
              .then((r) => r.data)
              .catch(() => null)
          )
        );

        result[pjesma.id] = artists.filter(Boolean);
      }

      setPjesmaIzvodjaci(result);
    } catch {
      setPjesmaIzvodjaci({});
    }
  };

  if (pjesme.length) {
    loadArtists();
  }
}, [pjesme]);

  useEffect(() => {
    if (activeSong) {
      const bgGif = activeSong.putanjaGif;
      const bgSlika = activeSong.putanjaSlika;
      window.dispatchEvent(new CustomEvent("activeSongBg", { detail: { gif: bgGif, slika: bgSlika } }));
    }
  }, [activeSong]);

  const handlePlay = useCallback(
    async (id: number, audioUrl?: string) => {
      setActiveSongId(id);
      const song = (pjesme || []).find((p) => p.id === id);
      setActiveSong(song && audioUrl ? { ...song, putanjaAudio: audioUrl } : null);
      if (song && audioUrl) {
        
        await playPreview(
          audioUrl
        );
                
        window.dispatchEvent(
          new CustomEvent("globalAudioPlay", {
            detail: {
              id: id,
              src: audioUrl,
              title: song.naziv,
              putanjaGif: song.putanjaGif,
              putanjaSlika: song.putanjaSlika,
              korisnikID: song.korisnikID,
            },
          })
        );
      }
    },
    [pjesme]
  );

  const handlePlayAlbum = useCallback(
    (albumId: number) => {
      const albumSongs = (pjesme || []).filter((p) => p.albumID === albumId && p.putanjaAudio);
      if (albumSongs.length === 0) return;
      window.dispatchEvent(
        new CustomEvent("globalAudioPlaylist", {
          detail: {
            playlist: albumSongs,
            idx: 0,
            repeatAll,
          },
        })
      );
    },
    [pjesme, repeatAll]
  );

  const playPlaylistSongsMut = useMutation({
    mutationFn: async (playlistId: number) => {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const idsZaDohvat: number[] = res.data || [];
      if (idsZaDohvat.length === 0) return [] as Pjesma[];
      const pjesmeArr = await Promise.all(
        idsZaDohvat.map((id) =>
          axios
            .get(`${API_BASE}/pjesme/${id}`)
            .then((r) => r.data)
            .catch(() => null)
        )
      );
      return (pjesmeArr.filter(Boolean) as Pjesma[]);
    },
    onSuccess: (playlistSongs) => {
      if (!playlistSongs || playlistSongs.length === 0) return;
      window.dispatchEvent(
        new CustomEvent("globalAudioPlaylist", {
          detail: {
            playlist: playlistSongs,
            idx: 0,
            repeatAll,
          },
        })
      );
    },
  });

  const handlePlayPlaylist = useCallback(

    (playlistId: number) => {
      console.log("PLAY PLAYLIST", playlistId);
      playPlaylistSongsMut.mutate(playlistId);
    },
    [playPlaylistSongsMut]
  );

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section style={{ marginBottom: 48 }}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );

  console.log('playlisteQ FULL:', {
  status: playlisteQ.status,
  fetchStatus: playlisteQ.fetchStatus,
  data: playlisteQ.data,
  error: playlisteQ.error,
  isError: playlisteQ.isError,
});

  if (showLoading) return <Loading />;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.spotifyBg}>
        <div className={styles.container}>
          <Section title={t("songs")}>
            <div className={styles.gridRow}>
              {pjesme.map((p) => (
                <div key={p.id} className={`${styles.card} ${activeSongId === p.id ? styles.activeCard : ""}`}>
                  <div className={styles.cardImageWrap}>
                    {p.putanjaSlika ? (
                      <img src={p.putanjaSlika} alt={p.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                    {p.putanjaAudio && (
                      <button className={styles.playButton} onClick={() => handlePlay(p.id, p.putanjaAudio)} title="Play">
                        <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="link" onClick={() => handleNavigate(`/pjesma/${p.id}`)} style={{ cursor: "pointer" }}>
                    <div className={styles.cardTitle}>{p.naziv}</div>
                  </div>
                      <div className={styles.cardDesc}>
                      {(pjesmaIzvodjaci[p.id] || []).map((izv, idx) => (
                        <span
                          key={izv.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleNavigate(`/izvodjac/${izv.id}`)}
                        >
                          {izv.korisnicko_ime}
                          {idx < (pjesmaIzvodjaci[p.id] || []).length - 1 ? " & " : ""}
                        </span>
                      ))}
                    </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("albums")}>
            <div className={styles.gridRow}>
              {albumi.map((a) => (
                <div key={a.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {a.putanjaSlika ? (
                      <img
                        src={a.putanjaSlika}
                        alt={a.naziv}
                        className={styles.cardImage}
                      />
                    ) : (
                      <div
                        className={styles.cardImage}
                        style={{ background: "#222" }}
                      />
                    )}

                    <button
                      className={styles.playButton}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayAlbum(a.id);
                      }}
                      title="Pusti album"
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>

                  <div className="link" onClick={() => handleNavigate(`/album/${a.id}`)} style={{ cursor: "pointer" }}>
                    <div className={styles.cardTitle}>{a.naziv}</div>
                  </div>

                  <div className="link" onClick={() => handleNavigate(`/izvodjac/${a.korisnik?.id}`)} style={{ cursor: "pointer" }}>
                    <div className={styles.cardDesc}>
                      {a.korisnik?.korisnicko_ime || <span>&nbsp;</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("playlists")}>
            <div className={styles.gridRow}>
              {playliste.map((pl) => (
                <div key={pl.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {pl.putanjaSlika ? (
                      <img
                        src={pl.putanjaSlika}
                        alt={pl.naziv}
                        className={styles.cardImage}
                      />
                    ) : (
                      <div
                        className={styles.cardImage}
                        style={{ background: "#222" }}
                      />
                    )}

                    <button
                      className={styles.playButton}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayPlaylist(pl.id);
                      }}
                      title="Pusti playlistu"
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>

                  <div className="link" onClick={() => handleNavigate(`/playlista/${pl.id}`)} style={{ cursor: "pointer" }}>
                    <div className={styles.cardTitle}>{pl.naziv}</div>
                  </div>

                  <div className="link" onClick={() => handleNavigate(`/izvodjac/${pl.korisnik?.id}`)} style={{ cursor: "pointer" }}>
                    <div className={styles.cardDesc}>
                      {pl.korisnik?.korisnicko_ime || <span>&nbsp;</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("artists")}>
            <div className={styles.gridRow}>
              {korisnici
                .map((k) => (
                  <div key={k.id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      {k.putanjaProfilneSlike ? (
                          <img
                            src={k.putanjaProfilneSlike || "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.iconfinder.com%2Fdata%2Ficons%2Fflaticons-solid%2F16%2Fprofile-1-512.png&f=1&nofb=1&ipt=6b148c0994b76fe50e9a2fbb9e360cc3858b81f150251aca12a5ca51d932aca8"}
                            alt={k.korisnicko_ime}
                            className={styles.cardImage}
                          />
                        ) : (
                        <div
                          className={styles.cardImage}
                          style={{ background: "#222" }}
                        />
                      )}
                    </div>

                    <div className="link" onClick={() => handleNavigate(`/izvodjac/${k.id}`)} style={{ cursor: "pointer" }}>
                      <div className={styles.cardTitle}>
                        {k.korisnicko_ime}
                      </div>
                    </div>

                    <div className={styles.cardDesc}>
                      Izvođač
                    </div>
                  </div>
                ))}
            </div>
          </Section>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(Home);

