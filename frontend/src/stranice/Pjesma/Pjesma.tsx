import React, { useEffect, useState } from "react";
import styles from "./Pjesma.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import type { Pjesma, Korisnik, Komentar } from "../../types";
import Loading from "../../komponente/Loading/Loading";

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
  const navigate = useNavigate();

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

    // Dohvati pjesmu
    axios
      .get(`${API_BASE}/pjesme/${pjesmaId}`)
      .then((res) => {
        if (!isMounted) return;
        setPjesma(res.data);
        // Dohvati izvođače za pjesmu
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

    // Dohvati top pjesme za reklamu
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
  }, [pjesmaId]);

  useEffect(() => {
    if (!pjesmaId) return;
    // Dohvati komentare za pjesmu
    axios
      .get(`${API_BASE}/komentari/`)
      .then(async (res) => {
        const svi: Komentar[] = res.data || [];
        const zaPjesmu = svi.filter((k) => String(k.pjesmaID) === String(pjesmaId));
        setKomentari(zaPjesmu);

        // Dohvati korisnike za komentare
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

  // Dodaj komentar
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
      // Osvježi komentare
      const res = await axios.get(`${API_BASE}/komentari/`);
      const svi: Komentar[] = res.data || [];
      setKomentari(svi.filter((k) => String(k.pjesmaID) === String(pjesmaId)));
    } catch {
      setKomentarError("Greška pri dodavanju komentara.");
    }
  };

  // Uredi komentar
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
      // Osvježi komentare
      const res = await axios.get(`${API_BASE}/komentari/`);
      const svi: Komentar[] = res.data || [];
      setKomentari(svi.filter((k) => String(k.pjesmaID) === String(pjesmaId)));
    } catch {
      setKomentarError("Greška pri uređivanju komentara.");
    }
  };

  // Prikaz komentara: vlasnikov komentar uvijek prvi
  const komentariSortirani = (() => {
    if (!mojID) return komentari;
    const vlasnikKomentar = komentari.find((k) => k.korisnikID === mojID);
    const ostali = komentari.filter((k) => k.korisnikID !== mojID);
    return vlasnikKomentar ? [vlasnikKomentar, ...ostali] : ostali;
  })();

  if (loading) return <Loading />;

  if (!pjesma)
    return (
      <div className={styles.notFound}>
        <Header />
        <Sidebar />
        <div className={styles.container}>
          <h2>Pjesma nije pronađena.</h2>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            Nazad
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
              {pjesma.putanjaAudio && (
                <button
                  className={styles.playBtn}
                  onClick={() => handlePlay(pjesma)}
                  title="Pusti pjesmu"
                >
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="#fff">
                    <polygon points="12,8 36,22 12,36" />
                  </svg>
                </button>
              )}
            </div>
            <div className={styles.pjesmaInfo}>
              <h2 className={styles.pjesmaNaziv}>{pjesma.naziv}</h2>
              <div className={styles.pjesmaOpis}>{pjesma.opis}</div>
              <div className={styles.pjesmaMeta}>
                <span>
                  Trajanje: <b>{formatTrajanje(pjesma.trajanjeSekunde)}</b>
                </span>
                <span>
                  Žanr: <b>{pjesma.zanr}</b>
                </span>
                <span>
                  Lajkova: <b>{pjesma.brojLajkova}</b>
                </span>
                <span>
                  Jezik: <b>{pjesma.jezikPjesme || "Nepoznato"}</b>
                </span>
              </div>
              <div className={styles.izvodjaciWrap}>
                <span className={styles.izvodjaciLabel}>Izvođači:</span>
                {izvodjaci.length === 0 ? (
                  <span className={styles.izvodjacIme}>Nepoznato</span>
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
            <h3 className={styles.topPjesmeTitle}>Preporučene pjesme</h3>
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
                        title="Pusti pjesmu"
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
          {/* Komentari sekcija */}
          <div style={{ marginTop: 60 }}>
            <h3 className={styles.topPjesmeTitle}>Komentari</h3>
            <form onSubmit={handleDodajKomentar} style={{ marginBottom: 24 }}>
              <textarea
                value={noviKomentar}
                onChange={e => setNoviKomentar(e.target.value)}
                placeholder="Dodaj komentar..."
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
                Dodaj komentar
              </button>
              </div>
            </form>
            <div>
              {komentariSortirani.length === 0 ? (
                <div style={{ color: "#b3b3b3" }}>Nema komentara.</div>
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
                        {korisniciKomentara[k.korisnikID]?.korisnicko_ime || "Korisnik"}
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
                          Sačuvaj
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
                          Odustani
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
                            Uredi
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
