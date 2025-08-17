import React, { useMemo, useCallback, memo } from "react";
import styles from "./Izvodjac.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import type { Korisnik, Pjesma, Album, Playlista } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Izvodjac: React.FC = () => {
  const { izvodjacId } = useParams<{ izvodjacId: string }>();
  const { t } = useTranslation();
  const repeatAll = false;

  const mojID = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("korisnik") || "");
      return u?.id || "";
    } catch {
      return "";
    }
  }, []);

  const izvodjacQ = useQuery<Korisnik | null>({
    queryKey: ["izvodjac", izvodjacId],
    enabled: Boolean(izvodjacId),
    queryFn: async () =>
      axios.get(`${API_BASE}/korisnici/${izvodjacId}`).then((r) => r.data as Korisnik),
  });

  const pjesmeAuthorQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme", "byAuthor", izvodjacId],
    enabled: Boolean(izvodjacId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/pjesme/`);
      const all: Pjesma[] = r.data || [];
      return all.filter((p) => String(p.korisnikID) === String(izvodjacId) && p.odobreno);
    },
  });

  const collabSongsQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme", "collab", izvodjacId],
    enabled: Boolean(izvodjacId),
    queryFn: async () => {
      const rel = await axios.get(`${API_BASE}/izvodjac_pjesma/`).then((r) => (r.data || []) as { izvodjacID: string; pjesmaID: number }[]);
      const ids = rel.filter((v) => String(v.izvodjacID) === String(izvodjacId)).map((v) => v.pjesmaID);
      if (ids.length === 0) return [] as Pjesma[];
      const arr = await Promise.all(
        ids.map((id) => axios.get(`${API_BASE}/pjesme/${id}`).then((r) => r.data as Pjesma).catch(() => null))
      );
      return (arr.filter(Boolean) as Pjesma[]).filter((p) => p.odobreno);
    },
  });

  const albumiQ = useQuery<Album[]>({
    queryKey: ["albumi", "byAuthor", izvodjacId],
    enabled: Boolean(izvodjacId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/albumi/`);
      const all: Album[] = r.data || [];
      return all.filter((a) => String(a.korisnikID) === String(izvodjacId) && a.odobreno);
    },
  });

  const playlisteQ = useQuery<Playlista[]>({
    queryKey: ["playliste", "byAuthor", izvodjacId],
    enabled: Boolean(izvodjacId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/playliste/`);
      const all: Playlista[] = r.data || [];
      return all.filter((pl) => String(pl.korisnikID) === String(izvodjacId) && pl.javno);
    },
    initialData: [],
  });

  const pratimQ = useQuery<boolean>({
    queryKey: ["pratim", izvodjacId, mojID],
    enabled: Boolean(izvodjacId && mojID),
    queryFn: async () => {
      try {
        await axios.get(`${API_BASE}/pratioci/${izvodjacId}/${mojID}`);
        return true;
      } catch {
        return false;
      }
    },
    initialData: false,
  });

  const pjesme = useMemo(() => {
    const a = pjesmeAuthorQ.data || [];
    const b = collabSongsQ.data || [];
    const map = new Map<number, Pjesma>();
    a.forEach((p) => map.set(p.id, p));
    b.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [pjesmeAuthorQ.data, collabSongsQ.data]);

  const loading = useMemo(() => {
    return (
      izvodjacQ.isLoading || pjesmeAuthorQ.isLoading || collabSongsQ.isLoading || albumiQ.isLoading || playlisteQ.isLoading || pratimQ.isLoading
    );
  }, [izvodjacQ.isLoading, pjesmeAuthorQ.isLoading, collabSongsQ.isLoading, albumiQ.isLoading, playlisteQ.isLoading, pratimQ.isLoading]);

  const pratiMut = useMutation({
    mutationFn: async () => {
      if (!mojID || !izvodjacId) return;
      if (pratimQ.data) {
        await axios.delete(`${API_BASE}/pratioci/${izvodjacId}/${mojID}`);
      } else {
        await axios.post(`${API_BASE}/pratioci/`, { korisnikID: izvodjacId, pratilacID: mojID });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pratim", izvodjacId, mojID] });
      qc.invalidateQueries({ queryKey: ["izvodjac", izvodjacId] });
    },
  });

  const playPlaylistSongsMut = useMutation({
    mutationFn: async (playlistId: number) => {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const ids: number[] = res.data || [];
      if (ids.length === 0) return [] as Pjesma[];
      const pjesmeArr = await Promise.all(
        ids.map((id) => axios.get(`${API_BASE}/pjesme/${id}`).then((r) => r.data as Pjesma).catch(() => null))
      );
      return (pjesmeArr.filter(Boolean) as Pjesma[]);
    },
    onSuccess: (playlistSongs) => {
      if (!playlistSongs || playlistSongs.length === 0) return;
      window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: playlistSongs, idx: 0, repeatAll } }));
    },
  });

  const handlePrati = useCallback(() => {
    if (!mojID || !izvodjacId) return;
    pratiMut.mutate();
  }, [pratiMut, mojID, izvodjacId]);

  const handlePlay = useCallback((p: Pjesma) => {
    if (!p.putanjaAudio) return;
    window.dispatchEvent(
      new CustomEvent("globalAudioPlay", {
        detail: {
          src: p.putanjaAudio,
          title: p.naziv,
          putanjaGif: p.putanjaGif,
          putanjaSlika: p.putanjaSlika,
          korisnikID: p.korisnikID,
        },
      })
    );
  }, []);

  const handlePlayAlbum = useCallback(
    (albumId: number) => {
      const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
      if (albumSongs.length === 0) return;
      window.dispatchEvent(new CustomEvent("globalAudioPlaylist", { detail: { playlist: albumSongs, idx: 0, repeatAll } }));
    },
    [pjesme, repeatAll]
  );

  const handlePlayPlaylist = useCallback(
    (playlistId: number) => {
      playPlaylistSongsMut.mutate(playlistId);
    },
    [playPlaylistSongsMut]
  );

  if (loading) return <Loading />;
  if (!izvodjacQ.data)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>Izvođač nije pronađen.</h2>
        </div>
        <Footer />
      </div>
    );

  const izvodjac = izvodjacQ.data;
  const albumi = albumiQ.data || [];
  const playliste = playlisteQ.data || [];
  const pratim = pratimQ.data || false;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.izvodjacBg}>
        <div className={styles.container}>
          <div className={styles.izvodjacMain}>
            <img src={izvodjac.putanjaProfilneSlike || "/logo.gif"} alt={izvodjac.korisnicko_ime} className={styles.izvodjacSlika} />
            <div className={styles.izvodjacInfo}>
              <h2 className={styles.izvodjacNaziv}>{izvodjac.korisnicko_ime}</h2>
              <div className={styles.izvodjacMeta}>
                <span>{t("name") || "Ime"}: <b>{izvodjac.ime}</b></span>
                <span>{t("surname") || "Prezime"}: <b>{izvodjac.prezime}</b></span>
                <span>{t("followers") || "Pratilaca"}: <b>{izvodjac.brojPratilaca}</b></span>
              </div>
              <div className={styles.izvodjacBio}>{izvodjac.bio}</div>
              {mojID && mojID !== izvodjac.id && (
                <button className={`${styles.pratiBtn} ${pratim ? styles.pratim : ""}`} onClick={handlePrati}>
                  {pratim ? t("following") || "Pratim" : t("follow") || "Prati"}
                </button>
              )}
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("songs")}</h3>
            <div className={styles.gridRow}>
              {pjesme.length === 0 ? (
                <div className={styles.noItems}>{t("no_songs")}</div>
              ) : (
                pjesme.map((p) => (
                  <div key={p.id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      <img src={p.putanjaSlika || "/logo.gif"} alt={p.naziv} className={styles.cardImage} />
                      {p.putanjaAudio && (
                        <button className={styles.playBtn} onClick={() => handlePlay(p)} title={t("play_song")}>
                          <svg width="28" height="28" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <Link to={`/pjesma/${p.id}`} className={styles.cardTitle}>
                      {p.naziv}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("albums")}</h3>
            <div className={styles.gridRow}>
              {albumi.length === 0 ? (
                <div className={styles.noItems}>{t("no_albums")}</div>
              ) : (
                albumi.map((a) => (
                  <div key={a.id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      <img src={a.putanjaSlika || "/logo.gif"} alt={a.naziv} className={styles.cardImage} />
                      <button className={styles.playBtn} onClick={() => handlePlayAlbum(a.id)} title={t("play_album")}>
                        <svg width="28" height="28" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    </div>
                    <Link to={`/album/${a.id}`} className={styles.cardTitle}>
                      {a.naziv}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t("playlists")}</h3>
            <div className={styles.gridRow}>
              {playliste.length === 0 ? (
                <div className={styles.noItems}>{t("no_playlists")}</div>
              ) : (
                playliste.map((pl) => (
                  <div key={pl.id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      <img src={pl.putanjaSlika || "/logo.gif"} alt={pl.naziv} className={styles.cardImage} />
                      <button className={styles.playBtn} onClick={() => handlePlayPlaylist(pl.id)} title={t("play_playlist")}>
                        <svg width="28" height="28" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    </div>
                    <Link to={`/playlista/${pl.id}`} className={styles.cardTitle}>
                      {pl.naziv}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(Izvodjac);
