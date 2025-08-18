import React, { useMemo, memo, useState, useEffect } from "react";
// import styles from "./Statistika.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import type { Statistika } from "../../types";
import { Pjesma, Album, Playlista, Korisnik } from "../../types";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

type Styles = Record<string, string>;

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement);

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Statistika: React.FC = () => {
  const { t } = useTranslation();

  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./StatistikaWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Statistika.module.css");
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

  const pjesmeQ = useQuery<Pjesma[]>({
    queryKey: ["pjesme"],
    queryFn: async () => axios.get(`${API_BASE}/pjesme/`).then((r) => r.data || []),
    initialData: [],
  });
  const albumiQ = useQuery<Album[]>({
    queryKey: ["albumi"],
    queryFn: async () => axios.get(`${API_BASE}/albumi/`).then((r) => r.data || []),
    initialData: [],
  });
  const playlisteQ = useQuery<Playlista[]>({
    queryKey: ["playliste"],
    queryFn: async () => axios.get(`${API_BASE}/playliste/`).then((r) => r.data || []),
    initialData: [],
  });
  const korisniciQ = useQuery<Korisnik[]>({
    queryKey: ["korisnici"],
    queryFn: async () => axios.get(`${API_BASE}/korisnici/`).then((r) => r.data || []),
    initialData: [],
  });
  const statistikaQ = useQuery<Statistika[]>({
    queryKey: ["statistika"],
    queryFn: async () => axios.get(`${API_BASE}/statistika/`).then((r) => r.data || []),
    initialData: [],
  });

  const pjesme = useMemo(() => pjesmeQ.data || [], [pjesmeQ.data]);
  const albumi = useMemo(() => albumiQ.data || [], [albumiQ.data]);
  const playliste = useMemo(() => playlisteQ.data || [], [playlisteQ.data]);
  const korisnici = useMemo(() => korisniciQ.data || [], [korisniciQ.data]);
  const statistika = useMemo(() => statistikaQ.data || [], [statistikaQ.data]);

  const topPjesme = useMemo(
    () =>
      [...pjesme]
        .filter((p) => typeof p.brojLajkova === "number")
        .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
        .slice(0, 10),
    [pjesme]
  );
  const topAlbumi = useMemo(
    () =>
      [...albumi]
        .filter((a) => typeof a.brojLajkova === "number")
        .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
        .slice(0, 10),
    [albumi]
  );
  const topPlayliste = useMemo(
    () =>
      [...playliste]
        .filter((pl) => typeof pl.brojLajkova === "number")
        .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
        .slice(0, 10),
    [playliste]
  );

  const najpoznatijiIzvodjac = useMemo(
    () =>
      korisnici.reduce(
        (max, k) => (k.brojPratilaca || 0) > (max?.brojPratilaca || 0) ? k : max,
        korisnici[0]
      ),
    [korisnici]
  );
  const topIzvodjaci = useMemo(
    () => [...korisnici].sort((a, b) => (b.brojPratilaca || 0) - (a.brojPratilaca || 0)).slice(0, 10),
    [korisnici]
  );

  const zanrovi = useMemo(() => ["pop", "rock", "hip_hop", "jazz", "electronic", "klasicna", "metal", "alternativni", "rap"], []);
  const pjesmePoZanru = useMemo(
    () => zanrovi.map((z) => pjesme.filter((p) => (p.zanr || "").toLowerCase() === z).length),
    [pjesme, zanrovi]
  );

  const topSlusane = useMemo(() => {
    if ((statistika || []).length > 0) {
      return statistika
        .map((s) => ({
          pjesma: s.pjesma || pjesme.find((p) => p.id === s.pjesmaID),
          brojReprodukcija: s.brojReprodukcija || 0,
        }))
        .filter((s): s is { pjesma: Pjesma; brojReprodukcija: number } => !!s.pjesma)
        .sort((a, b) => (b.brojReprodukcija || 0) - (a.brojReprodukcija || 0))
        .slice(0, 10);
    }
    return [...pjesme]
      .filter((p) => typeof p.brojReprodukcija === "number")
      .sort((a, b) => (b.brojReprodukcija ?? 0) - (a.brojReprodukcija ?? 0))
      .slice(0, 10)
      .map((p) => ({ pjesma: p, brojReprodukcija: p.brojReprodukcija || 0 }));
  }, [statistika, pjesme]);

  const loading =
    pjesmeQ.isLoading ||
    albumiQ.isLoading ||
    playlisteQ.isLoading ||
    korisniciQ.isLoading ||
    statistikaQ.isLoading;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.statsBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("platform_statistics") || "Statistika platforme"}</h2>
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : (
            <>
              <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                  <h3>{t("top_10_songs_likes") || "Top 10 pjesama (lajkovi)"}</h3>
                  <Bar
                    data={{
                      labels: topPjesme.map((p) => p.naziv),
                      datasets: [
                        {
                          label: t("number_of_likes") || "Broj lajkova",
                          data: topPjesme.map((p) => p.brojLajkova),
                          backgroundColor: "#b91d95",
                        },
                      ],
                    }}
                    options={{ responsive: true, plugins: { legend: { display: false } } }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>{t("top_10_albums_likes") || "Top 10 albuma (lajkovi)"}</h3>
                  <Bar
                    data={{
                      labels: topAlbumi.map((a) => a.naziv),
                      datasets: [
                        {
                          label: t("number_of_likes") || "Broj lajkova",
                          data: topAlbumi.map((a) => a.brojLajkova),
                          backgroundColor: "#e754a2",
                        },
                      ],
                    }}
                    options={{ responsive: true, plugins: { legend: { display: false } } }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>{t("top_10_playlists_likes") || "Top 10 plejlista (lajkovi)"}</h3>
                  <Bar
                    data={{
                      labels: topPlayliste.map((pl) => pl.naziv),
                      datasets: [
                        {
                          label: t("number_of_likes") || "Broj lajkova",
                          data: topPlayliste.map((pl) => pl.brojLajkova),
                          backgroundColor: "#590846",
                        },
                      ],
                    }}
                    options={{ responsive: true, plugins: { legend: { display: false } } }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>{t("top_10_artists_followers") || "Top 10 izvođača (pratioci)"}</h3>
                  <Bar
                    data={{
                      labels: topIzvodjaci.map((k) => k.korisnicko_ime),
                      datasets: [
                        {
                          label: t("number_of_followers") || "Broj pratilaca",
                          data: topIzvodjaci.map((k) => k.brojPratilaca),
                          backgroundColor: "#ffe6ec",
                        },
                      ],
                    }}
                    options={{ responsive: true, plugins: { legend: { display: false } } }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>{t("songs_by_genre") || "Pjesme po žanru"}</h3>
                  <Pie
                    data={{
                      labels: zanrovi,
                      datasets: [
                        {
                          label: t("number_of_songs") || "Broj pjesama",
                          data: pjesmePoZanru,
                          backgroundColor: [
                            "#b91d95",
                            "#e754a2",
                            "#590846",
                            "#ffe6ec",
                            "#232323",
                            "#baffc9",
                            "#3a0d2e",
                            "#1e3a2e",
                            "#b3b3b3",
                          ],
                        },
                      ],
                    }}
                    options={{ responsive: true, plugins: { legend: { position: "bottom" } } }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>{t("top_10_most_played_songs") || "Top 10 najslušanijih pjesama"}</h3>
                  <Bar
                    data={{
                      labels: topSlusane.map((s) => s.pjesma?.naziv),
                      datasets: [
                        {
                          label: t("number_of_plays") || "Broj slušanja",
                          data: topSlusane.map((s) => s.brojReprodukcija),
                          backgroundColor: "#1e90ff",
                        },
                      ],
                    }}
                    options={{ responsive: true, plugins: { legend: { display: false } } }}
                  />
                </div>
              </div>
              <div className={styles.infoBox}>
                <h3>{t("most_popular_artist") || "Najpoznatiji izvođač"}</h3>
                {najpoznatijiIzvodjac ? (
                  <div className={styles.izvodjacCard}>
                    <img
                      src={najpoznatijiIzvodjac.putanjaProfilneSlike || "/logo.gif"}
                      alt={najpoznatijiIzvodjac.korisnicko_ime}
                      className={styles.izvodjacImg}
                    />
                    <div>
                      <div className={styles.izvodjacIme}>{najpoznatijiIzvodjac.korisnicko_ime}</div>
                      <div className={styles.izvodjacPratioci}>
                        {t("followers") || "Pratilaca"}: <b>{najpoznatijiIzvodjac.brojPratilaca}</b>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>{t("no_artists") || "Nema izvođača."}</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(Statistika);
