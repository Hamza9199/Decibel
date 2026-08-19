import React, { useMemo, useState, useCallback, memo, useEffect } from "react";
// import styles from "./Pretplata.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import Loading from "../../komponente/Loading/Loading";
import { useNavigate } from "react-router-dom";
import type { KorisnikPretplata, Pretplata } from "../../types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Pretplata: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./PretplataWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Pretplata.module.css");
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

  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  

  const korisnikPretplataQ = useQuery<KorisnikPretplata | null>({
    queryKey: ["korisnikPretplata", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/korisnik_pretplata/korisnik/${korisnikID}`
        );

        const pretplata: KorisnikPretplata | null = res.data ?? null;

        return pretplata;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }

        throw err;
      }
    },
  });
  

  const ponudeQ = useQuery<Pretplata[]>({
    queryKey: ["pretplatePonude"],
    enabled: korisnikPretplataQ.isFetched && !korisnikPretplataQ.data,
    queryFn: async () => axios.get(`${API_BASE}/pretplate/`).then((r) => (r.data || []).filter((p: Pretplata) => p.dostupno)),
    initialData: [],
  });

  useEffect(() => {
    if (korisnikPretplataQ.error || ponudeQ.error) setError("Greška pri dohvatu podataka.");
  }, [korisnikPretplataQ.error, ponudeQ.error]);

  const cancelMut = useMutation({
    mutationFn: async () => {
      const kp = korisnikPretplataQ.data as KorisnikPretplata | null;
      const id = kp?.id;
      if (!id) throw new Error("no-sub");

      await axios.delete(
        `${API_BASE}/korisnik_pretplata/${id}`
      );
    },

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["korisnikPretplata", korisnikID],
      });

      await qc.invalidateQueries({
        queryKey: ["pretplatePonude"],
      });

      await korisnikPretplataQ.refetch();
      await ponudeQ.refetch();
    },

    onError: () =>
      setError("Greška pri otkazivanju pretplate."),
  });

  const freeTrialMut = useMutation({
    mutationFn: async (pretplataId: number) => {
      if (!korisnikID) throw new Error("no-user");
      await axios.post(
        `${API_BASE}/korisnik_pretplata/free/${korisnikID}/${pretplataId}`
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["korisnikPretplata", korisnikID],
      });
      await qc.invalidateQueries({
        queryKey: ["pretplatePonude"],
      });
      await korisnikPretplataQ.refetch();
      await ponudeQ.refetch();
    },
    onError: (err: unknown) => {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const msg = axiosError.response?.data?.detail || "Greška pri aktivaciji besplatne pretplate.";
      setError(msg);
    },
  });

  const handleOtkaziPretplatu = useCallback(() => {
    if (!korisnikPretplataQ.data) return;
    if (!window.confirm("Jeste li sigurni da želite otkazati pretplatu?")) return;
    cancelMut.mutate();
  }, [cancelMut, korisnikPretplataQ.data]);

  const handleObnoviPretplatu = useCallback(() => {
    const pid = korisnikPretplataQ.data?.pretplataID;
    if (!pid) return;
    navigate(`/nova-pretplata/${pid}`);
  }, [korisnikPretplataQ.data, navigate]);

  const loading = useMemo(() => {
    if (!korisnikID) return false;
    return korisnikPretplataQ.isLoading || ponudeQ.isLoading;
  }, [korisnikID, korisnikPretplataQ.isLoading, ponudeQ.isLoading]);

  const displayError = useMemo(() => (!korisnikID ? "Morate biti prijavljeni." : error), [korisnikID, error]);

  const korisnikPretplata = korisnikPretplataQ.data as KorisnikPretplata | null;

  const status = korisnikPretplata?.pretplataStatus;
  const aktivna = status === "aktivna";
  const pauzirana = status === "pauzirana";
  const istekla = status === "istekla";
  const neaktivna = status === "neaktivna";
  const ponude = (ponudeQ.data as Pretplata[]) || [];

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.pretplataBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("subscription")}</h2>
          {loading ? (
            <Loading />
          ) : displayError ? (
            <div className={styles.error}>{displayError}</div>
          ) : korisnikPretplata ? (
              <div className={styles.infoBox}>
                <div className={styles.status}>
                  {t("status") || "Status"}: <b>{korisnikPretplata.pretplataStatus}</b>
                </div>

                <div className={styles.naziv}>
                  {t("package") || "Paket"}:{" "}
                  <b>{korisnikPretplata.pretplata?.naziv || t("no_data")}</b>
                </div>

                <div className={styles.opis}>
                  {korisnikPretplata.pretplata?.opis}
                </div>

                <div className={styles.cijena}>
                  {t("price") || "Cijena"}:{" "}
                  <b>{korisnikPretplata.pretplata?.cijena} KM / mj</b>
                </div>

                {korisnikPretplata.datumIsteka && (
                  <div className={styles.istice}>
                    {t("expires") || "Ističe"}:{" "}
                    <b>
                      {new Date(
                        korisnikPretplata.datumIsteka
                      ).toLocaleDateString()}{" "}
                      (
                      {new Date(
                        korisnikPretplata.datumIsteka
                      ).toLocaleTimeString()}
                      )
                    </b>
                  </div>
                )}

                {aktivna && (
                  <div className={styles.success}>
                    {t("active_subscription") ||
                      "Imate aktivnu pretplatu."}
                  </div>
                )}

                {pauzirana && (
                  <div className={styles.warning}>
                    {t("paused_subscription") ||
                      "Vaša pretplata je već pauzirana. Možete kupiti novu ili obnoviti postojeću."}
                  </div>
                )}

                {istekla && (
                  <div className={styles.warning}>
                    {t("expired_subscription") ||
                      "Vaša pretplata je istekla. Možete je obnoviti."}
                  </div>
                )}

                {neaktivna && (
                  <div className={styles.warning}>
                    {t("inactive_subscription") ||
                      "Vaša pretplata nije aktivna. Možete je obnoviti."}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 16,
                    justifyContent: "center",
                  }}
                >
                  {aktivna && (
                    <>
                

                      <button
                        className={styles.kupiBtn}
                        style={{
                          background: "#232323",
                          color: "#ffe6ec",
                          border: "1px solid #b91d95",
                        }}
                        onClick={handleOtkaziPretplatu}
                        disabled={cancelMut.isPending}
                      >
                        {t("cancel_subscription") || "Otkaži pretplatu"}
                      </button>
                    </>
                  )}

                  {(istekla || neaktivna) && (
                    <button
                      className={styles.kupiBtn}
                      style={{ background: "#e754a2" }}
                      onClick={handleObnoviPretplatu}
                    >
                      {t("renew_subscription") || "Obnovi pretplatu"}
                    </button>
                  )}

                  {pauzirana && (
                    <button
                      className={styles.kupiBtn}
                      style={{ background: "#e754a2" }}
                      onClick={handleObnoviPretplatu}
                    >
                      {t("buy_or_renew_subscription") || "Kupi ili obnovi pretplatu"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <div className={styles.noSub}>
              <div className={styles.warning}>{t("no_active_subscription") || "Nemate aktivnu pretplatu. Kupite jednu od ponuđenih pretplata:"}</div>
              {ponude.length > 0 && (
                <div className={styles.freeTrialInfo} style={{ marginBottom: 16, padding: 12, background: "#1a3a1a", borderRadius: 8, border: "1px solid #2ecc40" }}>
                  <div style={{ color: "#2ecc40", fontWeight: 600, marginBottom: 8 }}>
                    {t("free_trial_offer") || "🎁 Pokušajte besplatno 3 mjeseca!"}
                  </div>
                  <div style={{ color: "#b3b3b3", fontSize: "0.9rem", marginBottom: 12 }}>
                    {t("free_trial_description") || "Kao novi korisnik, možete dobiti 3 mjeseca besplatne pretplate. Odaberite paket ispod i kliknite na 'Besplatno 3 mjeseca'."}
                  </div>
                  <button 
                    className={styles.kupiBtn} 
                    onClick={() => freeTrialMut.mutate(ponude[0].id)} 
                    disabled={freeTrialMut.isPending}
                    style={{ 
                      background: "#2ecc40", 
                      border: "none",
                      color: "#fff",
                      width: "100%"
                    }}
                  >
                    {freeTrialMut.isPending ? (t("activating") || "Aktiviram...") : (t("free_trial_3_months") || "Besplatno 3 mjeseca")}
                  </button>
                </div>
              )}
              <div className={styles.ponudeGrid}>
                {ponude.length === 0 ? (
                  <div className={styles.error}>{t("no_available_subscriptions") || "Nema dostupnih pretplata."}</div>
                ) : (
                  ponude.map((p: Pretplata) => (
                    <div key={p.id} className={styles.ponudaCard}>
                      <div className={styles.ponudaNaziv}>{p.naziv}</div>
                      <div className={styles.ponudaOpis}>{p.opis}</div>
                      <div className={styles.ponudaCijena}>{p.cijena} KM / mj</div>
                      <button className={styles.kupiBtn} onClick={() => navigate(`/nova-pretplata/${p.id}`)} disabled={cancelMut.isPending} style={{ width: "100%" }}>
                        {t("buy_subscription")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(Pretplata);


