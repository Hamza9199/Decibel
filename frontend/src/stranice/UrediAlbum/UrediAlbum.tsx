import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import styles from "./UrediAlbum.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Album, Pjesma } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediAlbum: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [dodajuci, setDodajuci] = useState<number | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const albumQ = useQuery<Album | null>({
    queryKey: ["album", albumId],
    enabled: Boolean(albumId),
    queryFn: async () => axios.get(`${API_BASE}/albumi/${albumId}`).then((r) => r.data as Album),
  });

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme"],
    queryFn: async () => axios.get(`${API_BASE}/pjesme/`).then((r) => r.data || []),
    initialData: [],
  });

  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);

  useEffect(() => {
    if (albumQ.data) {
      setNaziv(albumQ.data.naziv || "");
      setOpis(albumQ.data.opis || "");
    }
  }, [albumQ.data]);

  const albumUpdateMut = useMutation({
    mutationFn: async (vars: { id: number; formData: FormData }) => {
      await axios.put(`${API_BASE}/albumi/${vars.id}`, vars.formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      setSuccess("Album je uspješno ažuriran.");
      if (albumQ.data?.id) setTimeout(() => navigate(`/album/${albumQ.data?.id}`), 1200);
      qc.invalidateQueries({ queryKey: ["album", albumId] });
    },
    onError: () => setError("Greška pri ažuriranju albuma."),
  });

  const removeSongMut = useMutation({
    mutationFn: async (pjesmaId: number) => {
      const pjesmaRes = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
      const pjesma = pjesmaRes.data as Pjesma;
      await axios.put(`${API_BASE}/pjesme/${pjesmaId}`, { ...pjesma, albumID: null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pjesme"] });
    },
  });

  const addSongMut = useMutation({
    mutationFn: async (pjesmaId: number) => {
      const pjesmaRes = await axios.get(`${API_BASE}/pjesme/${pjesmaId}`);
      const pjesma = pjesmaRes.data as Pjesma;
      await axios.put(`${API_BASE}/pjesme/${pjesmaId}`, { ...pjesma, albumID: Number(albumId) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pjesme"] });
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      const album = albumQ.data;
      if (!album || !korisnikID) return;
      const formData = new FormData();
      formData.append("korisnikID", korisnikID);
      formData.append("naziv", naziv);
      formData.append("opis", opis);
      formData.append("kreiranDatumVrijeme", album.kreiranDatumVrijeme || "");
      formData.append("odobreno", String(album.odobreno || false));
      formData.append("javno", String(album.javno || false));
      formData.append("brojLajkova", String(album.brojLajkova || 0));
      if (fileSlika) formData.append("file_slika", fileSlika);
      if (fileGif) formData.append("file_gif", fileGif);
      albumUpdateMut.mutate({ id: album.id, formData });
    },
    [albumQ.data, korisnikID, naziv, opis, fileSlika, fileGif, albumUpdateMut]
  );

  const handleRemoveSong = useCallback(
    (pjesmaId: number) => {
      setRemoving(pjesmaId);
      removeSongMut.mutate(pjesmaId, { onSettled: () => setRemoving(null) });
    },
    [removeSongMut]
  );

  const handleAddSong = useCallback(
    (pjesmaId: number) => {
      setDodajuci(pjesmaId);
      addSongMut.mutate(pjesmaId, { onSettled: () => setDodajuci(null) });
    },
    [addSongMut]
  );

  const pjesme = useMemo(() => pjesmeQ.data || [], [pjesmeQ.data]);
  const pjesmeAlbuma = useMemo(() => pjesme.filter((p) => String(p.albumID) === String(albumId)), [pjesme, albumId]);
  const svePjesme = useMemo(() => pjesme.filter((p) => !p.albumID || String(p.albumID) === "null" || p.albumID === null), [pjesme]);

  const loading = albumQ.isLoading || pjesmeQ.isLoading;
  if (loading) return <Loading />;
  if (albumQ.isError) return <div style={{ color: "#fff", padding: 32 }}>Greška pri dohvatanju albuma.</div>;
  if (!albumQ.data) return <div style={{ color: "#fff", padding: 32 }}>Album nije pronađen.</div>;
  if (albumQ.data.korisnikID !== korisnikID) return <div style={{ color: "#fff", padding: 32 }}>Nemate pravo uređivanja ovog albuma.</div>;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.editAlbumBg}>
        <div className={styles.formContainer}>
          <form className={styles.editAlbumForm} onSubmit={handleSubmit}>
            <h2 className={styles.title}>{t("edit_album") || "Uredi album"}</h2>
            <label className={styles.label}>{t("album_name") || "Naziv"}</label>
            <input className={styles.input} value={naziv} onChange={(e) => setNaziv(e.target.value)} required />
            <label className={styles.label}>{t("description")}</label>
            <textarea className={styles.input} value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />
            <label className={styles.label}>{t("new_image_optional") || "Nova slika (opcionalno)"}</label>
            <input type="file" accept="image/*" onChange={(e) => setFileSlika(e.target.files?.[0] || null)} />
            <label className={styles.label}>{t("new_gif_optional") || "Novi gif (opcionalno)"}</label>
            <input type="file" accept="image/gif" onChange={(e) => setFileGif(e.target.files?.[0] || null)} />
            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}
            <button className={styles.button} type="submit">{t("save_changes")}</button>
          </form>

          <div className={styles.songsSection}>
            <h4 className={styles.songsTitle}>{t("songs_on_album") || "Pjesme na albumu"}</h4>
            {pjesmeAlbuma.length === 0 ? (
              <div className={styles.noSongsText}>{t("no_songs_on_album") || "Nema pjesama na ovom albumu."}</div>
            ) : (
              <ul className={styles.songsList}>
                {pjesmeAlbuma.map((p) => (
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
            <hr className={styles.divider} />
            <h4 className={styles.addSongsTitle}>{t("add_songs") || "Dodaj pjesme"}</h4>
            {svePjesme.length === 0 ? (
              <div className={styles.noAvailableSongs}>{t("no_available_songs") || "Nema dostupnih pjesama."}</div>
            ) : (
              <ul className={styles.songsList}>
                {svePjesme.map((p) => (
                  <li key={p.id} className={styles.songItem}>
                    <div className={styles.songInfo}>
                      <span className={styles.songName}>{p.naziv}</span>
                      <span className={styles.songDuration}>{p.trajanjeSekunde ? `${Math.floor(p.trajanjeSekunde / 60)}:${(p.trajanjeSekunde % 60).toString().padStart(2, "0")}` : ""}</span>
                    </div>
                    <button className={styles.addBtn} disabled={dodajuci === p.id} onClick={() => handleAddSong(p.id)} style={{ opacity: dodajuci === p.id ? 0.6 : 1 }}>
                      {dodajuci === p.id ? t("adding") || "Dodajem..." : t("add") || "Dodaj"}
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

export default memo(UrediAlbum);
