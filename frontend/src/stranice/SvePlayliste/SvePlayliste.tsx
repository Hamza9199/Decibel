import React, { useEffect, useState } from "react";
import styles from "./SvePlayliste.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Playlista } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";



const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SvePlayliste: React.FC = () => {
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  // Dohvati ID logovanog korisnika iz localStorage
  let korisnikID: string | undefined = undefined;
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id;
  } catch {
    korisnikID = undefined;
  }

  useEffect(() => {
    if (!korisnikID) {
      setPlayliste([]);
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/playliste/`)
      .then((res) => {
        // Filtriraj playliste po korisnikID
        const mojePlayliste = (res.data || []).filter(
          (pl: Playlista) => pl.korisnikID === korisnikID
        );
        setPlayliste(mojePlayliste);
      })
      .catch(() => setPlayliste([]))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  

  // Funkcija za puštanje playliste
  const handlePlayPlaylist = async (playlistId: number) => {
    // Dohvati redoslijed sa backenda
    try {
      const res = await axios.get(`${API_BASE}/pjesma_playlista/redoslijed/${playlistId}`);
      const idsZaDohvat: number[] = res.data || [];
      if (idsZaDohvat.length === 0) return;
      const pjesmeArr = await Promise.all(
        idsZaDohvat.map((id) =>
          axios
            .get(`${API_BASE}/pjesme/${id}`)
            .then((r) => r.data)
            .catch(() => null)
        )
      );
      const playlistSongs = pjesmeArr.filter(Boolean);
      if (playlistSongs.length === 0) return;
      window.dispatchEvent(
        new CustomEvent("globalAudioPlaylist", {
          detail: {
            playlist: playlistSongs,
            idx: 0,
            repeatAll: false,
          }
        })
      );
    } catch {
      // fallback na staro ponašanje ako backend ne radi
    }
  };

  // Dodaj filtrirane playliste prema search-u
  const filtriranePlayliste = playliste.filter((pl) =>
    pl.naziv.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.svePlaylisteBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("my_playlists") || "Moje playliste"}</h2>
          <input
            type="text"
            placeholder={t("search_playlists") || "Pretraži playliste..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 340,
              marginBottom: 24,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #b91d95",
              background: "#181818",
              color: "#fff",
              fontSize: "1.08rem"
            }}
          />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : filtriranePlayliste.length === 0 ? (
            <div className={styles.noPlaylists}>
              {playliste.length === 0
                ? t("no_playlists_user") || "Nemate nijednu playlistu."
                : t("no_results") || "Nema rezultata."}
            </div>
          ) : (
            <div className={styles.playlistGrid}>
              {filtriranePlayliste.map((pl) => (
                <div key={pl.id} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {pl.putanjaSlika ? (
                      <img src={pl.putanjaSlika} alt={pl.naziv} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImage} style={{ background: "#222" }} />
                    )}
                    {/* Play dugme za playlistu */}
                    <button
                      className={styles.playButton}
                      onClick={() => handlePlayPlaylist(pl.id)}
                      title={t("play_playlist")}
                      style={{ left: 50, position: "absolute", bottom: 10 }}
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
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
                    <button >
                      {t("edit")}
                    </button>
                    </Link>
                    <button
                      className={styles.deleteButton}
                      onClick={() => {
                        if (window.confirm(t("confirm_delete_playlist") || "Jeste li sigurni da želite obrisati ovu playlistu?")) {
                          axios
                            .delete(`${API_BASE}/playliste/${pl.id}`)
                            .then(() => {
                              setPlayliste((prev) => prev.filter((playlist) => playlist.id !== pl.id));
                            })
                            .catch(() => alert(t("error_deleting_playlist") || "Greška pri brisanju playliste."));
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

export default SvePlayliste;
