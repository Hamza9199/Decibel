import React, { useEffect, useState } from "react";
import styles from "./Pjesma.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import type { Pjesma, Korisnik, Komentar } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Pjesma: React.FC = () => {
  const { pjesmaId } = useParams<{ pjesmaId: string }>();
  const [pjesma, setPjesma] = useState<Pjesma | null>(null);
  const [izvodjaci, setIzvodjaci] = useState<Korisnik[]>([]);
  const [topPjesme, setTopPjesme] = useState<Pjesma[]>([]);
  const [loading, setLoading] = useState(true);
  const [komentari, setKomentari] = useState<Komentar[]>([]);
  const [korisniciKomentara, setKorisniciKomentara] = useState<{ [id: string]: Korisnik }>({});
  const [noviKomentar, setNoviKomentar] = useState("");
  const [editKomentarId, setEditKomentarId] = useState<number | null>(null);
  const [editKomentarTekst, setEditKomentarTekst] = useState("");
  const [komentarError, setKomentarError] = useState<string | null>(null);
  const [izdavac, setIzdavac] = useState<Korisnik | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  let mojID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    mojID = user?.id || "";
  } catch {
    mojID = "";
  }

  useEffect(() => {
    let isMounted = true;
    if (!pjesmaId) {
      setLoading(false);
      setPjesma(null);
      return;
    }
    setLoading(true);

    axios
      .get(`${API_BASE}/pjesme/${pjesmaId}`)
      .then((res) => {
        if (!isMounted) return;
        setPjesma(res.data);

        setLikeCount(res.data.brojLajkova || 0);
        if (mojID) {
          axios
            .get(`${API_BASE}/korisnik_pjesma/`)
            .then((resp) => {
              const veze = resp.data as { korisnikID: string; pjesmaID: number }[];
              setLiked(
                !!veze.find(
                  (v) =>
                    v.korisnikID === mojID &&
                    String(v.pjesmaID) === String(pjesmaId)
                )
              );
            })
            .catch(() => setLiked(false));
        }
        const korisnikID = res.data.korisnikID;
        if (korisnikID) {
          axios
            .get(`${API_BASE}/korisnici/${korisnikID}`)
            .then((r) => {
              if (isMounted) setIzdavac(r.data);
            })
            .catch(() => {
              if (isMounted) setIzdavac(null);
            });
        } else {
          setIzdavac(null);
        }

        axios
          .get(`${API_BASE}/izvodjac_pjesma/`)
          .then((resp) => {
            type IzvodjacPjesmaVeza = { pjesmaID: number; izvodjacID: string };
            const veze = (resp.data as IzvodjacPjesmaVeza[]).filter(
              (v) => String(v.pjesmaID) === String(pjesmaId)
            );
            if (!veze.length) {
              setIzvodjaci([]);
              return;
            }
            Promise.all(
              veze.map((v) =>
                axios
                  .get(`${API_BASE}/korisnici/${v.izvodjacID}`)
                  .then((r) => r.data)
                  .catch(() => null)
              )
            ).then((izv) => {
              if (isMounted) setIzvodjaci(izv.filter(Boolean));
            });
          })
          .catch(() => {
            if (isMounted) setIzvodjaci([]);
          });
      })
      .catch(() => {
        if (isMounted) setPjesma(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    axios
      .get(`${API_BASE}/pjesme/`)
      .then((res) => {
        if (!isMounted) return;
        const top = (res.data || [])
          .filter((p: Pjesma) => String(p.id) !== String(pjesmaId))
          .sort((a: Pjesma, b: Pjesma) => (b.brojLajkova || 0) - (a.brojLajkova || 0))
          .slice(0, 6);
        setTopPjesme(top);
      })
      .catch(() => {
        if (isMounted) setTopPjesme([]);
      });

    return () => {
      isMounted = false;
    };
  }, [pjesmaId, mojID]);

  useEffect(() => {
    if (!pjesmaId) return;
    axios
      .get(`${API_BASE}/komentari/`)
      .then(async (res) => {
        const svi: Komentar[] = res.data || [];
        const zaPjesmu = svi.filter((k) => String(k.pjesmaID) === String(pjesmaId));
        setKomentari(zaPjesmu);

        const korisnikIds = Array.from(new Set(zaPjesmu.map((k) => k.korisnikID)));
        const korisniciObj: { [id: string]: Korisnik } = {};
        await Promise.all(
          korisnikIds.map((kid) =>
            axios
              .get(`${API_BASE}/korisnici/${kid}`)
              .then((r) => {
                korisniciObj[kid] = r.data;
              })
              .catch(() => {})
            )
        );
        setKorisniciKomentara(korisniciObj);
      })
      .catch(() => setKomentari([]));
  }, [pjesmaId]);

  const handlePlay = (p: Pjesma) => {
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
  };

  const handleDodajKomentar = async (e: React.FormEvent) => {
    e.preventDefault();
    setKomentarError(null);
    if (!mojID || !pjesmaId || !noviKomentar.trim()) {
      setKomentarError("Komentar ne smije biti prazan.");
      return;
    }
    try {
      await axios.post(`${API_BASE}/komentari/`, {
        korisnikID: mojID,
        pjesmaID: Number(pjesmaId),
        tekst: noviKomentar,
        vrijemePjesmeSekunde: 0,
        kreiranDatumVrijeme: new Date().toISOString(),
      });
      setNoviKomentar("");
      const res = await axios.get(`${API_BASE}/komentari/`);
      const svi: Komentar[] = res.data || [];
      setKomentari(svi.filter((k) => String(k.pjesmaID) === String(pjesmaId)));
    } catch {
      setKomentarError("Greška pri dodavanju komentara.");
    }
  };

  const handleUrediKomentar = async (id: number) => {
    setKomentarError(null);
    if (!editKomentarTekst.trim()) {
      setKomentarError("Komentar ne smije biti prazan.");
      return;
    }
    try {
      await axios.put(`${API_BASE}/komentari/${id}`, {
        tekst: editKomentarTekst,
      });
      setEditKomentarId(null);
      setEditKomentarTekst("");
      const res = await axios.get(`${API_BASE}/komentari/`);
      const svi: Komentar[] = res.data || [];
      setKomentari(svi.filter((k) => String(k.pjesmaID) === String(pjesmaId)));
    } catch {
      setKomentarError("Greška pri uređivanju komentara.");
    }
  };

  const komentariSortirani = (() => {
    if (!mojID) return komentari;
    const vlasnikKomentar = komentari.find((k) => k.korisnikID === mojID);
    const ostali = komentari.filter((k) => k.korisnikID !== mojID);
    return vlasnikKomentar ? [vlasnikKomentar, ...ostali] : ostali;
  })();

  const handleLike = async () => {
    if (!pjesma || !mojID) return;
    if (liked) {
      await axios
        .delete(`${API_BASE}/korisnik_pjesma/${mojID}/${pjesma.id}`)
        .catch(() => {});
      setLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      await axios
        .post(`${API_BASE}/korisnik_pjesma/`, {
          korisnikID: mojID,
          pjesmaID: pjesma.id,
          kreiranDatumVrijeme: new Date().toISOString(),
        })
        .catch(() => {});
      setLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  if (loading) return <Loading />;

  if (!pjesma)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>{t("song_not_found") || "Pjesma nije pronađena."}</h2>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            {t("back") || "Nazad"}
          </button>
        </div>
        <Footer />
      </div>
    );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.pjesmaBg}>
        <div className={styles.container}>
          <div className={styles.pjesmaMain}>
            <div className={styles.pjesmaSlikaWrap}>
              <img
                src={pjesma.putanjaSlika || "/logo.gif"}
                alt={pjesma.naziv}
                className={styles.pjesmaSlika}
              />
              <div className={styles.actionBtnsRow}>
                <button
                  className={`${styles.playBtn} ${styles.likeBtn} ${liked ? styles.liked : ""}`}
                  onClick={handleLike}
                  title={liked ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj pjesmu"}
                  style={{ right: 90, left: "auto", background: liked ? "#f6b6d8ff" : "#b91d95" }}
                >
                  <svg width="40" height="40" viewBox="0 0 28 28" fill="#fff">
                    <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                  </svg>
                  <span style={{ color: "#fff", fontWeight: 600, marginLeft: 6 }}>{likeCount}</span>
                </button>
                {pjesma.putanjaAudio && (
                  <button
                    className={styles.playBtn}
                    onClick={() => handlePlay(pjesma)}
                    title={t("play_song")}
                  >
                    <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff">
                      <polygon points="12,8 36,22 12,36" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className={styles.pjesmaInfo}>
              <h2 className={styles.pjesmaNaziv}>{pjesma.naziv}</h2>
              <div className={styles.pjesmaOpis}>{pjesma.opis}</div>
              <div className={styles.pjesmaMeta}>
                <span>
                  {t("duration_seconds") || "Trajanje"}: <b>{formatTrajanje(pjesma.trajanjeSekunde)}</b>
                </span>
                <span>
                  {t("genre") || "Žanr"}: <b>{pjesma.zanr}</b>
                </span>
                <span>
                  {t("number_of_likes") || "Lajkova"}: <b>{pjesma.brojLajkova}</b>
                </span>            
              </div>
              <div className={styles.izvodjaciWrap}>
                <span className={styles.izvodjaciLabel}>{t("publisher") || "Izdavač"}:</span>
                {izdavac ? (
                  <span className={styles.izvodjacIme}>
                    <img
                      src={izdavac.putanjaProfilneSlike || "/logo.gif"}
                      alt={izdavac.korisnicko_ime}
                      className={styles.izvodjacSlika}
                    />
                    {izdavac.korisnicko_ime}
                  </span>
                ) : (
                  <span className={styles.izvodjacIme}>{t("unknown") || "Nepoznato"}</span>
                )}
                <span className={styles.izvodjaciLabel} style={{ marginLeft: 18 }}>{t("artists") || "Izvođači"}:</span>
                {izvodjaci.length === 0 ? (
                  <span className={styles.izvodjacIme}>{t("unknown") || "Nepoznato"}</span>
                ) : (
                  izvodjaci.map((izv) => (
                    <span key={izv.id} className={styles.izvodjacIme}>
                      <img
                        src={izv.putanjaProfilneSlike || "/logo.gif"}
                        alt={izv.korisnicko_ime}
                        className={styles.izvodjacSlika}
                      />
                      {izv.korisnicko_ime}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className={styles.topPjesmeSection}>
            <h3 className={styles.topPjesmeTitle}>{t("recommended_songs") || "Preporučene pjesme"}</h3>
            <div className={styles.topPjesmeGrid}>
              {topPjesme.map((p) => (
                <div key={p.id} className={styles.topPjesmaCard}>
                  <div className={styles.topPjesmaSlikaWrap}>
                    <img
                      src={p.putanjaSlika || "/logo.gif"}
                      alt={p.naziv}
                      className={styles.topPjesmaSlika}
                    />
                    {p.putanjaAudio && (
                      <button
                        className={styles.topPlayBtn}
                        onClick={() => handlePlay(p)}
                        title={t("play_song")}
                      >
                        <svg width="28" height="28" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className={styles.topPjesmaNaziv}>{p.naziv}</div>
                  <div className={styles.topPjesmaIzvodjac}>
                    {p.korisnik?.korisnicko_ime || ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 60 }}>
            <h3 className={styles.topPjesmeTitle}>{t("comments") || "Komentari"}</h3>
            <form onSubmit={handleDodajKomentar} style={{ marginBottom: 24 }}>
              <textarea
                value={noviKomentar}
                onChange={e => setNoviKomentar(e.target.value)}
                placeholder={t("add_comment") || "Dodaj komentar..."}
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #b91d95",
                  padding: 10,
                  fontSize: "1.08rem",
                  background: "#181818",
                  color: "#fff",
                  marginBottom: 8,
                  resize: "vertical"
                }}
              />
              <div className={styles.kom}>
              {komentarError && <div style={{ color: "#ff4d4f", marginBottom: 8 }}>{komentarError}</div>}
              <button
                type="submit"
                style={{
                  background: "#b91d95",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontWeight: 700,
                  fontSize: "1.08rem",
                  cursor: "pointer"
                }}
              >
                {t("add_comment") || "Dodaj komentar"}
              </button>
              </div>
            </form>
            <div>
              {komentariSortirani.length === 0 ? (
                <div style={{ color: "#b3b3b3" }}>{t("no_comments") || "Nema komentara."}</div>
              ) : (
                komentariSortirani.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      background: k.korisnikID === mojID ? "#2a182a" : "#232323",
                      borderRadius: 8,
                      padding: 14,
                      marginBottom: 12,
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <img
                        src={korisniciKomentara[k.korisnikID]?.putanjaProfilneSlike || "/logo.gif"}
                        alt={korisniciKomentara[k.korisnikID]?.korisnicko_ime || ""}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          objectFit: "cover",
                          marginRight: 10,
                          border: k.korisnikID === mojID ? "2px solid #b91d95" : "none"
                        }}
                      />
                      <span style={{ color: "#ffe6ec", fontWeight: 600 }}>
                        {korisniciKomentara[k.korisnikID]?.korisnicko_ime || t("user") || "Korisnik"}
                        {k.korisnikID === mojID && " (Vi)"}
                      </span>
                      <span style={{ color: "#b3b3b3", fontSize: "0.98rem", marginLeft: 12 }}>
                        {k.kreiranDatumVrijeme ? new Date(k.kreiranDatumVrijeme).toLocaleString() : ""}
                      </span>
                    </div>
                    {editKomentarId === k.id ? (
                      <div>
                        <textarea
                          value={editKomentarTekst}
                          onChange={e => setEditKomentarTekst(e.target.value)}
                          rows={2}
                          style={{
                            width: "100%",
                            borderRadius: 6,
                            border: "1px solid #b91d95",
                            padding: 8,
                            fontSize: "1.05rem",
                            background: "#181818",
                            color: "#fff",
                            marginBottom: 8,
                            resize: "vertical"
                          }}
                        />
                        <button
                          style={{
                            background: "#b91d95",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "7px 18px",
                            fontWeight: 600,
                            fontSize: "1.02rem",
                            marginRight: 8,
                            cursor: "pointer"
                          }}
                          onClick={() => handleUrediKomentar(k.id)}
                        >
                          {t("save_changes") || "Sačuvaj"}
                        </button>
                        <button
                          style={{
                            background: "#232323",
                            color: "#ffe6ec",
                            border: "1px solid #b91d95",
                            borderRadius: 6,
                            padding: "7px 18px",
                            fontWeight: 600,
                            fontSize: "1.02rem",
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            setEditKomentarId(null);
                            setEditKomentarTekst("");
                          }}
                        >
                          {t("cancel") || "Odustani"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: "#fff", fontSize: "1.08rem", marginBottom: 2 }}>
                        {k.tekst}
                        {k.korisnikID === mojID && (
                          <button
                            style={{
                              marginLeft: 18,
                              background: "#232323",
                              color: "#b91d95",
                              border: "1px solid #b91d95",
                              borderRadius: 6,
                              padding: "4px 12px",
                              fontWeight: 600,
                              fontSize: "0.98rem",
                              cursor: "pointer"
                            }}
                            onClick={() => {
                              setEditKomentarId(k.id);
                              setEditKomentarTekst(k.tekst);
                            }}
                          >
                            {t("edit") || "Uredi"}
                          </button>
                        )}
                      </div>
                    )}
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

function formatTrajanje(sec?: number) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default Pjesma;
