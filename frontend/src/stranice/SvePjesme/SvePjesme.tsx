import React, { useEffect, useState } from "react";
import styles from "./SvePjesme.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SvePjesme: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
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
      setPjesme([]);
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        const mojePjesme = (res.data || []).filter(
          (p: Pjesma) => p.korisnikID === korisnikID
        );
        setPjesme(mojePjesme);
      })
      .catch(() => setPjesme([]))
      .finally(() => setLoading(false));
  }, [korisnikID]);

  const handlePlay = (p: Pjesma) => {
    setActiveSongId(p.id);
    if (p.putanjaAudio) {
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
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Da li ste sigurni da želite obrisati ovu pjesmu?")) {
      axios
        .delete(`${API_BASE}/pjesme/${id}`)
        .then(() => {
          setPjesme((prev) => prev.filter((p) => p.id !== id));
        })
        .catch(() => {
        });
    }
  };

  const filtriranePjesme = pjesme.filter((p) =>
    p.naziv.toLowerCase().includes(search.toLowerCase())
  );

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
                  <Link to={`/izvodjac/${p.korisnikID}`}>
                  <div className={styles.cardDesc}>{p.korisnik?.korisnicko_ime || <span>&nbsp;</span>}</div>
                  </Link>
                  <div className={styles.cardActions}>
                  <Link
                    to={`/uredi-pjesmu/${p.id}`}
                    className="link"
                  >
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

export default SvePjesme;
