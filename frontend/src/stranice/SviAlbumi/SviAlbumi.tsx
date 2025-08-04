import React, { useEffect, useState } from "react";
import styles from "./SviAlbumi.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Album, Pjesma } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SviAlbumi: React.FC = () => {
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  let korisnikID: string | undefined = undefined;
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id;
  } catch {
    korisnikID = undefined;
  }

  useEffect(() => {
    if (!korisnikID) {
      setAlbumi([]);
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/albumi/`)
      .then((res) => {
        const mojiAlbumi = (res.data || []).filter(
          (a: Album) => a.korisnikID === korisnikID
        );
        setAlbumi(mojiAlbumi);
      })
      .catch(() => setAlbumi([]))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => setPjesme(res.data || []))
      .catch(() => setPjesme([]));
  }, [korisnikID]);

  const handlePlayAlbum = (albumId: number) => {
    const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
    if (albumSongs.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("globalAudioPlaylist", {
        detail: {
          playlist: albumSongs,
          idx: 0,
          repeatAll: false,
        }
      })
    );
  };

  const filtriraniAlbumi = albumi.filter((a) =>
    a.naziv.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.sviAlbumiBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("my_albums") || "Moji albumi"}</h2>
          <input
            type="text"
            placeholder={t("search_albums") || "Pretraži albume..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : filtriraniAlbumi.length === 0 ? (
            <div className={styles.noAlbums}>
              {albumi.length === 0
                ? t("no_albums_user") || "Nemate nijedan album."
                : t("no_results") || "Nema rezultata."}
            </div>
          ) : (
            <div className={styles.albumGrid}>
              {filtriraniAlbumi.map((a) => (
                <div key={a.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {a.putanjaSlika ? (
                      <img src={a.putanjaSlika} alt={a.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                    <button
                      className={styles.playButton}
                      onClick={() => handlePlayAlbum(a.id)}
                      title={t("play_album")}
                      style={{ left: 50, position: "absolute", bottom: 10 }}
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
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
                    <button >
                      {t("edit")}
                    </button>
                    </Link>
                    <button
                      className={styles.deleteButton}
                      onClick={() => {
                        if (window.confirm(t("confirm_delete_album") || "Jeste li sigurni da želite obrisati ovaj album?")) {
                          axios
                            .delete(`${API_BASE}/albumi/${a.id}`)
                            .then(() => {
                              setAlbumi((prev) => prev.filter((album) => album.id !== a.id));
                            })
                            .catch(() => alert(t("error_deleting_album") || "Greška pri brisanju albuma."));
                        }
                      }}
                    >
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

export default SviAlbumi;
