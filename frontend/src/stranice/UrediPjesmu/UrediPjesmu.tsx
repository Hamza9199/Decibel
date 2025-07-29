import React, { useEffect, useState } from "react";
import styles from "./UrediPjesmu.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Pjesma, Album, Korisnik, IzvodjacPjesmaVeza } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediPjesmu: React.FC = () => {
  const { pjesmaId } = useParams<{ pjesmaId: string }>();
  const [pjesma, setPjesma] = useState<Pjesma | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  let korisnikID: string | undefined = undefined;
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id;
  } catch {
    korisnikID = undefined;
  }

  const [albumi, setAlbumi] = useState<Album[]>([]);
  const [albumID, setAlbumID] = useState<number | "">("");
  const [sviIzvodjaci, setSviIzvodjaci] = useState<Korisnik[]>([]);
  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!pjesmaId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/pjesme/${pjesmaId}`)
      .then((res) => setPjesma(res.data))
      .catch(() => setError("Greška pri dohvatanju pjesme."))
      .finally(() => setLoading(false));
  }, [pjesmaId]);

  useEffect(() => {
    if (korisnikID) {
      axios
        .get(`${API_BASE}/albumi/`)
        .then((res) => {
          setAlbumi((res.data || []).filter((a: Album) => a.korisnikID === korisnikID));
        })
        .catch(() => setAlbumi([]));
    }
  }, [korisnikID]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/korisnici/`)
      .then((res) => setSviIzvodjaci(res.data || []))
      .catch(() => setSviIzvodjaci([]));
  }, []);

 

  useEffect(() => {
    if (!pjesma?.id) return;
    axios
      .get(`${API_BASE}/izvodjac_pjesma/`)
      .then((res) => {
        const veze: IzvodjacPjesmaVeza[] = res.data || [];
        const izvodjaciIds = veze
          .filter((v) => v.pjesmaID === pjesma.id)
          .map((v) => v.izvodjacID);
        setIzabraniIzvodjaci(
          sviIzvodjaci.filter((k) => izvodjaciIds.includes(k.id))
        );
      })
      .catch(() => setIzabraniIzvodjaci([]));
  }, [pjesma?.id, sviIzvodjaci]);

  const handleAddIzvodjac = (korisnik: Korisnik) => {
    if (!izabraniIzvodjaci.find((k) => k.id === korisnik.id)) {
      setIzabraniIzvodjaci((prev) => [...prev, korisnik]);
    }
  };
  const handleRemoveIzvodjac = (korisnikId: string) => {
    setIzabraniIzvodjaci((prev) => prev.filter((k) => k.id !== korisnikId));
  };

  const [naziv, setNaziv] = useState("");
  const [opis, setOpis] = useState("");
  const [zanr, setZanr] = useState("");
  const [jezikPjesme, setJezikPjesme] = useState("");
  const [licenca, setLicenca] = useState("");
  const [eksplicitniSadrzaj, setEksplicitniSadrzaj] = useState(false);
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [fileGif, setFileGif] = useState<File | null>(null);
  const [fileAudio, setFileAudio] = useState<File | null>(null);

  useEffect(() => {
    if (pjesma) {
      setNaziv(pjesma.naziv || "");
      setOpis(pjesma.opis || "");
      setZanr(pjesma.zanr || "");
      setJezikPjesme(pjesma.jezikPjesme || "");
      setLicenca(pjesma.licenca || "");
      setEksplicitniSadrzaj(!!pjesma.eksplicitniSadrzaj);
      setAlbumID(pjesma.albumID || "");
    }
  }, [pjesma]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!pjesma || !korisnikID) return;
    const formData = new FormData();
    formData.append("korisnikID", korisnikID);
    formData.append("naziv", naziv);
    formData.append("opis", opis);
    formData.append("datumObjave", pjesma.datumObjave || "");
    formData.append("trajanjeSekunde", String(pjesma.trajanjeSekunde));
    formData.append("javno", String(pjesma.javno || false));
    formData.append("odobreno", String(pjesma.odobreno || false));
    formData.append("jezikPjesme", jezikPjesme);
    formData.append("licenca", licenca);
    formData.append("eksplicitniSadrzaj", String(eksplicitniSadrzaj));
    formData.append("zanr", zanr);
    if (albumID) formData.append("albumID", String(albumID));
    if (fileSlika) formData.append("file_slika", fileSlika);
    if (fileGif) formData.append("file_gif", fileGif);
    if (fileAudio) formData.append("file_audio", fileAudio);

    try {
      await axios.put(`${API_BASE}/pjesme/${pjesma.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await axios.get(`${API_BASE}/izvodjac_pjesma/`).then(async (res) => {
        const veze = res.data || [];
        const zaPjesmu = veze.filter((v: IzvodjacPjesmaVeza) => v.pjesmaID === pjesma.id);
        for (const v of zaPjesmu) {
          await axios.delete(`${API_BASE}/izvodjac_pjesma/${v.izvodjacID}/${pjesma.id}`);
        }
        for (const izvodjac of izabraniIzvodjaci) {
          await axios.post(`${API_BASE}/izvodjac_pjesma/`, {
            izvodjacID: izvodjac.id,
            pjesmaID: pjesma.id,
            potvrdjeno: izvodjac.id === korisnikID,
          });
        }
      });

      setSuccess("Pjesma je uspješno ažurirana.");
      setTimeout(() => navigate(`/pjesma/${pjesma.id}`), 1200);
    } catch {
      setError("Greška pri ažuriranju pjesme.");
    }
  };

  if (loading) return <Loading />;
  if (error) return <div style={{ color: "#fff", padding: 32 }}>{error}</div>;
  if (!pjesma) return <div style={{ color: "#fff", padding: 32 }}>Pjesma nije pronađena.</div>;
  if (pjesma.korisnikID !== korisnikID)
    return <div style={{ color: "#fff", padding: 32 }}>Nemate pravo uređivanja ove pjesme.</div>;

  return (
    <>
    <Header/>
    <Sidebar/>
    <div className={styles.editSongBg} style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <form className={styles.editSongForm} onSubmit={handleSubmit}>
        <h2 className={styles.title}>{t("edit_song") || "Uredi pjesmu"}</h2>
        <label className={styles.label}>{t("song_name") || "Naziv"}</label>
        <input
          className={styles.input}
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          required
        />
        <label className={styles.label}>{t("description")}</label>
        <textarea
          className={styles.input}
          value={opis}
          onChange={(e) => setOpis(e.target.value)}
          rows={3}
        />
        <label className={styles.label}>{t("genre") || "Žanr"}</label>
        <input
          className={styles.input}
          value={zanr}
          onChange={(e) => setZanr(e.target.value)}
          required
        />
        <label className={styles.label}>{t("song_language") || "Jezik pjesme"}</label>
        <input
          className={styles.input}
          value={jezikPjesme}
          onChange={(e) => setJezikPjesme(e.target.value)}
        />
        <label className={styles.label}>{t("license") || "Licenca"}</label>
        <input
          className={styles.input}
          value={licenca}
          onChange={(e) => setLicenca(e.target.value)}
        />
        <label className={styles.label}>
          {t("explicit_content") || "Eksplicitni sadržaj"}
          <input
            type="checkbox"
            checked={eksplicitniSadrzaj}
            onChange={(e) => setEksplicitniSadrzaj(e.target.checked)}
            style={{ marginLeft: 8 }}
          />
        </label>
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
        <label className={styles.label}>{t("new_image_optional") || "Nova slika (opcionalno)"}</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFileSlika(e.target.files?.[0] || null)}
        />
        <label className={styles.label}>{t("new_gif_optional") || "Novi gif (opcionalno)"}</label>
        <input
          type="file"
          accept="image/gif"
          onChange={(e) => setFileGif(e.target.files?.[0] || null)}
        />
        <label className={styles.label}>{t("new_audio_optional") || "Novi audio (opcionalno)"}</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFileAudio(e.target.files?.[0] || null)}
        />
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <button className={styles.button} type="submit">
          {t("save_changes")}
        </button>
      </form>
      <div style={{
        marginLeft: 32,
        background: "#232323",
        borderRadius: 14,
        padding: "24px 18px",
        minWidth: 260,
        maxHeight: 480,
        overflowY: "auto",
        boxShadow: "0 4px 24px #b91d9533"
      }}>
        <h4 style={{ color: "#fff", marginBottom: 14, fontWeight: 600 }}>{t("song_artists") || "Izvođači na pjesmi"}</h4>
        <input
          type="text"
          placeholder={t("search_artists") || "Pretraži izvođače..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%",
            borderRadius: 8,
            border: "1px solid #b91d95",
            padding: "8px 10px",
            fontSize: "1.05rem",
            marginBottom: 10,
            background: "#181818",
            color: "#fff"
          }}
        />
        <div style={{ marginBottom: 10 }}>
          {izabraniIzvodjaci.map((k) => (
            <span key={k.id} style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#b91d95",
              color: "#fff",
              borderRadius: 8,
              padding: "4px 10px",
              marginRight: 6,
              marginBottom: 6,
              fontWeight: 600,
              fontSize: "0.98rem"
            }}>
              {k.korisnicko_ime}
              <button
                style={{
                  marginLeft: 6,
                  background: "none",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "1.1rem"
                }}
                onClick={() => handleRemoveIzvodjac(k.id)}
                title={k.id === korisnikID ? t("remove_self_artist") || "Ukloni sebe kao izvođača" : t("remove_artist") || "Ukloni izvođača"}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          <div style={{ color: "#bbb", fontSize: "0.93rem", marginTop: 4 }}>
            {t("can_remove_self_artist") || "Možete ukloniti bilo kojeg izvođača, uključujući i sebe."}
          </div>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sviIzvodjaci
            .filter((k) =>
              k.korisnicko_ime.toLowerCase().includes(search.toLowerCase()) &&
              !izabraniIzvodjaci.find((iz) => iz.id === k.id)
            )
            .slice(0, 8)
            .map((k) => (
              <li key={k.id} style={{ marginBottom: 8 }}>
                <button
                  style={{
                    background: "#b91d95",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 0",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                    transition: "background 0.18s",
                  }}
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
    <Footer/>
    </>
  );
};

export default UrediPjesmu;
