import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
// import styles from "./SvePjesme.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SvePjesme: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./SvePjesmeWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./SvePjesme.module.css");
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

  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const [songArtists, setSongArtists] = useState<
    Record<number, { id: string; korisnicko_ime: string }[]>
  >({});

  const songsQ = useQuery<Pjesma[]>({
    queryKey: ["mojePjesme", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/pjesme/`);
      const all: Pjesma[] = res.data || [];
      return all.filter((p) => String(p.korisnikID) === String(korisnikID));
    },
    initialData: [],
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_BASE}/pjesme/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mojePjesme", korisnikID] });
    },
  });

  const handlePlay = useCallback((p: Pjesma) => {
    setActiveSongId(p.id);
    if (p.putanjaAudio) {
      window.dispatchEvent(
        new CustomEvent("globalAudioPlay", {
          detail: {
            id: p.id,
            src: p.putanjaAudio,
            title: p.naziv,
            putanjaGif: p.putanjaGif,
            putanjaSlika: p.putanjaSlika,
            korisnikID: p.korisnikID,
          },
        })
      );
    }
  }, []);

  const handleDelete = useCallback(
    (id: number) => {
      if (window.confirm("Da li ste sigurni da želite obrisati ovu pjesmu?")) {
        deleteMut.mutate(id);
      }
    },
    [deleteMut]
  );

  const pjesme = useMemo(() => songsQ.data || [], [songsQ.data]);

  useEffect(() => {
    const loadArtists = async () => {
      if (!pjesme.length) return;
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

  const filtriranePjesme = useMemo(
    () => pjesme.filter((p) => p.naziv.toLowerCase().includes(search.toLowerCase())),
    [pjesme, search]
  );

  const loading = songsQ.isLoading && Boolean(korisnikID);

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.svePjesmeBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("my_songs") || "Moje pjesme"}</h2>
          <input
            type="text"
            placeholder={t("search_songs") || "Pretraži pjesme..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : filtriranePjesme.length === 0 ? (
            <div className={styles.noSongs}>
              {pjesme.length === 0
                ? t("no_songs_user") || "Nemate nijednu pjesmu."
                : t("no_results") || "Nema rezultata."}
            </div>
          ) : (
            <div className={styles.songGrid}>
              {filtriranePjesme.map((p) => (
                <div
                  key={p.id}
                  className={`${styles.card} ${activeSongId === p.id ? styles.activeCard : ""}`}
                >
                  <div className={styles.cardImageWrap}>
                    {p.putanjaSlika ? (
                      <img src={p.putanjaSlika} alt={p.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                    {p.putanjaAudio && (
                      <button
                        className={styles.playButton}
                        onClick={() => handlePlay(p)}
                        title={t("play")}
                      >
                        <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <Link to={`/pjesma/${p.id}`}>
                    <div className={styles.cardTitle}>{p.naziv}</div>
                  </Link>
                  <div className={styles.cardDesc}>
                    {(songArtists[p.id] || []).map((izv, idx) => (
                      <Link key={izv.id} to={`/izvodjac/${izv.id}`} className={styles.artistLink}>
                        {izv.korisnicko_ime}
                        {idx < (songArtists[p.id] || []).length - 1 ? " & " : ""}
                      </Link>
                    ))}
                    {((songArtists[p.id] || []).length === 0) && p.korisnik?.korisnicko_ime && (
                      <Link to={`/izvodjac/${p.korisnikID}`} className={styles.artistLink}>
                        {p.korisnik.korisnicko_ime}
                      </Link>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <Link to={`/uredi-pjesmu/${p.id}`} className="link">
                      <button className={styles.editButton}>
                        {t("edit")}
                      </button>
                    </Link>
                    <button className={styles.deleteButton} onClick={() => handleDelete(p.id)}>
                      {t("delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(SvePjesme);
