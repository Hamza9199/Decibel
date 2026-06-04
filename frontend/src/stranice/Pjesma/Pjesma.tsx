import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
// import styles from "./Pjesma.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import type { Pjesma as PjesmaType, Korisnik, Komentar } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

type IzvodjacPjesmaVeza = { pjesmaID: number; izvodjacID: string };

type KomentariQuery = { list: Komentar[]; users: { [id: string]: Korisnik } };

function formatTrajanje(sec?: number) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const Pjesma: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./PjesmaWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Pjesma.module.css");
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

  const { pjesmaId } = useParams<{ pjesmaId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [noviKomentar, setNoviKomentar] = useState("");
  const [editKomentarId, setEditKomentarId] = useState<number | null>(null);
  const [editKomentarTekst, setEditKomentarTekst] = useState("");
  const [komentarError, setKomentarError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [liked, setLiked] = useState(false);
  const [topPjesmeIzvodjaci, setTopPjesmeIzvodjaci] = useState<
    Record<number, Korisnik[]>
  >({});
  

  const mojID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  const pjesmaQ = useQuery<PjesmaType | null>({
    queryKey: ["pjesma", pjesmaId],
    enabled: Boolean(pjesmaId),
    queryFn: async () => axios.get(`${API_BASE}/pjesme/${pjesmaId}`).then((r) => r.data as PjesmaType),
  });

  useEffect(() => {
    setLikeCount(pjesmaQ.data?.brojLajkova || 0);
  }, [pjesmaQ.data?.brojLajkova]);


  useEffect(() => {
  if (!mojID || !pjesmaId) {
    setLiked(false);
    return;
  }

  axios
    .get(`${API_BASE}/korisnik_pjesma/${mojID}/${pjesmaId}`)
    .then((res) => setLiked(res.data.liked))
    .catch(() => setLiked(false));
}, [mojID, pjesmaId]);
  

  const izdavacQ = useQuery<Korisnik | null>({
    queryKey: ["izdavac", pjesmaQ.data?.korisnikID],
    enabled: Boolean(pjesmaQ.data?.korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/korisnici/${pjesmaQ.data?.korisnikID}`).then((r) => r.data as Korisnik),
  });

  const izvodjaciQ = useQuery<Korisnik[]>({
    queryKey: ["izvodjaciPjesme", pjesmaId],
    enabled: Boolean(pjesmaId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const veze = ((r.data || []) as IzvodjacPjesmaVeza[]).filter((v) => String(v.pjesmaID) === String(pjesmaId));
      if (!veze.length) return [] as Korisnik[];
      const korisnici = await Promise.all(
        veze.map((v) => axios.get(`${API_BASE}/korisnici/${v.izvodjacID}`).then((x) => x.data).catch(() => null))
      );
      return korisnici.filter(Boolean) as Korisnik[];
    },
    initialData: [],
  });

  const topPjesmeQ = useQuery<PjesmaType[]>({
    queryKey: ["topPjesme", pjesmaId],
    enabled: Boolean(pjesmaId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/pjesme/`);
      const all: PjesmaType[] = r.data || [];
      return all
        .filter((p) => String(p.id) !== String(pjesmaId))
        .sort((a, b) => (b.brojLajkova || 0) - (a.brojLajkova || 0))
        .slice(0, 6);
    },
    initialData: [],
  });

  const topPjesme = topPjesmeQ.data || [];


  useEffect(() => {
    const loadArtists = async () => {
      if (!topPjesme.length) return;

      try {
        const vezeRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
        const veze = vezeRes.data || [];

        const result: Record<number, Korisnik[]> = {};

        for (const song of topPjesme) {
          const songVeze = veze.filter(
            (v: IzvodjacPjesmaVeza) => v.pjesmaID === song.id
          );

          const artists = await Promise.all(
            songVeze.map((v: IzvodjacPjesmaVeza) =>
              axios
                .get(`${API_BASE}/korisnici/${v.izvodjacID}`)
                .then((r) => r.data)
                .catch(() => null)
            )
          );

          result[song.id] = artists.filter(Boolean);
        }

        setTopPjesmeIzvodjaci(result);
      } catch {
        setTopPjesmeIzvodjaci({});
      }
    };

    loadArtists();
  }, [topPjesme]);

  

  const komentariQ = useQuery<KomentariQuery>({
    queryKey: ["komentari", pjesmaId],
    enabled: Boolean(pjesmaId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/komentari/`);
      const svi: Komentar[] = r.data || [];
      const list = svi.filter((k) => String(k.pjesmaID) === String(pjesmaId));
      const korisnikIds = Array.from(new Set(list.map((k) => k.korisnikID)));
      const users: { [id: string]: Korisnik } = {};
      await Promise.all(
        korisnikIds.map((kid) => axios.get(`${API_BASE}/korisnici/${kid}`).then((x) => (users[kid] = x.data)).catch(() => {}))
      );
      return { list, users };
    },
    initialData: { list: [], users: {} },
  });

  
const likeMutation = useMutation({
  mutationFn: async () => {
    await axios.post(`${API_BASE}/korisnik_pjesma/`, {
      korisnikID: mojID,
      pjesmaID: pjesma.id,
      kreiranDatumVrijeme: new Date().toISOString(),
    });
  },
});

const unlikeMutation = useMutation({
  mutationFn: async () => {
    await axios.delete(
      `${API_BASE}/korisnik_pjesma/${mojID}/${pjesma.id}`
    );
  },
});



  const addCommentMut = useMutation({
    mutationFn: async (text: string) => {
      if (!mojID || !pjesmaId || !text.trim()) throw new Error("invalid");
      await axios.post(`${API_BASE}/komentari/`, { korisnikID: mojID, pjesmaID: Number(pjesmaId), tekst: text, vrijemePjesmeSekunde: 0, kreiranDatumVrijeme: new Date().toISOString() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["komentari", pjesmaId] });
      setNoviKomentar("");
    },
    onError: () => setKomentarError("Greška pri dodavanju komentara."),
  });

  const editCommentMut = useMutation({
    mutationFn: async (vars: { id: number; text: string }) => {
      await axios.put(`${API_BASE}/komentari/${vars.id}`, { tekst: vars.text });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["komentari", pjesmaId] });
      setEditKomentarId(null);
      setEditKomentarTekst("");
    },
    onError: () => setKomentarError("Greška pri uređivanju komentara."),
  });

  const handlePlay = useCallback((p: PjesmaType) => {
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
  }, []);

  const handleDodajKomentar = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setKomentarError(null);
    if (!mojID || !pjesmaId || !noviKomentar.trim()) {
      setKomentarError("Komentar ne smije biti prazan.");
      return;
    }
    addCommentMut.mutate(noviKomentar);
  }, [addCommentMut, mojID, pjesmaId, noviKomentar]);

  const handleUrediKomentar = useCallback((id: number) => {
    setKomentarError(null);
    if (!editKomentarTekst.trim()) {
      setKomentarError("Komentar ne smije biti prazan.");
      return;
    }
    editCommentMut.mutate({ id, text: editKomentarTekst });
  }, [editCommentMut, editKomentarTekst]);

  const komentariSortirani = useMemo(() => {
    const list = komentariQ.data.list || [];
    if (!mojID) return list;
    const vlasnikKomentar = list.find((k) => k.korisnikID === mojID);
    const ostali = list.filter((k) => k.korisnikID !== mojID);
    return vlasnikKomentar ? [vlasnikKomentar, ...ostali] : ostali;
  }, [komentariQ.data.list, mojID]);

  const loading = useMemo(() => pjesmaQ.isLoading || topPjesmeQ.isLoading || izvodjaciQ.isLoading || komentariQ.isLoading, [pjesmaQ.isLoading, topPjesmeQ.isLoading, izvodjaciQ.isLoading, komentariQ.isLoading]);

  if (loading) return <Loading />;

  if (!pjesmaQ.data)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>{t("song_not_found") || "Pjesma nije pronađena."}</h2>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>{t("back") || "Nazad"}</button>
        </div>
        <Footer />
      </div>
    );

const handleLajk = () => {
  if (!pjesma || !mojID) return;

  if (liked) {
    setLiked(false);
    setLikeCount((c) => Math.max(0, c - 1));
    unlikeMutation.mutate();
  } else {
    setLiked(true);
    setLikeCount((c) => c + 1);
    likeMutation.mutate();
  }
};

  const pjesma = pjesmaQ.data;
  const izvodjaci = izvodjaciQ.data || [];

  

  const korisniciKomentara = komentariQ.data.users || {};
  
  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.pjesmaBg}>
        <div className={styles.container}>
          <div className={styles.pjesmaMain}>
            <div className={styles.pjesmaSlikaWrap}>
              <img src={pjesma.putanjaSlika || "/logo.gif"} alt={pjesma.naziv} className={styles.pjesmaSlika} />
              <div className={styles.actionBtnsRow}>
                <button
                  className={`${styles.playBtn} ${styles.likeBtn} ${liked ? styles.liked : ""}`}
                  onClick={handleLajk}
                  title={liked ? t("remove") || "Ukloni lajk" : t("add_to_favorites") || "Lajkuj pjesmu"}
                  style={{ right: 18, left: "auto", background: liked ? "#f6b6d8ff" : "#b91d95" }}
                >
                  <svg width="40" height="40" viewBox="0 0 28 28" fill="#fff">
                    <path d="M14 25s-9-6.6-9-13.2C5 7.1 8.1 4 12 4c1.7 0 3.3.8 4.3 2.1C17.7 4.8 19.3 4 21 4c3.9 0 7 3.1 7 7.8C28 18.4 14 25 14 25z" />
                  </svg>
                  <span style={{ color: "#fff", fontWeight: 600, marginLeft: 6 }}>{likeCount}</span>
                </button>
                {pjesma.putanjaAudio && (
                  <button className={styles.playBtn} onClick={() => handlePlay(pjesma)} title={t("play_song")}>
                    <div className={styles.playBtnContent}>
                      <svg width="40" height="40" viewBox="0 0 44 44" fill="#fff">
                        <polygon points="12,8 36,22 12,36" />
                      </svg>
                      <span className={styles.playBtnDuration}>{formatTrajanje(pjesma.trajanjeSekunde)}</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
            <div className={styles.pjesmaInfo}>
              <h2 className={styles.pjesmaNaziv}>{pjesma.naziv}</h2>
              <div className={styles.pjesmaOpis}>{pjesma.opis}</div>

              <div className={styles.izvodjaciWrap}>
                <span className={styles.izvodjaciLabel}>{t("publisher") || "Izdavač"}:</span>
                {izdavacQ.data ? (
                  <span className={styles.izvodjacIme} style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/izvodjac/${izdavacQ.data?.id}`)}>
                    <img
                      src={izdavacQ.data.putanjaProfilneSlike || "/logo.gif"}
                      alt={izdavacQ.data.korisnicko_ime}
                      className={styles.izvodjacSlika}
                    />
                    {izdavacQ.data.korisnicko_ime}
                  </span>
                ) : (
                  <span className={styles.izvodjacIme}>{t("unknown") || "Nepoznato"}</span>
                )}
                <span className={styles.izvodjaciLabel} style={{ marginLeft: 18 }}>
                  {t("artists") || "Izvođači"}:
                </span>
                {izvodjaci.length === 0 ? (
                  <span className={styles.izvodjacIme}>{t("unknown") || "Nepoznato"}</span>
                ) : (
                  izvodjaci.map((izv) => (
                    <span key={izv.id} className={styles.izvodjacIme} style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/izvodjac/${izv.id}`)}>
                      <img src={izv.putanjaProfilneSlike || "/logo.gif"} alt={izv.korisnicko_ime} className={styles.izvodjacSlika} />
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
                    <img src={p.putanjaSlika || "/logo.gif"} alt={p.naziv} className={styles.topPjesmaSlika} />
                    {p.putanjaAudio && (
                      <button className={styles.topPlayBtn} onClick={() => handlePlay(p)} title={t("play_song")}>
                        <svg width="28" height="28" viewBox="0 0 44 44" fill="#fff">
                          <polygon points="12,8 36,22 12,36" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className={styles.topPjesmaNaziv} style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/pjesma/${p.id}`)}>{p.naziv}</div>
                  <div className={styles.topPjesmaIzvodjac}>
                    {(topPjesmeIzvodjaci[p.id] || []).map((izv, idx) => (
                      <span
                        key={izv.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/izvodjac/${izv.id}`)}
                      >
                        {izv.korisnicko_ime}
                        {idx < (topPjesmeIzvodjaci[p.id] || []).length - 1 ? ", " : ""}
                      </span>
                    ))}
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
                onChange={(e) => setNoviKomentar(e.target.value)}
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
                  resize: "vertical",
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
                    cursor: "pointer",
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
                      position: "relative",
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
                          border: k.korisnikID === mojID ? "2px solid #b91d95" : "none",
                        }}
                      />
                      <span
                        style={{
                          color: "#ffe6ec",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        onClick={() => navigate(`/izvodjac/${k.korisnikID}`)}
                      >
                        {korisniciKomentara[k.korisnikID]?.korisnicko_ime ||
                          t("user") ||
                          "Korisnik"}
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
                          onChange={(e) => setEditKomentarTekst(e.target.value)}
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
                            resize: "vertical",
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
                            cursor: "pointer",
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
                            cursor: "pointer",
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
                              cursor: "pointer",
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

export default memo(Pjesma);
