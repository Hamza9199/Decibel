import React, { useEffect, useState, useMemo, useCallback, memo, } from "react";
// import styles from "./UrediPlaylistu.module.css";
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

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediPlaylistu: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./UrediPlaylistuWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./UrediPlaylistu.module.css");
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

  const { playlistaId } = useParams<{ playlistaId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  //const [removing, setRemoving] = useState(false);
  //const processingRef = useRef(false);
  //const removeQueue = useRef<number[]>([]);
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [previewSlika, setPreviewSlika] = useState<string>("");
  const [previewGif, setPreviewGif] = useState<string>("");
  const [javno, setJavno] = useState(false);
  const [localSongs, setLocalSongs] = useState<Pjesma[]>([]);
  
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

  useEffect(() => {
    setLocalSongs(songsQ.data || []);
  }, [songsQ.data]);

  useEffect(() => {
    if (playlistaQ.data) {
      setNaziv(playlistaQ.data.naziv || "");
      setOpis(playlistaQ.data.opis || "");
      setJavno(!!playlistaQ.data.javno);
    }
  }, [playlistaQ.data]);

  const handleFileChange = (file: File | null, isGif: boolean) => {
    if (!file) {
      if (isGif) {
        setFileGif(null);
        setPreviewGif("");
      } else {
        setFileSlika(null);
        setPreviewSlika("");
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (isGif) {
        setFileGif(file);
        setPreviewGif(preview);
      } else {
        setFileSlika(file);
        setPreviewSlika(preview);
      }
    };
    reader.readAsDataURL(file);
  };

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

  /*
  const removeSongMut = useMutation({
    mutationFn: async (pjesmaId: number) => {
      if (!playlistaId) return;
      await axios.delete(`${API_BASE}/pjesma_playlista/obrisi-iz-playliste/${pjesmaId}/${playlistaId}`);
    },
    onMutate: async (pjesmaId) => {
       setLocalSongs(prev =>
        prev.filter(p => p.id !== pjesmaId)
      );
          await qc.cancelQueries({
        queryKey: ["playlistSongs", playlistaId],
      });

      const previousSongs =
        qc.getQueryData<Pjesma[]>([
          "playlistSongs",
          playlistaId,
        ]) || [];

      qc.setQueryData(
        ["playlistSongs", playlistaId],
        previousSongs.filter(
          (p) => p.id !== pjesmaId
        )
      );

      return { previousSongs };
    },
    onError: (_err, _id, context) => {
      if (context?.previousSongs) {
          setLocalSongs(context.previousSongs);
        qc.setQueryData(
          ["playlistSongs", playlistaId],
          context.previousSongs
        );
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["playlistSongs", playlistaId],
      });
    },
  });

  */

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      updateMut.mutate();
    },
    [updateMut]
  );

  /*
  const processQueue = useCallback(() => {
    if (processingRef.current) return;

    const nextSongId = removeQueue.current.shift();

    if (nextSongId == null) return;

    processingRef.current = true;
    setRemoving(true);

    removeSongMut.mutate(nextSongId, {
      onSettled: () => {
        processingRef.current = false;
        setRemoving(false);
        processQueue();
      },
    });
  }, [removeSongMut]);

  
    const handleRemoveSong = useCallback(
      (pjesmaId: number) => {
        if (removeQueue.current.includes(pjesmaId)) {
          return;
        }

        removeQueue.current.push(pjesmaId);

        processQueue();
      },
      [processQueue]
    );
  */

  const playlista = playlistaQ.data;
  const pjesme = localSongs;
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

            <div className={styles.formGroup}>
              <label className={styles.label}>{t("playlist_name") || "Naziv"}</label>
              <input className={styles.input} value={naziv} onChange={(e) => setNaziv(e.target.value)} required />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{t("description")}</label>
              <textarea className={styles.textarea} value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{t("images") || "Slike (opcionalno)"}</label>
              <div className={styles.filesGrid}>
                <div className={styles.fileUploadBox}>
                  <label className={styles.fileInputLabel}>
                    <div className={styles.uploadArea}>
                      {previewSlika ? (
                        <img src={previewSlika} alt="Preview" className={styles.previewImage} />
                      ) : (
                        <>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                          <span>{t("image")}</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0] || null, false)} style={{ display: "none" }} />
                  </label>
                  {previewSlika && (
                    <button className={styles.removePreviewBtn} onClick={() => handleFileChange(null, false)} type="button">
                      ✕
                    </button>
                  )}
                </div>

                <div className={styles.fileUploadBox}>
                  <label className={styles.fileInputLabel}>
                    <div className={styles.uploadArea}>
                      {previewGif ? (
                        <img src={previewGif} alt="GIF Preview" className={styles.previewImage} />
                      ) : (
                        <>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 7l-7 5 7 5V7z"></path>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                          </svg>
                          <span>{t("gif")}</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/gif" onChange={(e) => handleFileChange(e.target.files?.[0] || null, true)} style={{ display: "none" }} />
                  </label>
                  {previewGif && (
                    <button className={styles.removePreviewBtn} onClick={() => handleFileChange(null, true)} type="button">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.checkboxLabel}>
              <input type="checkbox" checked={javno} onChange={(e) => setJavno(e.target.checked)} />
              {t("public_playlist")}
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <div className={styles.buttonGroup}>
              <button className={styles.button} type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? t("saving") || "Spremam..." : t("save_changes")}
              </button>
              <button className={styles.cancelBtn} type="button" onClick={() => navigate(`/playlista/${playlista.id}`)}>
                {t("cancel") || "Otkaži"}
              </button>
            </div>
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
                    {/*
                      <button
                        className={styles.removeBtn}
                        disabled={removing}
                        onClick={() => handleRemoveSong(p.id)}
                      > 
                      {removing ? t("removing") || "Uklanjam..." : t("remove") || "Izbaci"}
                    </button>
                     */}
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
