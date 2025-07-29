import React, { useEffect, useState } from "react";
import styles from "./AdminPanel.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Pjesma, Album, Playlista } from "../../types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const AdminPanel: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pjesme" | "albumi" | "playliste">("pjesme");
  const [search, setSearch] = useState("");
  const repeatAll = false;
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/pjesme/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/albumi/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/playliste/`).then((res) => res.data).catch(() => []),
    ])
      .then(([pjesmeData, albumiData, playlisteData]) => {
        setPjesme(pjesmeData);
        setAlbumi(albumiData);
        setPlayliste(playlisteData);
      })
      .catch(() => setError("Greška pri dohvatu podataka."))
      .finally(() => setLoading(false));
  }, []);

  const handleOdobriPjesmu = async (pjesma: Pjesma, odobreno: boolean) => {
    setError(null);
    setSuccess(null);
    try {
      await axios.put(
        `${API_BASE}/pjesme/${pjesma.id}`,
        {
          ...pjesma,
          odobreno,
        },
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setPjesme((prev) =>
        prev.map((p) =>
          p.id === pjesma.id ? { ...p, odobreno } : p
        )
      );
      setSuccess("Status pjesme je ažuriran.");
    } catch {
      setError("Greška pri ažuriranju statusa pjesme.");
    }
  };

  const handleOdobriAlbum = async (album: Album, odobreno: boolean) => {
    setError(null);
    setSuccess(null);
    try {
      await axios.put(
        `${API_BASE}/albumi/${album.id}`,
        {
          ...album,
          odobreno,
        },
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setAlbumi((prev) =>
        prev.map((a) =>
          a.id === album.id ? { ...a, odobreno } : a
        )
      );
      setSuccess("Status albuma je ažuriran.");
    } catch {
      setError("Greška pri ažuriranju statusa albuma.");
    }
  };

  const handlePlaySong = (p: Pjesma) => {
    if (!p.putanjaAudio) return;
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
  };

  const handlePlayAlbumSongs = (albumId: number) => {
    const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
    if (albumSongs.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("globalAudioPlaylist", {
        detail: {
          playlist: albumSongs,
          idx: 0,
          repeatAll,
        }
      })
    );
  };

  const handlePlayPlaylistSongs = async (playlistId: number) => {
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
            repeatAll,
          }
        })
      );
    } catch {
      setError("Greška pri dohvatu pjesama iz playliste.");
    }
  };

  const handleObrisiPjesmu = async (pjesmaId: number) => {
    if (!window.confirm("Da li ste sigurni da želite obrisati ovu pjesmu?")) return;
    setError(null);
    setSuccess(null);
    try {
      await axios.delete(`${API_BASE}/pjesme/${pjesmaId}`);
      setPjesme(prev => prev.filter(p => p.id !== pjesmaId));
      setSuccess("Pjesma je obrisana.");
    } catch {
      setError("Greška pri brisanju pjesme.");
    }
  };

  const handleObrisiAlbum = async (albumId: number) => {
    if (!window.confirm("Da li ste sigurni da želite obrisati ovaj album?")) return;
    setError(null);
    setSuccess(null);
    try {
      await axios.delete(`${API_BASE}/albumi/${albumId}`);
      setAlbumi(prev => prev.filter(a => a.id !== albumId));
      setSuccess("Album je obrisan.");
    } catch {
      setError("Greška pri brisanju albuma.");
    }
  };

  const handleObrisiPlaylistu = async (playlistaId: number) => {
    if (!window.confirm("Da li ste sigurni da želite obrisati ovu playlistu?")) return;
    setError(null);
    setSuccess(null);
    try {
      await axios.delete(`${API_BASE}/playliste/${playlistaId}`);
      setPlayliste(prev => prev.filter(pl => pl.id !== playlistaId));
      setSuccess("Playlista je obrisana.");
    } catch {
      setError("Greška pri brisanju playliste.");
    }
  };

  const filtriranePjesme = pjesme.filter((p) =>
    p.naziv.toLowerCase().includes(search.toLowerCase())
  );
  const filtriraniAlbumi = albumi.filter((a) =>
    a.naziv.toLowerCase().includes(search.toLowerCase())
  );
  const filtriranePlayliste = playliste.filter((pl) =>
    pl.naziv.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.adminBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("admin_panel") || "Admin panel"}</h2>
          <div style={{ display: "flex", gap: 16, marginBottom: 28, justifyContent: "center" }}>
            <button
              className={styles.btn}
              style={{
                background: activeTab === "pjesme" ? "#b91d95" : "#232323",
                color: activeTab === "pjesme" ? "#fff" : "#ffe6ec",
                border: activeTab === "pjesme" ? "2px solid #b91d95" : "2px solid #232323",
                fontWeight: activeTab === "pjesme" ? 700 : 500,
                fontSize: "1.07rem",
                padding: "10px 28px"
              }}
              onClick={() => { setActiveTab("pjesme"); setSearch(""); }}
            >
              {t("songs") || "Pjesme"}
            </button>
            <button
              className={styles.btn}
              style={{
                background: activeTab === "albumi" ? "#b91d95" : "#232323",
                color: activeTab === "albumi" ? "#fff" : "#ffe6ec",
                border: activeTab === "albumi" ? "2px solid #b91d95" : "2px solid #232323",
                fontWeight: activeTab === "albumi" ? 700 : 500,
                fontSize: "1.07rem",
                padding: "10px 28px"
              }}
              onClick={() => { setActiveTab("albumi"); setSearch(""); }}
            >
              {t("albums") || "Albumi"}
            </button>
            <button
              className={styles.btn}
              style={{
                background: activeTab === "playliste" ? "#b91d95" : "#232323",
                color: activeTab === "playliste" ? "#fff" : "#ffe6ec",
                border: activeTab === "playliste" ? "2px solid #b91d95" : "2px solid #232323",
                fontWeight: activeTab === "playliste" ? 700 : 500,
                fontSize: "1.07rem",
                padding: "10px 28px"
              }}
              onClick={() => { setActiveTab("playliste"); setSearch(""); }}
            >
              {t("playlists") || "Playliste"}
            </button>
          </div>
          <input
            type="text"
            placeholder={
              activeTab === "pjesme"
                ? t("search_songs") || "Pretraži pjesme..."
                : activeTab === "albumi"
                ? t("search_albums") || "Pretraži albume..."
                : t("search_playlists") || "Pretraži playliste..."
            }
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
              fontSize: "1.08rem",
              display: "block",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : (
            <>
              {success && <div className={styles.success}>{success}</div>}
              {error && <div className={styles.error}>{error}</div>}

              {activeTab === "pjesme" && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>{t("songs")}</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("song_name") || "Naziv"}</th>
                        <th>{t("artist") || "Izvođač"}</th>
                        <th>{t("play") || "Preslušaj"}</th>
                        <th>{t("approved") || "Odobreno"}</th>
                        <th>{t("action") || "Akcija"}</th>
                        <th>{t("delete") || "Obriši"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtriranePjesme.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ color: "#b3b3b3", textAlign: "center" }}>
                            {pjesme.length === 0
                              ? t("no_songs_user") || "Nema pjesama."
                              : t("no_results") || "Nema rezultata."}
                          </td>
                        </tr>
                      ) : (
                        filtriranePjesme.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <Link className="link" to={`/pjesma/${p.id}`}>{p.naziv}</Link>
                            </td>
                            <td>
                              <Link className="link" to={`/izvodjac/${p.korisnik?.id || p.korisnikID}`}>
                                {p.korisnik?.korisnicko_ime || p.korisnikID}
                              </Link>
                            </td>
                            <td>
                              {p.putanjaAudio && (
                                <button
                                  className={styles.btn}
                                  style={{ background: "#2ecc40", margin: 0 }}
                                  onClick={() => handlePlaySong(p)}
                                  title={t("play_song") || "Preslušaj pjesmu"}
                                >
                                  ▶
                                </button>
                              )}
                            </td>
                            <td>
                              <span
                                className={
                                  p.odobreno
                                    ? styles.odobreno
                                    : styles.neodobreno
                                }
                              >
                                {p.odobreno ? t("yes") || "DA" : t("no") || "NE"}
                              </span>
                            </td>
                            <td>
                              <button
                                className={styles.btn}
                                style={{
                                  background: p.odobreno ? "#e754a2" : "#b91d95",
                                }}
                                onClick={() =>
                                  handleOdobriPjesmu(p, !p.odobreno)
                                }
                              >
                                {p.odobreno ? t("revoke_approval") || "Poništi odobrenje" : t("approve") || "Odobri"}
                              </button>
                            </td>
                            <td>
                              <button
                                className={styles.btn}
                                style={{ background: "#e53935", margin: 0 }}
                                onClick={() => handleObrisiPjesmu(p.id)}
                                title={t("delete") || "Obriši pjesmu"}
                              >
                                {t("delete") || "Obriši"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              )}

              {activeTab === "albumi" && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>{t("albums")}</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("album_name") || "Naziv"}</th>
                        <th>{t("artist") || "Korisnik"}</th>
                        <th>{t("number_of_likes") || "Broj lajkova"}</th>
                        <th>{t("play") || "Preslušaj"}</th>
                        <th>{t("approved") || "Odobreno"}</th>
                        <th>{t("action") || "Akcija"}</th>
                        <th>{t("delete") || "Obriši"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtriraniAlbumi.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ color: "#b3b3b3", textAlign: "center" }}>
                            {albumi.length === 0
                              ? t("no_albums_user") || "Nema albuma."
                              : t("no_results") || "Nema rezultata."}
                          </td>
                        </tr>
                      ) : (
                        filtriraniAlbumi.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <Link className="link" to={`/album/${a.id}`}>{a.naziv}</Link>
                            </td>
                            <td>
                              <Link className="link" to={`/izvodjac/${a.korisnik?.id || a.korisnikID}`}>
                                {a.korisnik?.korisnicko_ime || a.korisnikID}
                              </Link>
                            </td>
                            <td>{a.brojLajkova}</td>
                            <td>
                              <button
                                className={styles.btn}
                                style={{ background: "#2ecc40", margin: 0 }}
                                onClick={() => handlePlayAlbumSongs(a.id)}
                                title={t("play_album") || "Preslušaj album"}
                              >
                                ▶
                              </button>
                            </td>
                            <td>
                              <span
                                className={
                                  a.odobreno
                                    ? styles.odobreno
                                    : styles.neodobreno
                                }
                              >
                                {a.odobreno ? t("yes") || "DA" : t("no") || "NE"}
                              </span>
                            </td>
                            <td>
                              <button
                                className={styles.btn}
                                style={{
                                  background: a.odobreno ? "#e754a2" : "#b91d95",
                                }}
                                onClick={() =>
                                  handleOdobriAlbum(a, !a.odobreno)
                                }
                              >
                                {a.odobreno ? t("revoke_approval") || "Poništi odobrenje" : t("approve") || "Odobri"}
                              </button>
                            </td>
                            <td>
                              <button
                                className={styles.btn}
                                style={{ background: "#e53935", margin: 0 }}
                                onClick={() => handleObrisiAlbum(a.id)}
                                title={t("delete") || "Obriši album"}
                              >
                                {t("delete") || "Obriši"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              )}

              {activeTab === "playliste" && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>{t("playlists")}</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("playlist_name") || "Naziv"}</th>
                        <th>{t("artist") || "Korisnik"}</th>
                        <th>{t("number_of_likes") || "Broj lajkova"}</th>
                        <th>{t("play") || "Preslušaj"}</th>
                        <th>{t("delete") || "Obriši"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtriranePlayliste.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ color: "#b3b3b3", textAlign: "center" }}>
                            {playliste.length === 0
                              ? t("no_playlists_user") || "Nema playlista."
                              : t("no_results") || "Nema rezultata."}
                          </td>
                        </tr>
                      ) : (
                        filtriranePlayliste.map((pl) => (
                          <tr key={pl.id}>
                            <td>
                              <Link className="link" to={`/playlista/${pl.id}`}>{pl.naziv}</Link>
                            </td>
                            <td>
                              <Link className="link" to={`/izvodjac/${pl.korisnik?.id || pl.korisnikID}`}>
                                {pl.korisnik?.korisnicko_ime || pl.korisnikID}
                              </Link>
                            </td>
                            <td>{pl.brojLajkova}</td>
                            <td>
                              <button
                                className={styles.btn}
                                style={{ background: "#2ecc40", margin: 0 }}
                                onClick={() => handlePlayPlaylistSongs(pl.id)}
                                title={t("play_playlist") || "Preslušaj playlistu"}
                              >
                                ▶
                              </button>
                            </td>
                            <td>
                              <button
                                className={styles.btn}
                                style={{ background: "#e53935", margin: 0 }}
                                onClick={() => handleObrisiPlaylistu(pl.id)}
                                title={t("delete") || "Obriši playlistu"}
                              >
                                {t("delete") || "Obriši"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminPanel;
