import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
// import styles from "./SviAlbumi.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Album, Pjesma } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SviAlbumi: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./SviAlbumiWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./SviAlbumi.module.css");
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

  const albumiQ = useQuery<Album[]>({
    queryKey: ["mojiAlbumi", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/albumi/`);
      const all: Album[] = res.data || [];
      return all.filter((a) => String(a.korisnikID) === String(korisnikID));
    },
    initialData: [],
  });

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme"],
    queryFn: async () => axios.get(`${API_BASE}/pjesme/`).then((r) => r.data || []),
    initialData: [],
  });

  const deleteAlbumMut = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_BASE}/albumi/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mojiAlbumi", korisnikID] });
    },
    onError: () => alert(t("error_deleting_album") || "Greška pri brisanju albuma."),
  });

  const pjesme = useMemo(() => pjesmeQ.data || [], [pjesmeQ.data]);

  const handlePlayAlbum = useCallback(
    (albumId: number) => {
      const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
      if (albumSongs.length === 0) return;
      window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: albumSongs, idx: 0, repeatAll: false } }));
    },
    [pjesme]
  );

  const albumi = useMemo(() => albumiQ.data || [], [albumiQ.data]);
  const filtriraniAlbumi = useMemo(() => albumi.filter((a) => a.naziv.toLowerCase().includes(search.toLowerCase())), [albumi, search]);
  const loading = albumiQ.isLoading && Boolean(korisnikID);

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.sviAlbumiBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("my_albums") || "Moji albumi"}</h2>
          <input type="text" placeholder={t("search_albums") || "Pretraži albume..."} value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : filtriraniAlbumi.length === 0 ? (
            <div className={styles.noAlbums}>{albumi.length === 0 ? t("no_albums_user") || "Nemate nijedan album." : t("no_results") || "Nema rezultata."}</div>
          ) : (
            <div className={styles.albumGrid}>
              {filtriraniAlbumi.map((a) => (
                <div key={a.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {a.putanjaSlika ? <img src={a.putanjaSlika} alt={a.naziv} className={styles.cardImage} /> : <div className={styles.cardImage} style={{ background: "#222" }} />}
                    <button className={styles.playButton} onClick={() => handlePlayAlbum(a.id)} title={t("play_album")} style={{ left: 50, position: "absolute", bottom: 10 }}>
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff"><polygon points="12,8 36,22 12,36" /></svg>
                    </button>
                  </div>
                  <Link to={`/album/${a.id}`} className={styles.cardLink}>
                    <div className={styles.cardTitle}>{a.naziv}</div>
                  </Link>
                  <Link to={`/izvodjac/${a.korisnikID}`}>
                    <div className={styles.cardDesc}>{a.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                  </Link>
                  <div className={styles.cardActions}>
                    <Link to={`/uredi-album/${a.id}`} className={styles.editButton}>
                      <button>{t("edit")}</button>
                    </Link>
                    <button className={styles.deleteButton} onClick={() => { if (window.confirm(t("confirm_delete_album") || "Jeste li sigurni da želite obrisati ovaj album?")) { deleteAlbumMut.mutate(a.id); } }}>{t("delete")}</button>
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

export default memo(SviAlbumi);
