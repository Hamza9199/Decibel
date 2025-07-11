import React, { useEffect, useState } from "react";
import styles from "./Statistika.module.css";
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

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement);

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Statistika: React.FC = () => {
  const [pjesme, setPjesme] = useState<Pjesma[]>([]);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [playliste, setPlayliste] = useState<Playlista[]>([]);
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [statistika, setStatistika] = useState<Statistika[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/pjesme/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/albumi/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/playliste/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/korisnici/`).then((res) => res.data).catch(() => []),
      axios.get(`${API_BASE}/statistika/`).then((res) => res.data).catch(() => []),
    ]).then(([pjesmeData, albumiData, playlisteData, korisniciData, statistikaData]) => {
      setPjesme(pjesmeData);
      setAlbumi(albumiData);
      setPlayliste(playlisteData);
      setKorisnici(korisniciData);
      setStatistika(statistikaData);
      setLoading(false);
    });
  }, []);

  // Top 10 najlajkovanijih pjesama
  const topPjesme = [...pjesme]
    .filter(p => typeof p.brojLajkova === "number")
    .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
    .slice(0, 10);

  // Top 10 najlajkovanijih albuma
  const topAlbumi = [...albumi]
    .filter(a => typeof a.brojLajkova === "number")
    .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
    .slice(0, 10);

  // Top 10 najlajkovanijih plejlista
  const topPlayliste = [...playliste]
    .filter(pl => typeof pl.brojLajkova === "number")
    .sort((a, b) => (b.brojLajkova ?? 0) - (a.brojLajkova ?? 0))
    .slice(0, 10);

  // Najpoznatiji izvođač (najviše pratilaca)
  const najpoznatijiIzvodjac = korisnici.reduce((max, k) =>
    (k.brojPratilaca || 0) > (max?.brojPratilaca || 0) ? k : max, korisnici[0]
  );

  // Top 10 izvođača po broju pratilaca
  const topIzvodjaci = [...korisnici]
    .sort((a, b) => (b.brojPratilaca || 0) - (a.brojPratilaca || 0))
    .slice(0, 10);

  // Broj pjesama po žanru
  const zanrovi = [
    "pop", "rock", "hip_hop", "jazz", "electronic", "klasicna", "metal", "alternativni", "rap"
  ];
  const pjesmePoZanru = zanrovi.map(z =>
    pjesme.filter(p => (p.zanr || "").toLowerCase() === z).length
  );

  // Pie chart: omjer javnih i privatnih pjesama
  const javne = pjesme.filter(p => p.javno).length;
  const privatne = pjesme.length - javne;

  // Top 10 najslušanijih pjesama (po broju reprodukcija)
  // Ako statistika nema podatke, koristi brojReprodukcija iz pjesme
  let topSlusane: { pjesma: Pjesma; brojReprodukcija: number }[] = [];

  if (statistika.length > 0) {
    // Ako backend vraća statistiku sa pjesma objektom
    topSlusane = statistika
      .map((s: Statistika) => ({
        pjesma: s.pjesma || pjesme.find((p) => p.id === s.pjesmaID),
        brojReprodukcija: s.brojReprodukcija || 0,
      }))
      .filter((s): s is { pjesma: Pjesma; brojReprodukcija: number } => !!s.pjesma)
      .sort((a, b) => (b.brojReprodukcija || 0) - (a.brojReprodukcija || 0))
      .slice(0, 10);
  } else {
    // Ako nema statistike, koristi brojReprodukcija iz pjesme
    topSlusane = [...pjesme]
      .filter((p) => typeof p.brojReprodukcija === "number")
      .sort((a, b) => (b.brojReprodukcija ?? 0) - (a.brojReprodukcija ?? 0))
      .slice(0, 10)
      .map((p) => ({ pjesma: p, brojReprodukcija: p.brojReprodukcija || 0 }));
  }

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.statsBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Statistika platforme</h2>
          {loading ? (
            <div className={styles.loading}>Učitavanje...</div>
          ) : (
            <>
              <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                  <h3>Top 10 pjesama (lajkovi)</h3>
                  <Bar
                    data={{
                      labels: topPjesme.map(p => p.naziv),
                      datasets: [
                        {
                          label: "Broj lajkova",
                          data: topPjesme.map(p => p.brojLajkova),
                          backgroundColor: "#b91d95",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>Top 10 albuma (lajkovi)</h3>
                  <Bar
                    data={{
                      labels: topAlbumi.map(a => a.naziv),
                      datasets: [
                        {
                          label: "Broj lajkova",
                          data: topAlbumi.map(a => a.brojLajkova),
                          backgroundColor: "#e754a2",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>Top 10 plejlista (lajkovi)</h3>
                  <Bar
                    data={{
                      labels: topPlayliste.map(pl => pl.naziv),
                      datasets: [
                        {
                          label: "Broj lajkova",
                          data: topPlayliste.map(pl => pl.brojLajkova),
                          backgroundColor: "#590846",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>Top 10 izvođača (pratioci)</h3>
                  <Bar
                    data={{
                      labels: topIzvodjaci.map(k => k.korisnicko_ime),
                      datasets: [
                        {
                          label: "Broj pratilaca",
                          data: topIzvodjaci.map(k => k.brojPratilaca),
                          backgroundColor: "#ffe6ec",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>Pjesme po žanru</h3>
                  <Pie
                    data={{
                      labels: zanrovi,
                      datasets: [
                        {
                          label: "Broj pjesama",
                          data: pjesmePoZanru,
                          backgroundColor: [
                            "#b91d95", "#e754a2", "#590846", "#ffe6ec",
                            "#232323", "#baffc9", "#3a0d2e", "#1e3a2e", "#b3b3b3"
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>Javne vs privatne pjesme</h3>
                  <Pie
                    data={{
                      labels: ["Javne", "Privatne"],
                      datasets: [
                        {
                          label: "Broj pjesama",
                          data: [javne, privatne],
                          backgroundColor: ["#b91d95", "#232323"],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                </div>
                <div className={styles.chartCard}>
                  <h3>Top 10 najslušanijih pjesama</h3>
                  <Bar
                    data={{
                      labels: topSlusane.map((s) => s.pjesma?.naziv),
                      datasets: [
                        {
                          label: "Broj slušanja",
                          data: topSlusane.map((s) => s.brojReprodukcija),
                          backgroundColor: "#1e90ff",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
              </div>
              <div className={styles.infoBox}>
                <h3>Najpoznatiji izvođač</h3>
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
                        Pratilaca: <b>{najpoznatijiIzvodjac.brojPratilaca}</b>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>Nema izvođača.</div>
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

export default Statistika;
