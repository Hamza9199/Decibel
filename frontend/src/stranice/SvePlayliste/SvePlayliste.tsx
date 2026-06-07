import React, { useState, useMemo, useCallback, useEffect } from "react";
// import styles from "./SvePlayliste.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Playlista, Pjesma } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SvePlayliste: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./SvePlaylisteWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./SvePlayliste.module.css");
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
  const [localPlaylists, setLocalPlaylists] = useState<Playlista[]>([]);
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const playlistsQ = useQuery<Playlista[]>({
    queryKey: ["mojePlayliste", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/playliste/`);
      const all: Playlista[] = res.data || [];
      return all.filter((pl) => String(pl.korisnikID) === String(korisnikID));
    },
    initialData: [],
  });


  useEffect(() => {
    setLocalPlaylists(playlistsQ.data || []);
  }, [playlistsQ.data]);

  const playPlaylistSongsMut = useMutation({
    mutationFn: async (playlistId: number) => {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const ids: number[] = res.data || [];
      if (ids.length === 0) return [] as Pjesma[];
      const pjesmeArr = await Promise.all(ids.map((id) => axios.get(`${API_BASE}/pjesme/${id}`).then((r) => r.data).catch(() => null)));
      return pjesmeArr.filter(Boolean) as Pjesma[];
    },
    onSuccess: (playlistSongs) => {
      if (!playlistSongs.length) return;
      window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: playlistSongs, idx: 0, repeatAll: false } }));
    },
    onError: () => console.error("Greška pri učitavanju playliste."),
  });

 const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_BASE}/playliste/${id}`);
    },

    onMutate: async (id) => {
      setLocalPlaylists(prev =>
        prev.filter(pl => pl.id !== id)
      );

      await qc.cancelQueries({
        queryKey: ["mojePlayliste", korisnikID],
      });

      const previousPlaylists =
        qc.getQueryData<Playlista[]>([
          "mojePlayliste",
          korisnikID,
        ]) || [];

      qc.setQueryData(
        ["mojePlayliste", korisnikID],
        previousPlaylists.filter(
          pl => pl.id !== id
        )
      );

      return { previousPlaylists };
    },

    onError: (_err, _id, context) => {
      if (context?.previousPlaylists) {
        setLocalPlaylists(
          context.previousPlaylists
        );

        qc.setQueryData(
          ["mojePlayliste", korisnikID],
          context.previousPlaylists
        );
      }

      alert(
        t("error_deleting_playlist") ||
        "Greška pri brisanju playliste."
      );
    },

    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["mojePlayliste", korisnikID],
      });
    },
  });

  const handlePlayPlaylist = useCallback((playlistId: number) => {
    playPlaylistSongsMut.mutate(playlistId);
  }, [playPlaylistSongsMut]);

  const playliste = localPlaylists;
  const filtriranePlayliste = useMemo(() => playliste.filter((pl) => pl.naziv.toLowerCase().includes(search.toLowerCase())), [playliste, search]);
  const loading = playlistsQ.isLoading && Boolean(korisnikID);

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.svePlaylisteBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("my_playlists") || "Moje playliste"}</h2>
          <input type="text" placeholder={t("search_playlists") || "Pretraži playliste..."} value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : filtriranePlayliste.length === 0 ? (
            <div className={styles.noPlaylists}>{playliste.length === 0 ? t("no_playlists_user") || "Nemate nijednu playlistu." : t("no_results") || "Nema rezultata."}</div>
          ) : (
            <div className={styles.playlistGrid}>
              {filtriranePlayliste.map((pl) => (
                <div key={pl.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {pl.putanjaSlika ? <img src={pl.putanjaSlika} alt={pl.naziv} className={styles.cardImage} /> : <div className={styles.cardImage} style={{ background: "#222" }} />}
                    <button className={styles.playButton} onClick={() => handlePlayPlaylist(pl.id)} title={t("play_playlist")} style={{ left: 50, position: "absolute", bottom: 10 }}>
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff"><polygon points="12,8 36,22 12,36" /></svg>
                    </button>
                  </div>
                  <Link to={`/playlista/${pl.id}`} className={styles.cardLink}>
                    <div className={styles.cardTitle}>{pl.naziv}</div>
                  </Link>
                  <Link to={`/izvodjac/${pl.korisnikID}`} className={styles.cardDesc}>
                    <div className={styles.cardDesc}>{pl.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                  </Link>
                  <div className={styles.cardActions}>
                    <Link to={`/uredi-playlistu/${pl.id}`} className={styles.editButton}>
                      <button>{t("edit")}</button>
                    </Link>
                    <button className={styles.deleteButton} onClick={() => { if (window.confirm(t("confirm_delete_playlist") || "Jeste li sigurni da želite obrisati ovu playlistu?")) { deleteMut.mutate(pl.id); } }}>{t("delete")}</button>
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

export default React.memo(SvePlayliste);
