import React, { useState, useEffect } from "react";
import styles from "./NovaPjesma.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Footer from "../../komponente/Footer/Footer";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { Album, Korisnik } from "../../types";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NovaPjesma: React.FC = () => {
  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [datumObjave, setDatumObjave] = useState("");
  const [trajanjeSekunde, setTrajanjeSekunde] = useState<number>(0);
  const [zanr, setZanr] = useState("pop");
  const [audio, setAudio] = useState<File | null>(null);
  const [slika, setSlika] = useState<File | null>(null);
  const [gif, setGif] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [albumID, setAlbumID] = useState<number | "">("");
  const [sviIzvodjaci, setSviIzvodjaci] = useState<Korisnik[]>([]);
  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const korisnik = JSON.parse(localStorage.getItem("korisnik") || "{}");

  useEffect(() => {
    if (!korisnik?.id) return;
    axios
      .get(`${API_BASE}/albumi/`)
      .then((res) => {
        setAlbumi((res.data || []).filter((a: Album) => a.korisnikID === korisnik.id));
      })
      .catch(() => setAlbumi([]));
  }, [korisnik?.id]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/korisnici/`)
      .then((res) => setSviIzvodjaci(res.data || []))
      .catch(() => setSviIzvodjaci([]));
  }, [korisnik?.id]);

  useEffect(() => {
    if (!korisnik?.id) return;
    setIzabraniIzvodjaci((prev) => {
      if (prev.find((k) => k.id === korisnik.id)) return prev;
      const userObj = sviIzvodjaci.find((k) => k.id === korisnik.id) || korisnik;
      return [userObj, ...prev];
    });
    // eslint-disable-next-line
  }, [korisnik?.id, sviIzvodjaci]);

  const handleAddIzvodjac = (korisnik: Korisnik) => {
    if (!izabraniIzvodjaci.find((k) => k.id === korisnik.id)) {
      setIzabraniIzvodjaci((prev) => [...prev, korisnik]);
    }
  };
  const handleRemoveIzvodjac = (korisnikId: string) => {
    setIzabraniIzvodjaci((prev) => prev.filter((k) => k.id !== korisnikId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("korisnikID", korisnik.id);
      formData.append("naziv", naziv);
      formData.append("opis", opis);
      formData.append("datumObjave", datumObjave);
      formData.append("trajanjeSekunde", trajanjeSekunde.toString());
      formData.append("zanr", zanr);
      if (albumID) formData.append("albumID", String(albumID));
      if (audio) formData.append("file_audio", audio);
      if (slika) formData.append("file_slika", slika);
      if (gif) formData.append("file_gif", gif);

      const res = await axios.post<{ id: number }>(`${API_BASE}/pjesme/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const pjesmaId = res.data.id;

      const uniqueIzvodjaci = izabraniIzvodjaci.filter(
        (izv, idx, arr) => arr.findIndex(x => x.id === izv.id) === idx
      );
      for (const izvodjac of uniqueIzvodjaci) {
        await axios.post(`${API_BASE}/izvodjac_pjesma/`, {
          izvodjacID: izvodjac.id,
          pjesmaID: pjesmaId,
          potvrdjeno: izvodjac.id === korisnik.id, 
        }).catch(() => {}); 
      }

      setSuccess("Pjesma je uspješno dodana!");
      setLoading(false);
      setTimeout(() => navigate("/"), 1200);
    } catch {
      setError("Greška pri dodavanju pjesme.");
      setLoading(false);
    }
  };

  return (
    <>
      <Header/>
      <Sidebar/>
      {loading && <Loading/>}
      <div className={styles.novaPjesmaBg}>
        <div className={styles.formContainer}>
          <form className={styles.novaPjesmaForm} onSubmit={handleSubmit} style={{ minWidth: 340 }}>
            <h2 className={styles.title}>{t("add_new_song") || "Dodaj novu pjesmu"}</h2>
            <label className={styles.label}>{t("song_name") || "Naziv Pjesme"}</label>
          <input
            type="text"
            placeholder={t("song_name") || "Naziv pjesme"}
            className={styles.input}
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            required
          />
          <label className={styles.label}>{t("description")}</label>
          <textarea
            placeholder={t("description")}
            className={styles.input}
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            rows={3}
          />
            <label className={styles.label}>{t("release_date") || "Datum objave"}</label>
          <input
            type="date"
            placeholder={t("release_date") || "Datum objave"}
            className={styles.input}
            value={datumObjave}
            onChange={(e) => setDatumObjave(e.target.value)}
            required
          />
            <label className={styles.label}>{t("duration_seconds") || "Trajanje (sekunde)"}</label>
          <input
            type="number"
            placeholder={t("duration_seconds") || "Trajanje (sekunde)"}
            className={styles.input}
            value={trajanjeSekunde}
            onChange={(e) => setTrajanjeSekunde(Number(e.target.value))}
            min={1}
            required
          />
            <label className={styles.label}>{t("genre") || "Zanr"}</label>
          <select
            className={styles.input}
            value={zanr}
            onChange={(e) => setZanr(e.target.value)}
            required
          >
            <option value="pop">{t("genre_pop") || "Pop"}</option>
            <option value="rock">{t("genre_rock") || "Rock"}</option>
            <option value="hip_hop">{t("genre_hip_hop") || "Hip Hop"}</option>
            <option value="jazz">{t("genre_jazz") || "Jazz"}</option>
            <option value="electronic">{t("genre_electronic") || "Electronic"}</option>
            <option value="klasicna">{t("genre_classical") || "Klasična"}</option>
            <option value="metal">{t("genre_metal") || "Metal"}</option>
            <option value="alternativni">{t("genre_alternative") || "Alternativni"}</option>
            <option value="rap">{t("genre_rap") || "Rap"}</option>
          </select>
          <label className={styles.label}>{t("album_optional") || "Album (opcionalno)"}</label>
          <select
            className={styles.input}
            value={albumID}
            onChange={e => setAlbumID(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">{t("no_album") || "Bez albuma"}</option>
            {albumi.map((a) => (
              <option key={a.id} value={a.id}>{a.naziv}</option>
            ))}
          </select>
          <label className={styles.label}>{t("audio_file") || "Audio fajl"}:
            <input
              type="file"
              accept="audio/*"
              className={styles.fileInput}
              onChange={(e) => setAudio(e.target.files?.[0] || null)}
              required
            />
          </label>
          <label className={styles.label}>{t("image") || "Slika"}:
            <input
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={(e) => setSlika(e.target.files?.[0] || null)}
            />
          </label>
          <label className={styles.label}>GIF:
            <input
              type="file"
              accept="image/gif"
              className={styles.fileInput}
              onChange={(e) => setGif(e.target.files?.[0] || null)}
            />
          </label>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <button className={styles.button} type="submit">
            {t("add_song") || "Dodaj pjesmu"}
          </button>
        </form>
        
        <div className={styles.artistsSection}>
          <h4 className={styles.artistsTitle}>{t("song_artists") || "Izvođači na pjesmi"}</h4>
          <input
            type="text"
            placeholder={t("search_artists") || "Pretraži izvođače..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.artistSearch}
          />
          <div className={styles.selectedArtists}>
            {izabraniIzvodjaci.map((k) => (
              <span key={k.id} className={styles.artistTag}>
                {k.korisnicko_ime}
                <button
                  className={styles.removeArtistBtn}
                  onClick={() => handleRemoveIzvodjac(k.id)}
                  title={k.id === korisnik.id ? t("remove_self_artist") || "Ukloni sebe kao izvođača" : t("remove_artist") || "Ukloni izvođača"}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
            <div className={styles.artistNote}>
              {t("can_remove_self_artist") || "Možete ukloniti i sebe kao izvođača."}
            </div>
          </div>
          <ul className={styles.availableArtists}>
            {sviIzvodjaci
              .filter((k) =>
                k.korisnicko_ime.toLowerCase().includes(search.toLowerCase()) &&
                !izabraniIzvodjaci.find((iz) => iz.id === k.id)
              )
              .slice(0, 8)
              .map((k) => (
                <li key={k.id} className={styles.artistItem}>
                  <button
                    className={styles.addArtistBtn}
                    type="button"
                    onClick={() => handleAddIzvodjac(k)}
                  >
                    {k.korisnicko_ime}
                  </button>
                </li>
              ))}
          </ul>
        </div>
        </div>
      </div>
      <Footer/>
    </>
  );
};

export default NovaPjesma;
