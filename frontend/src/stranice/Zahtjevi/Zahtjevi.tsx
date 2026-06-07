import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Footer from "../../komponente/Footer/Footer";
import Loading from "../../komponente/Loading/Loading";
import axios from "axios";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { IzvodjacPjesmaVeza, Pjesma } from "../../types";

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const Zahtjevi: React.FC = () => {
  const { t } = useTranslation();
  const [styles, setStyles] = useState<Styles>({});
  const [localVeze, setLocalVeze] = useState<IzvodjacPjesmaVeza[]>([]);

  const korisnikID = useMemo(() => {
     try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      const tema =
        localStorage.getItem("decibel_tema") || "dark";

      if (tema === "dark") {
        const mod = await import("./Zahtjevi.module.css");
        setStyles(mod.default);
      } else {
        const mod = await import("./ZahtjeviWhite.module.css");
        setStyles(mod.default);
      }
    };

    loadTheme();
  }, []);

  const vezeQ = useQuery({
    queryKey: ["zahtjevi", korisnikID],
    enabled: Boolean(korisnikID), 
    queryFn: async () =>
        axios
        .get(`${API_BASE}/izvodjac_pjesma/izvodjac/${korisnikID}`)
        .then(r => r.data || []),
    });

 

  useEffect(() => {
    setLocalVeze(vezeQ.data || []);
  }, [vezeQ.data]);

  const prihvatiMut = useMutation({
    mutationFn: async (pjesmaID: number) =>
      axios.patch(
        `${API_BASE}/izvodjac_pjesma/${korisnikID}/${pjesmaID}?potvrdjeno=true`
      ),
  });

  const odbijMut = useMutation({
    mutationFn: async (pjesmaID: number) =>
      axios.delete(
        `${API_BASE}/izvodjac_pjesma/${korisnikID}/${pjesmaID}`
      ),
  });

  const zahtjevi = useMemo(
    () =>
      localVeze.filter(
        v =>
          v.izvodjacID === korisnikID &&
          !v.potvrdjeno
      ),
    [localVeze, korisnikID]
  );

  const prihvaceni = useMemo(
    () =>
      localVeze.filter(
        v =>
          v.izvodjacID === korisnikID &&
          v.potvrdjeno
      ),
    [localVeze, korisnikID]
  );

  const handlePlay = useCallback((song?: Pjesma) => {
    if (!song) return;
    window.dispatchEvent(
      new CustomEvent("globalAudioPlay", {
        detail: {
          id: song.id,
          src: song.putanjaAudio,
          title: song.naziv,
          putanjaGif: song.putanjaGif,
          putanjaSlika: song.putanjaSlika,
          korisnikID: song.korisnikID,
        },
      })
    );
  }, []);

  

  if (vezeQ.isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Header />
      <Sidebar />

      <div className={styles.zahtjeviBg}>
        <div className={styles.containerZahtjevi}>

          <h2 className={styles.title}>
            {t("requests_collaboration")}
          </h2>

          {zahtjevi.length === 0 ? (
            <div className={styles.noSongs}>
              {t("no_new_requests")}
            </div>
          ) : (
            <table className={styles.pjesmeTable}>
              <thead>
                <tr>
                  <th>{t("song") || "Pjesma"}</th>
                  <th>{t("play") || "Play"}</th>
                  <th>{t("actions") || "Akcije"}</th>
                </tr>
              </thead>

              <tbody>
                {zahtjevi.map(v => {
                  return (
                    <tr key={`${v.izvodjacID}-${v.pjesmaID}`}>
                      <td>
                        <Link
                          to={`/pjesma/${v.pjesma?.id}`}
                          className={styles.link}
                        >
                          {v.pjesma?.naziv}
                        </Link>
                      </td>
                      <td>
                        <button
                          className={styles.playlistBtn}
                          onClick={() => handlePlay(v.pjesma)}
                        >
                          {t("play")}
                        </button>
                      </td>

                      <td>
                        <button
                          className={styles.playlistBtn}
                          onClick={() => {
                            setLocalVeze(prev =>
                              prev.map(x =>
                                x.pjesmaID === v.pjesmaID &&
                                x.izvodjacID === korisnikID
                                  ? {
                                      ...x,
                                      potvrdjeno: true,
                                    }
                                  : x
                              )
                            );

                            prihvatiMut.mutate(v.pjesmaID);
                          }}
                        >
                          {t("accept")}
                        </button>

                        <button
                          className={styles.closeModalBtn}
                          onClick={() => {
                            setLocalVeze(prev =>
                              prev.filter(
                                x =>
                                  !(
                                    x.pjesmaID === v.pjesmaID &&
                                    x.izvodjacID === korisnikID
                                  )
                              )
                            );

                            odbijMut.mutate(v.pjesmaID);
                          }}
                        >
                          {t("reject")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <h2
            className={styles.title}
            style={{ marginTop: 50 }}
          >
            {t("accepted_collaborations")}
          </h2>

          {prihvaceni.length === 0 ? (
            <div className={styles.noSongs}>
              {t("no_accepted_songs")}
            </div>
          ) : (
            <table className={styles.pjesmeTable}>
              <thead>
                <tr>
                  <th>{t("song") || "Pjesma"}</th>
                  <th>{t("play") || "Play"}</th>
                </tr>
              </thead>

              <tbody>
                    {prihvaceni.map(v => {
                      const song = v.pjesma;
                      return (
                        <tr key={`${v.izvodjacID}-${v.pjesmaID}`}>
                          <td>
                            <Link
                              to={`/pjesma/${song?.id}`}
                              className={styles.link}
                            >
                              {song?.naziv}
                            </Link>
                          </td>
                          <td>
                            <button
                              className={styles.playlistBtn}
                              onClick={() => handlePlay(song)}
                            >
                              {t("play")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
            </table>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
};

export default Zahtjevi;