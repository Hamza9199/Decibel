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
import { getApiBase } from "../../utils/apiBase";
import "../../assets/logo.css";
import CookieConsent from '../../komponente/CookieConsent/CookieConsent';
import { getMediaUrl } from "../../utils/mediaUrl";

type Styles = Record<string, string>;

const API_BASE = getApiBase();

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNavigate = useCallback((path: string) => {
    setTimeout(() => navigate(path), 10);
  }, [navigate]);

  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [activeSong, setActiveSong] = useState<Pjesma | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [spotlightTab, setSpotlightTab] = useState<"album" | "song" | "playlist">("album");
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

    const onThemeChanged = (e: Event) => {
      const theme = (e as CustomEvent<string>).detail;
      loadThemeStyles(theme);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("themeChanged", onThemeChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("themeChanged", onThemeChanged);
    };
  }, []);

  useEffect(() => {
    const onGlobalPlay = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: number }>).detail;
      if (detail && detail.id) {
        setActiveSongId(detail.id);
        setIsPlaying(true);
      }
    };
    const onGlobalPause = () => {
      setIsPlaying(false);
    };

    window.addEventListener("globalAudioPlay", onGlobalPlay);
    window.addEventListener("globalAudioPause", onGlobalPause);

    return () => {
      window.removeEventListener("globalAudioPlay", onGlobalPlay);
      window.removeEventListener("globalAudioPause", onGlobalPause);
    };
  }, []);

  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -10;
    const ry = ((x - cx) / cx) * 10;
    card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    card.style.setProperty("--mx", `${((x / rect.width) * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${((y / rect.height) * 100).toFixed(1)}%`);
  }, []);

  const handleCardMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
  }, []);

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme"],
    queryFn: async () => axios.get(`${API_BASE}/pjesme/`).then((res) => res.data || []),
    staleTime: 30_000,
  });

  const albumiQ = useQuery<Album[]>({
    queryKey: ["albumi"],
    queryFn: async () => axios.get(`${API_BASE}/albumi/`).then((res) => res.data || []),
    staleTime: 30_000,
  });

  const playlisteQ = useQuery<Playlista[]>({
    queryKey: ["playliste", "all"],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_BASE}/playliste/`);
        return res.data || [];
      } catch (e) {
        console.error("playliste fetch failed:", e);
        throw e;
      }
    },
    staleTime: 30_000,
  });

  const korisniciQ = useQuery<Korisnik[]>({
    queryKey: ["korisnici"],
    queryFn: async () => axios.get(`${API_BASE}/korisnici/`).then((res) => res.data || []),
    staleTime: 30_000,
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

  const trenutniKorisnik = useMemo(() => {
    try {
      const raw = localStorage.getItem("korisnik");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const pozdrav = useMemo(() => {
    const sat = new Date().getHours();
    if (sat < 5) return t("greeting_night");
    if (sat < 12) return t("greeting_morning");
    if (sat < 18) return t("greeting_day");
    return t("greeting_evening");
  }, [t]);

  const gradients = [
    "linear-gradient(135deg, #b91d95, #6f1fb0)",
    "linear-gradient(135deg, #7b1fb0, #23134a)",
    "linear-gradient(135deg, #d6247f, #4a1a63)",
    "linear-gradient(135deg, #591f8f, #b91d95)",
  ];
  const gradientFor = (id: string | number) => {
    const num = typeof id === "string" ? parseInt(id, 10) || id.charCodeAt(0) : id;
    return gradients[num % gradients.length];
  };

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
      setIsPlaying(true);
      const song = (pjesme || []).find((p) => p.id === id);
      setActiveSong(song && audioUrl ? { ...song, putanjaAudio: audioUrl } : null);
      if (song && audioUrl) {
        await playPreview(audioUrl);
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
      setIsPlaying(true);
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
      setIsPlaying(true);
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
      playPlaylistSongsMut.mutate(playlistId);
    },
    [playPlaylistSongsMut]
  );

  

  const spotlight = useMemo(() => {
    if (spotlightTab === "album" && albumi[0]) {
      const a = albumi[0];
      return {
        type: "album",
        kicker: t("top_album"),
        naziv: a.naziv,
        sub: a.korisnik?.korisnicko_ime,
        img: a.putanjaSlika ? getMediaUrl(a.putanjaSlika) : undefined,
        id: a.id,
        onOpen: () => handleNavigate(`/album/${a.id}`),
        onPlay: () => handlePlayAlbum(a.id),
      };
    }
    if (spotlightTab === "song" && pjesme[0]) {
      const p = pjesme[0];
      const izvodjaci = (pjesmaIzvodjaci[p.id] || []).map((i) => i.korisnicko_ime).join(" & ");
      return {
        type: "song",
        kicker: t("trending_song"),
        naziv: p.naziv,
        sub: izvodjaci,
        img: p.putanjaSlika ? getMediaUrl(p.putanjaSlika) : undefined,
        id: p.id,
        onOpen: () => handleNavigate(`/pjesma/${p.id}`),
        onPlay: p.putanjaAudio ? () => handlePlay(p.id, getMediaUrl(p.putanjaAudio)) : undefined,
      };
    }
    if (spotlightTab === "playlist" && playliste[0]) {
      const pl = playliste[0];
      return {
        type: "playlist",
        kicker: t("recommended_playlist"),
        naziv: pl.naziv,
        sub: pl.korisnik?.korisnicko_ime,
        img: getMediaUrl(pl.putanjaSlika) || undefined,
        id: pl.id,
        onOpen: () => handleNavigate(`/playlista/${pl.id}`),
        onPlay: () => handlePlayPlaylist(pl.id),
      };
    }
    if (albumi[0]) {
      const a = albumi[0];
      return {
        type: "album",
        kicker: t("top_album"),
        naziv: a.naziv,
        sub: a.korisnik?.korisnicko_ime,
        img: a.putanjaSlika ? getMediaUrl(a.putanjaSlika) : undefined,
        id: a.id,
        onOpen: () => handleNavigate(`/album/${a.id}`),
        onPlay: () => handlePlayAlbum(a.id),
      };
    }
    if (pjesme[0]) {
      const p = pjesme[0];
      const izvodjaci = (pjesmaIzvodjaci[p.id] || []).map((i) => i.korisnicko_ime).join(" & ");
      return {
        type: "song",
        kicker: t("trending_song"),
        naziv: p.naziv,
        sub: izvodjaci,
        img: p.putanjaSlika ? getMediaUrl(p.putanjaSlika) : undefined,
        id: p.id,
        onOpen: () => handleNavigate(`/pjesma/${p.id}`),
        onPlay: p.putanjaAudio ? () => handlePlay(p.id, getMediaUrl(p.putanjaAudio)) : undefined,
      };
    }
    return null;
  }, [spotlightTab, albumi, playliste, pjesme, pjesmaIzvodjaci, handleNavigate, handlePlayAlbum, handlePlayPlaylist, handlePlay, t]);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );

  if (showLoading) return <Loading />;

  return (
    <>
      <CookieConsent />
      <Header />
      <Sidebar />
      
      <div className={styles.spotifyBg}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <div className={styles.greetingWrap}>
              <h1 className={styles.greeting}>
                {pozdrav}{trenutniKorisnik?.korisnicko_ime ? `, ${trenutniKorisnik.korisnicko_ime}` : ""}
              </h1>
            </div>
            <p className={styles.greetingSub}>
              {t("home_hero_subtitle")}
            </p>
          </div>

          

          {spotlight && (
            <div className={styles.spotlightSection}>
              <div className={styles.spotlightHeader}>
                <div className={styles.spotlightTabs}>
                  <button
                    className={`${styles.spotlightTab} ${spotlightTab === "album" ? styles.spotlightTabActive : ""}`}
                    onClick={() => setSpotlightTab("album")}
                  >
                    {t("albums")}
                  </button>
                  <button
                    className={`${styles.spotlightTab} ${spotlightTab === "song" ? styles.spotlightTabActive : ""}`}
                    onClick={() => setSpotlightTab("song")}
                  >
                    {t("songs")}
                  </button>
                  <button
                    className={`${styles.spotlightTab} ${spotlightTab === "playlist" ? styles.spotlightTabActive : ""}`}
                    onClick={() => setSpotlightTab("playlist")}
                  >
                    {t("playlists")}
                  </button>
                </div>
              </div>

              <div className={styles.spotlightStage}>
                <div className={styles.spotlightAura} />
                <div className={styles.spotlightBody}>
                  <div className={styles.spotlightBadgeRow}>
                    <span className={styles.spotlightKicker}>{spotlight.kicker}</span>
                    <div className={styles.eqMeter}>
                      <span className={`${styles.eqBar} ${styles.eqBar1}`} />
                      <span className={`${styles.eqBar} ${styles.eqBar2}`} />
                      <span className={`${styles.eqBar} ${styles.eqBar3}`} />
                      <span className={`${styles.eqBar} ${styles.eqBar4}`} />
                    </div>
                  </div>
                  <h2 className={styles.spotlightTitle} onClick={spotlight.onOpen}>
                    {spotlight.naziv}
                  </h2>
                  {spotlight.sub && <p className={styles.spotlightSub}>{spotlight.sub}</p>}
                  <div className={styles.spotlightActions}>
                    {spotlight.onPlay && (
                      <button className={styles.spotlightPlay} onClick={spotlight.onPlay}>
                        <svg width="20" height="20" viewBox="0 0 44 44" fill="#090808ff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                        {t("play")}
                      </button>
                    )}
                    <button className={styles.spotlightDetailsBtn} onClick={spotlight.onOpen}>
                      {t("details")}
                    </button>
                  </div>
                </div>

                <div
                  className={`${styles.vinylRig} ${
                    isPlaying && activeSong ? styles.vinylSpinActive : ""
                  }`}
                  onClick={spotlight.onPlay || spotlight.onOpen}
                >
                  <div className={styles.vinylSleeve}>
                    {spotlight.img ? (
                      <img src={spotlight.img} alt={spotlight.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: gradientFor(spotlight.id) }} />
                    )}
                  </div>
                  
                  <div className={styles.vinylDisc}>
                    <div className={styles.vinylCenterLabel}>
                      {spotlight.img ? (
                        <img src={spotlight.img} alt="Vinyl Center" className={styles.cardImage} />
                      ) : (
                        <div className={styles.cardImage} style={{ background: gradientFor(spotlight.id) }} />
                      )}
                      <div className={styles.vinylCenterHole} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Section title={t("songs")} >
            <div className={styles.chartList}>
              {pjesme.map((p, idx) => {
                const isThisSongActive = activeSongId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`${styles.chartRow} ${isThisSongActive ? styles.chartRowActive : ""}`}
                    onClick={() => handleNavigate(`/pjesma/${p.id}`)}
                  >
                    <div className={styles.chartIndexWrap}>
                      {isThisSongActive ? (
                        <div className={styles.eqMeter}>
                          <span className={`${styles.eqBar} ${styles.eqBar1}`} />
                          <span className={`${styles.eqBar} ${styles.eqBar2}`} />
                          <span className={`${styles.eqBar} ${styles.eqBar3}`} />
                          <span className={`${styles.eqBar} ${styles.eqBar4}`} />
                        </div>
                      ) : (
                        <span className={styles.chartIndex}>{idx + 1}</span>
                      )}

                      {p.putanjaAudio && (
                        <button
                          className={styles.chartPlayIcon}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePlay(p.id, getMediaUrl(p.putanjaAudio));
                          }}
                          title={t("play")}
                        >
                          <svg width="15" height="15" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className={styles.chartArt}>
                      {p.putanjaSlika ? (
                        <img src={getMediaUrl(p.putanjaSlika)} alt={p.naziv} className={styles.cardImage} />
                      ) : (
                        <div className={styles.cardImage} style={{ background: gradientFor(p.id) }} />
                      )}
                    </div>

                    <div className={styles.chartInfo}>
                      <div className={styles.chartTitle}>{p.naziv}</div>
                      <div className={styles.chartArtists}>
                        {(pjesmaIzvodjaci[p.id] || []).map((izv, i) => (
                          <span
                            key={izv.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(`/izvodjac/${izv.id}`);
                            }}
                          >
                            {izv.korisnicko_ime}
                            {i < (pjesmaIzvodjaci[p.id] || []).length - 1 ? " & " : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={t("albums")} >
            <div className={styles.gridRow}>
              {albumi.map((a) => (
                <div
                  key={a.id}
                  className={styles.card}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  onClick={() => handleNavigate(`/album/${a.id}`)}
                >
                  <div className={styles.cardImageWrap}>
                    {a.putanjaSlika ? (
                      <img src={getMediaUrl(a.putanjaSlika)} alt={a.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: gradientFor(a.id) }} />
                    )}

                    <button
                      className={styles.playButton}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayAlbum(a.id);
                      }}
                      title={t("play_album")}
                    >
                      <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.cardTitle}>{a.naziv}</div>
                  <div
                    className={styles.cardDesc}
                    onClick={(e) => {
                      if (a.korisnik?.id) {
                        e.stopPropagation();
                        handleNavigate(`/izvodjac/${a.korisnik.id}`);
                      }
                    }}
                  >
                    {a.korisnik?.korisnicko_ime || <span>&nbsp;</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("playlists")} >
            <div className={styles.gridRow}>
              {playliste.map((pl) => (
                <div
                  key={pl.id}
                  className={`${styles.card} ${styles.playlistCard}`}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  onClick={() => handleNavigate(`/playlista/${pl.id}`)}
                >
                  <div className={styles.cardImageWrap}>
                    {getMediaUrl(pl.putanjaSlika) ? (
                      <img src={getMediaUrl(pl.putanjaSlika)} alt={pl.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: gradientFor(pl.id) }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
                          <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" fill="none" />
                        </svg>
                      </div>
                    )}

                    <button
                      className={styles.playButton}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayPlaylist(pl.id);
                      }}
                      title={t("play_playlist")}
                    >
                      <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.cardTitle}>{pl.naziv}</div>
                  <div
                    className={styles.cardDesc}
                    onClick={(e) => {
                      if (pl.korisnik?.id) {
                        e.stopPropagation();
                        handleNavigate(`/izvodjac/${pl.korisnik.id}`);
                      }
                    }}
                  >
                    {pl.korisnik?.korisnicko_ime || <span>&nbsp;</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("artists")} >
            <div className={styles.gridRow}>
              {korisnici.map((k) => (
                <div
                  key={k.id}
                  className={`${styles.card} ${styles.artistCard}`}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  onClick={() => handleNavigate(`/izvodjac/${k.id}`)}
                >
                  <div className={styles.artistAvatarContainer}>
                    <div className={styles.artistRing} />
                    <div className={styles.cardImageWrap2}>
                      {getMediaUrl(k.putanjaProfilneSlike) ? (
                        <img
                          src={getMediaUrl(k.putanjaProfilneSlike) || "/logo.gif"}
                          alt={k.korisnicko_ime}
                          className={styles.cardImage}
                        />
                      ) : (
                        <div className={styles.cardImage} style={{ background: gradientFor(k.id) }} />
                      )}
                    </div>
                  </div>

                  <div className={styles.cardTitle}>{k.korisnicko_ime}</div>
                  <div className={styles.cardDesc}>{t("artist")}</div>
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