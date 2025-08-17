import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import styles from "./UrediPlaylistu.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Playlista, Pjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediPlaylistu: React.FC = () => {
  const { playlistaId } = useParams<{ playlistaId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const playlistaQ = useQuery<Playlista | null>({
    queryKey: ["playlista", playlistaId],
    enabled: Boolean(playlistaId),
    queryFn: async () => axios.get(`${API_BASE}/playliste/${playlistaId}`).then((r) => r.data as Playlista),
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

  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [javno, setJavno] = useState(false);

  useEffect(() => {
    if (playlistaQ.data) {
      setNaziv(playlistaQ.data.naziv || "");
      setOpis(playlistaQ.data.opis || "");
      setJavno(!!playlistaQ.data.javno);
    }
  }, [playlistaQ.data]);

  const updateMut = useMutation({
    mutationFn: async () => {
      const pl = playlistaQ.data as Playlista;
      if (!pl || !korisnikID) throw new Error("no-playlist");
      const formData = new FormData();
      formData.append("korisnikID", korisnikID);
      formData.append("naziv", naziv);
      formData.append("opis", opis);
      formData.append("kreiranDatumVrijeme", pl.kreiranDatumVrijeme || "");
      formData.append("javno", String(javno));
      formData.append("brojLajkova", String(pl.brojLajkova || 0));
      if (fileSlika) formData.append("file_slika", fileSlika);
      if (fileGif) formData.append("file_gif", fileGif);
      await axios.put(`${API_BASE}/playliste/${pl.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      setSuccess("Playlista je uspješno ažurirana.");
      qc.invalidateQueries({ queryKey: ["playlista", playlistaId] });
      const id = (playlistaQ.data as Playlista)?.id;
      if (id) setTimeout(() => navigate(`/playlista/${id}`), 1200);
    },
    onError: () => setError("Greška pri ažuriranju playliste."),
  });

  const removeSongMut = useMutation({
    mutationFn: async (pjesmaId: number) => {
      if (!playlistaId) return;
      await axios.delete(`${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlistSongs", playlistaId] });
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      updateMut.mutate();
    },
    [updateMut]
  );

  const handleRemoveSong = useCallback(
    (pjesmaId: number) => {
      setRemoving(pjesmaId);
      removeSongMut.mutate(pjesmaId, { onSettled: () => setRemoving(null) });
    },
    [removeSongMut]
  );

  const playlista = playlistaQ.data;
  const pjesme = songsQ.data || [];
  const loading = playlistaQ.isLoading || songsQ.isLoading;

  if (loading) return <Loading />;
  if (playlistaQ.isError) return <div style={{ color: "#fff", padding: 32 }}>{t("error_fetching_playlist") || "Greška pri dohvatanju playliste."}</div>;
  if (!playlista) return <div style={{ color: "#fff", padding: 32 }}>{t("playlist_not_found") || "Playlista nije pronađena."}</div>;
  if (playlista.korisnikID !== korisnikID) return <div style={{ color: "#fff", padding: 32 }}>{t("no_edit_permission") || "Nemate pravo uređivanja ove playliste."}</div>;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.editPlaylistBg}>
        <div className={styles.formContainer}>
          <form className={styles.editPlaylistForm} onSubmit={handleSubmit}>
            <h2 className={styles.title}>{t("edit_playlist") || "Uredi playlistu"}</h2>
            <label className={styles.label}>{t("playlist_name") || "Naziv"}</label>
            <input className={styles.input} value={naziv} onChange={(e) => setNaziv(e.target.value)} required />
            <label className={styles.label}>{t("description")}</label>
            <textarea className={styles.input} value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />
            <label className={styles.label}>{t("new_image_optional") || "Nova slika (opcionalno)"}</label>
            <input type="file" accept="image/*" onChange={(e) => setFileSlika(e.target.files?.[0] || null)} />
            <label className={styles.label}>{t("new_gif_optional") || "Novi gif (opcionalno)"}</label>
            <input type="file" accept="image/gif" onChange={(e) => setFileGif(e.target.files?.[0] || null)} />
            <label className={styles.fileLabel} style={{ marginTop: 10, marginBottom: 10 }}>
              <input type="checkbox" checked={javno} onChange={(e) => setJavno(e.target.checked)} style={{ marginRight: 8 }} />
              {t("public_playlist")}
            </label>
            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}
            <button className={styles.button} type="submit">{t("save_changes")}</button>
          </form>

          <div className={styles.songsSection}>
            <h4 className={styles.songsTitle}>{t("songs_in_playlist") || "Pjesme u playlisti"}</h4>
            {pjesme.length === 0 ? (
              <div className={styles.noSongsText}>{t("no_songs_in_playlist") || "Nema pjesama u ovoj playlisti."}</div>
            ) : (
              <ul className={styles.songsList}>
                {pjesme.map((p) => (
                  <li key={p.id} className={styles.songItem}>
                    <div className={styles.songInfo}>
                      <span className={styles.songName}>{p.naziv}</span>
                      <span className={styles.songDuration}>{p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}</span>
                    </div>
                    <button className={styles.removeBtn} disabled={removing === p.id} onClick={() => handleRemoveSong(p.id)} style={{ opacity: removing === p.id ? 0.6 : 1 }}>
                      {removing === p.id ? t("removing") || "Uklanjam..." : t("remove") || "Izbaci"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(UrediPlaylistu);
