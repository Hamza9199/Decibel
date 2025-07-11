import React, { useEffect, useState } from "react";
import styles from "./Omiljeno.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { Pjesma, Album, Playlista, Korisnik, KorisnikPjesma, KorisnikAlbum, KorisnikPlaylista } from "../../types";
import Loading from "../../komponente/Loading/Loading";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Omiljeno: React.FC = () => {
  const { "*": tipRaw } = useParams(); 
  const tip = (tipRaw ?? window.location.pathname.split("/").pop() ?? "").toLowerCase(); 
  const [loading, setLoading] = useState(true);
  const [korisnikID, setKorisnikID] = useState<string>("");
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [omiljenePjesme, setOmiljenePjesme] = useState<KorisnikPjesma[]>([]);
  const [omiljeniAlbumi, setOmiljeniAlbumi] = useState<KorisnikAlbum[]>([]);
  const [omiljenePlayliste, setOmiljenePlayliste] = useState<KorisnikPlaylista[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState<null | number>(null); // pjesmaID za modal
  const [playlists, setPlaylists] = useState<Playlista[]>([]);
  const [likeMap, setLikeMap] = useState<{ [pjesmaId: number]: boolean }>({});
  const [likeAlbumMap, setLikeAlbumMap] = useState<{ [albumId: number]: boolean }>({});
  const [likePlaylistMap, setLikePlaylistMap] = useState<{ [playlistaId: number]: boolean }>({});
  const repeatAll = false;

  useEffect(() => {
    let id = "";
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      id = user?.id || "";
    } catch {
      id = "";
    }
    setKorisnikID(id);
  }, []);

  useEffect(() => {
    if (!korisnikID) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/pjesme/`).then(res => res.data).catch(() => []),
      axios.get(`${API_BASE}/albumi/`).then(res => res.data).catch(() => []),
      axios.get(`${API_BASE}/playliste/`).then(res => res.data).catch(() => []),
      axios.get(`${API_BASE}/korisnici/`).then(res => res.data).catch(() => []),
      axios.get(`${API_BASE}/korisnik_pjesma/`).then(res => res.data).catch(() => []),
      axios.get(`${API_BASE}/korisnik_album/`).then(res => res.data).catch(() => []),
      axios.get(`${API_BASE}/korisnik_playlista/`).then(res => res.data).catch(() => []),
    ]).then(([pjesmeData, albumiData, playlisteData, korisniciData, kpData, kaData, kplData]) => {
      setPjesme(pjesmeData);
      setAlbumi(albumiData);
      setPlayliste(playlisteData);
      setKorisnici(korisniciData);
      setOmiljenePjesme((kpData || []).filter((k: KorisnikPjesma) => k.korisnikID === korisnikID));
      setOmiljeniAlbumi((kaData || []).filter((k: KorisnikAlbum) => k.korisnikID === korisnikID));
      setOmiljenePlayliste((kplData || []).filter((k: KorisnikPlaylista) => k.korisnikID === korisnikID));
      setLoading(false);
    });
    axios.get(`${API_BASE}/playliste/`).then(res => setPlaylists(res.data || [])).catch(() => setPlaylists([]));
    // Dohvati lajkove korisnika za pjesme
    axios.get(`${API_BASE}/korisnik_pjesma/`).then(res => {
      const veze = res.data as KorisnikPjesma[];
      const map: { [pjesmaId: number]: boolean } = {};
      veze.filter(v => v.korisnikID === korisnikID).forEach(v => { map[v.pjesmaID] = true; });
      setLikeMap(map);
    }).catch(() => setLikeMap({}));
    // Album lajkovi
    axios.get(`${API_BASE}/korisnik_album/`).then(res => {
      const veze = res.data as KorisnikAlbum[];
      const map: { [albumId: number]: boolean } = {};
      veze.filter(v => v.korisnikID === korisnikID).forEach(v => { map[v.albumID] = true; });
      setLikeAlbumMap(map);
    }).catch(() => setLikeAlbumMap({}));
    // Playlist lajkovi
    axios.get(`${API_BASE}/korisnik_playlista/`).then(res => {
      const veze = res.data as KorisnikPlaylista[];
      const map: { [playlistaId: number]: boolean } = {};
      veze.filter(v => v.korisnikID === korisnikID).forEach(v => { map[v.playlistaID] = true; });
      setLikePlaylistMap(map);
    }).catch(() => setLikePlaylistMap({}));
  }, [korisnikID, tipRaw]);

  // Helper za play pjesme
  const handlePlay = (p: Pjesma) => {
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

  // Helper za play album
  const handlePlayAlbum = (albumId: number) => {
    const albumSongs = pjesme.filter((p) => p.albumID === albumId && p.putanjaAudio);
    if (albumSongs.length === 0) return;
    let idx = 0;
    const playNext = () => {
      if (idx >= albumSongs.length) return;
      const p = albumSongs[idx];
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
      idx++;
      const handler = () => {
        playNext();
        window.removeEventListener("audioSongEnded", handler);
      };
      window.addEventListener("audioSongEnded", handler);
    };
    playNext();
  };

  // Helper za play playlistu
  const handlePlayPlaylist = (playlistId: number) => {
    const playlistSongs = pjesme.filter((p) => p.id === playlistId && p.putanjaAudio);
    if (playlistSongs.length === 0) return;
    let idx = 0;
    const playNext = () => {
      if (idx >= playlistSongs.length) {
        if (repeatAll) {
           idx = 0;
         } else {
           return;
         }
       }
       const p = pjesme[idx];
       window.dispatchEvent(
         new CustomEvent("globalAudioPlay", {
           detail:
             {
               src: p.putanjaAudio,
               title: p.naziv,
               putanjaGif: p.putanjaGif,
               putanjaSlika: p.putanjaSlika,
               korisnikID: p.korisnikID,
             },
         })
       );
       idx++;
       // Slušaj završetak pjesme i pusti sljedeću
       const handler = () => {
         playNext();
         window.removeEventListener("audioSongEnded", handler);
       };
       window.addEventListener("audioSongEnded", handler);
     };
     playNext();
   };

  // Like/Unlike handler za pjesmu
  const handleLike = async (p: Pjesma) => {
    if (!korisnikID || !p.id) return;
    if (likeMap[p.id]) {
      await axios.delete(`${API_BASE}/korisnik_pjesma/${korisnikID}/${p.id}`).catch(() => {});
      setLikeMap((prev) => ({ ...prev, [p.id]: false }));
    } else {
      await axios.post(`${API_BASE}/korisnik_pjesma/`, {
        korisnikID,
        pjesmaID: p.id,
        kreiranDatumVrijeme: new Date().toISOString(),
      }).catch(() => {});
      setLikeMap((prev) => ({ ...prev, [p.id]: true }));
    }
  };

  const handleLikeAlbum = async (albumId: number) => {
    if (!korisnikID || !albumId) return;
    if (likeAlbumMap[albumId]) {
      await axios.delete(`${API_BASE}/korisnik_album/${korisnikID}/${albumId}`).catch(() => {});
      setLikeAlbumMap((prev) => ({ ...prev, [albumId]: false }));
    } else {
      await axios.post(`${API_BASE}/korisnik_album/`, {
        korisnikID,
        albumID: albumId,
        kreiranDatumVrijeme: new Date().toISOString(),
      }).catch(() => {});
      setLikeAlbumMap((prev) => ({ ...prev, [albumId]: true }));
    }
  };

  const handleLikePlaylist = async (playlistaId: number) => {
    if (!korisnikID || !playlistaId) return;
    if (likePlaylistMap[playlistaId]) {
      await axios.delete(`${API_BASE}/korisnik_playlista/${korisnikID}/${playlistaId}`).catch(() => {});
      setLikePlaylistMap((prev) => ({ ...prev, [playlistaId]: false }));
    } else {
      await axios.post(`${API_BASE}/korisnik_playlista/`, {
        korisnikID,
        playlistaID: playlistaId,
        kreiranDatumVrijeme: new Date().toISOString(),
      }).catch(() => {});
      setLikePlaylistMap((prev) => ({ ...prev, [playlistaId]: true }));
    }
  };

  // Dodavanje pjesme u bilo koju playlistu
  const handleAddToPlaylist = async (pjesmaID: number, playlistaID: number) => {
    try {
      await axios.post(`${API_BASE}/pjesma_playlista/`, {
        pjesmaID,
        playlistaID,
        pokazivacNaSljedecuPjesmuID: null,
        pokazivacNaPrethodnuPjesmuID: null,
        kreiranDatumVrijeme: null,
      });
      setShowPlaylistModal(null);
      alert("Pjesma je dodana u playlistu!");
    } catch {
      alert("Greška pri dodavanju pjesme u playlistu.");
    }
  };

  if (loading) return <Loading />;

  let content = null;
  if (tip === "pjesme" || tip === "albumi" || tip === "playliste") {
    if (tip === "pjesme") {
      content = (
        <div>
          <h2 className={styles.title}>Omiljene pjesme</h2>
          {omiljenePjesme.length === 0 ? (
            <div className={styles.noItems}>Nemate omiljenih pjesama.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Slika</th>
                  <th>Naziv</th>
                  <th>Izvođač</th>
                  <th>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {omiljenePjesme.map((kp, idx) => {
                  const p = pjesme.find((pp) => pp.id === kp.pjesmaID);
                  if (!p) return null;
                  const izvodjac = korisnici.find((k) => k.id === p.korisnikID);
                  return (
                    <tr key={kp.pjesmaID}>
                      <td>{idx + 1}</td>
                      <td>
                        <Link to={`/pjesma/${p.id}`}>
                          <img src={p.putanjaSlika || "/logo.gif"} alt={p.naziv} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        </Link>
                      </td>
                      <td>
                        <Link to={`/pjesma/${p.id}`}>{p.naziv}</Link>
                      </td>
                      <td>
                        {izvodjac ? (
                          <Link to={`/izvodjac/${izvodjac.id}`}>{izvodjac.korisnicko_ime}</Link>
                        ) : ""}
                      </td>
                      <td>
                        {p.putanjaAudio && (
                          <>
                            <button
                              style={{ background: "#b91d95", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", cursor: "pointer", marginRight: 6 }}
                              onClick={() => handlePlay(p)}
                              title="Pusti pjesmu"
                            >
                              <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                                <polygon points="12,8 36,22 12,36" />
                              </svg>
                            </button>
                            <button
                              style={{
                                background: likeMap[p.id] ? "#e754a2" : "#efe6edff",
                                border: "none",
                                borderRadius: "50%",
                                width: 38,
                                height: 38,
                                color: "#fff",
                                cursor: "pointer",
                                marginRight: 6
                              }}
                              onClick={() => handleLike(p)}
                              title={likeMap[p.id] ? "Ukloni lajk" : "Lajkuj pjesmu"}
                            >
                              <svg width="22" height="22" viewBox="0 0 28 28" fill={likeMap[p.id] ? "#fdb9ddff" : "#fff"}>
                                <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                              </svg>
                            </button>
                            <button
                              style={{
                                background: "#b91d95",
                                border: "none",
                                borderRadius: "50%",
                                width: 38,
                                height: 38,
                                color: "#fff",
                                cursor: "pointer"
                              }}
                              onClick={() => setShowPlaylistModal(p.id)}
                              title="Dodaj u playlistu"
                            >
                              <svg width="22" height="22" viewBox="0 0 44 44" fill="#ffe6ec">
                                <rect x="18" y="8" width="8" height="28" />
                                <rect x="8" y="18" width="28" height="8" />
                              </svg>
                            </button>
                            {/* Modal za izbor playliste */}
                            {showPlaylistModal === p.id && (
                              <div
                                style={{
                                  position: "fixed",
                                  inset: 0,
                                  background: "rgba(24,24,24,0.85)",
                                  zIndex: 3000,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() => setShowPlaylistModal(null)}
                              >
                                <div
                                  style={{
                                    background: "#232323",
                                    borderRadius: 14,
                                    padding: "32px 24px 24px 24px",
                                    minWidth: 320,
                                    boxShadow: "0 4px 24px #b91d9533",
                                    textAlign: "center",
                                  }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <h4 style={{ color: "#fff", marginBottom: 18 }}>Dodaj pjesmu u playlistu</h4>
                                  <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 18 }}>
                                    {playlists.map((pl) => (
                                      <li key={pl.id} style={{ marginBottom: 8 }}>
                                        <button
                                          style={{
                                            background: "#b91d95",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 8,
                                            padding: "10px 0",
                                            fontSize: "1.08rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            width: "100%",
                                            transition: "background 0.18s",
                                          }}
                                          onClick={() => handleAddToPlaylist(p.id, pl.id)}
                                        >
                                          {pl.naziv}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                  <button
                                    style={{
                                      background: "#232323",
                                      color: "#ffe6ec",
                                      border: "1px solid #b91d95",
                                      borderRadius: 8,
                                      padding: "10px 0",
                                      fontSize: "1rem",
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      width: "100%",
                                      transition: "background 0.18s, color 0.18s",
                                    }}
                                    onClick={() => setShowPlaylistModal(null)}
                                  >
                                    Zatvori
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    } else if (tip === "albumi") {
      content = (
        <div>
          <h2 className={styles.title}>Omiljeni albumi</h2>
          {omiljeniAlbumi.length === 0 ? (
            <div className={styles.noItems}>Nemate omiljenih albuma.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Slika</th>
                  <th>Naziv</th>
                  <th>Izvođač</th>
                  <th>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {omiljeniAlbumi.map((ka, idx) => {
                  const a = albumi.find((aa) => aa.id === ka.albumID);
                  if (!a) return null;
                  const izvodjac = korisnici.find((k) => k.id === a.korisnikID);
                  return (
                    <tr key={ka.albumID}>
                      <td>{idx + 1}</td>
                      <td>
                        <Link to={`/album/${a.id}`}>
                          <img src={a.putanjaSlika || "/logo.gif"} alt={a.naziv} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        </Link>
                      </td>
                      <td>
                        <Link to={`/album/${a.id}`}>{a.naziv}</Link>
                      </td>
                      <td>
                        {izvodjac ? (
                          <Link to={`/izvodjac/${izvodjac.id}`}>{izvodjac.korisnicko_ime}</Link>
                        ) : ""}
                      </td>
                      <td>
                        <button
                          style={{ background: "#b91d95", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", cursor: "pointer", marginRight: 6 }}
                          onClick={() => handlePlayAlbum(a.id)}
                          title="Pusti album"
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                        <button
                          style={{
                            background: likeAlbumMap[a.id] ? "#e754a2" : "#efe6edff",
                            border: "none",
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            color: "#fff",
                            cursor: "pointer"
                          }}
                          onClick={() => handleLikeAlbum(a.id)}
                          title={likeAlbumMap[a.id] ? "Ukloni lajk" : "Lajkuj album"}
                        >
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likeAlbumMap[a.id] ? "#fdb9ddff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    } else if (tip === "playliste") {
      content = (
        <div>
          <h2 className={styles.title}>Omiljene playliste</h2>
          {omiljenePlayliste.length === 0 ? (
            <div className={styles.noItems}>Nemate omiljenih plejlista.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Slika</th>
                  <th>Naziv</th>
                  <th>Vlasnik</th>
                  <th>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {omiljenePlayliste.map((kpl, idx) => {
                  const pl = playliste.find((pll) => pll.id === kpl.playlistaID);
                  if (!pl) return null;
                  const vlasnik = korisnici.find((k) => k.id === pl.korisnikID);
                  return (
                    <tr key={kpl.playlistaID}>
                      <td>{idx + 1}</td>
                      <td>
                        <Link to={`/playlista/${pl.id}`}>
                          <img src={pl.putanjaSlika || "/logo.gif"} alt={pl.naziv} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        </Link>
                      </td>
                      <td>
                        <Link to={`/playlista/${pl.id}`}>{pl.naziv}</Link>
                      </td>
                      <td>
                        {vlasnik ? (
                          <Link to={`/izvodjac/${vlasnik.id}`}>{vlasnik.korisnicko_ime}</Link>
                        ) : ""}
                      </td>
                      <td>
                        <button
                          style={{ background: "#b91d95", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", cursor: "pointer", marginRight: 6 }}
                          onClick={() => handlePlayPlaylist(pl.id)}
                          title="Pusti playlistu"
                        >
                          <svg width="22" height="22" viewBox="0 0 44 44" fill="#fff">
                            <polygon points="12,8 36,22 12,36" />
                          </svg>
                        </button>
                        <button
                          style={{
                            background: likePlaylistMap[pl.id] ? "#e754a2" : "#efe6edff",
                            border: "none",
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            color: "#fff",
                            cursor: "pointer"
                          }}
                          onClick={() => handleLikePlaylist(pl.id)}
                          title={likePlaylistMap[pl.id] ? "Ukloni lajk" : "Lajkuj playlistu"}
                        >
                          <svg width="22" height="22" viewBox="0 0 28 28" fill={likePlaylistMap[pl.id] ? "#fdb9ddff" : "#fff"}>
                            <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    }
  } else {
    content = <div className={styles.noItems}>Nepoznat tip omiljenih.</div>;
  }

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.pjesmaBg}>
        <div className={styles.container}>
          {content}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Omiljeno;
