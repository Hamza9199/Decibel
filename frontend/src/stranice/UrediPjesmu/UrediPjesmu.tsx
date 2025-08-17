import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import styles from "./UrediPjesmu.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Pjesma, Album, Korisnik, IzvodjacPjesmaVeza } from "../../types";
import Loading from "../../komponente/Loading/Loading";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediPjesmu: React.FC = () => {
  const { pjesmaId } = useParams<{ pjesmaId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const pjesmaQ = useQuery<Pjesma | null>({
    queryKey: ["pjesma", pjesmaId],
    enabled: Boolean(pjesmaId),
    queryFn: async () => axios.get(`${API_BASE}/pjesme/${pjesmaId}`).then((r) => r.data as Pjesma),
  });

  const albumiQ = useQuery<Album[]>({
    queryKey: ["albumi", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/albumi/`).then((r) => (r.data || []).filter((a: Album) => a.korisnikID === korisnikID)),
    initialData: [],
  });

  const korisniciQ = useQuery<Korisnik[]>({
    queryKey: ["korisnici"],
    queryFn: async () => axios.get(`${API_BASE}/korisnici/`).then((r) => r.data || []),
    initialData: [],
  });

  const vezeQ = useQuery<IzvodjacPjesmaVeza[]>({
    queryKey: ["izvodjac_pjesma", pjesmaId],
    enabled: Boolean(pjesmaId),
    queryFn: async () => axios.get(`${API_BASE}/izvodjac_pjesma/`).then((r) => r.data || []),
    initialData: [],
  });

  const [albumID, setAlbumID] = useState<number | "">("");
  const [sviIzvodjaci, setSviIzvodjaci] = useState<Korisnik[]>([]);
  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [search, setSearch] = useState("");

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
    if (pjesmaQ.data) {
      setNaziv(pjesmaQ.data.naziv || "");
      setOpis(pjesmaQ.data.opis || "");
      setZanr(pjesmaQ.data.zanr || "");
      setJezikPjesme(pjesmaQ.data.jezikPjesme || "");
      setLicenca(pjesmaQ.data.licenca || "");
      setEksplicitniSadrzaj(!!pjesmaQ.data.eksplicitniSadrzaj);
      setAlbumID(pjesmaQ.data.albumID || "");
    }
  }, [pjesmaQ.data]);

  useEffect(() => {
    if (korisniciQ.data) setSviIzvodjaci(korisniciQ.data);
  }, [korisniciQ.data]);

  useEffect(() => {
    if (!pjesmaQ.data?.id) return;
    const veze = vezeQ.data || [];
    const izIds = veze.filter((v) => v.pjesmaID === pjesmaQ.data?.id).map((v) => v.izvodjacID);
    setIzabraniIzvodjaci((korisniciQ.data || []).filter((k) => izIds.includes(k.id)));
  }, [pjesmaQ.data?.id, vezeQ.data, korisniciQ.data]);

  const handleAddIzvodjac = useCallback((korisnik: Korisnik) => {
    setIzabraniIzvodjaci((prev) => (prev.find((k) => k.id === korisnik.id) ? prev : [...prev, korisnik]));
  }, []);

  const handleRemoveIzvodjac = useCallback((korisnikId: string) => {
    setIzabraniIzvodjaci((prev) => prev.filter((k) => k.id !== korisnikId));
  }, []);

  const updateMut = useMutation({
    mutationFn: async () => {
      const pjesma = pjesmaQ.data as Pjesma;
      if (!pjesma || !korisnikID) throw new Error("no-song");
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
      await axios.put(`${API_BASE}/pjesme/${pjesma.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const vezeRes = await axios.get(`${API_BASE}/izvodjac_pjesma/`);
      const vezeSve: IzvodjacPjesmaVeza[] = vezeRes.data || [];
      const zaPjesmu = vezeSve.filter((v) => v.pjesmaID === pjesma.id);
      for (const v of zaPjesmu) {
        await axios.delete(`${API_BASE}/izvodjac_pjesma/${v.izvodjacID}/${pjesma.id}`);
      }
      for (const iz of izabraniIzvodjaci) {
        await axios.post(`${API_BASE}/izvodjac_pjesma/`, { izvodjacID: iz.id, pjesmaID: pjesma.id, potvrdjeno: iz.id === korisnikID });
      }
    },
    onSuccess: () => {
      setSuccess("Pjesma je uspješno ažurirana.");
      qc.invalidateQueries({ queryKey: ["pjesma", pjesmaId] });
      qc.invalidateQueries({ queryKey: ["izvodjac_pjesma", pjesmaId] });
      const id = (pjesmaQ.data as Pjesma)?.id;
      if (id) setTimeout(() => navigate(`/pjesma/${id}`), 1200);
    },
    onError: () => setError("Greška pri ažuriranju pjesme."),
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      updateMut.mutate();
    },
    [updateMut]
  );

  const loading = pjesmaQ.isLoading || albumiQ.isLoading || korisniciQ.isLoading || vezeQ.isLoading;
  if (loading) return <Loading />;
  if (pjesmaQ.isError) return <div style={{ color: "#fff", padding: 32 }}>{t("error_fetching_song") || "Greška pri dohvatanju pjesme."}</div>;
  if (!pjesmaQ.data) return <div style={{ color: "#fff", padding: 32 }}>{t("song_not_found") || "Pjesma nije pronađena."}</div>;
  if (pjesmaQ.data.korisnikID !== korisnikID) return <div style={{ color: "#fff", padding: 32 }}>{t("no_edit_permission") || "Nemate pravo uređivanja ove pjesme."}</div>;

  const albumi = albumiQ.data || [];

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.editSongBg}>
        <div className={styles.formContainer}>
          <form className={styles.editSongForm} onSubmit={handleSubmit}>
            <h2 className={styles.title}>{t("edit_song") || "Uredi pjesmu"}</h2>
            <label className={styles.label}>{t("song_name") || "Naziv"}</label>
            <input className={styles.input} value={naziv} onChange={(e) => setNaziv(e.target.value)} required />
            <label className={styles.label}>{t("description")}</label>
            <textarea className={styles.input} value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />
            <label className={styles.label}>{t("genre") || "Žanr"}</label>
            <input className={styles.input} value={zanr} onChange={(e) => setZanr(e.target.value)} required />
            <label className={styles.label}>{t("song_language") || "Jezik pjesme"}</label>
            <input className={styles.input} value={jezikPjesme} onChange={(e) => setJezikPjesme(e.target.value)} />
            <label className={styles.label}>{t("license") || "Licenca"}</label>
            <input className={styles.input} value={licenca} onChange={(e) => setLicenca(e.target.value)} />
            <label className={styles.label}>
              {t("explicit_content") || "Eksplicitni sadržaj"}
              <input type="checkbox" checked={eksplicitniSadrzaj} onChange={(e) => setEksplicitniSadrzaj(e.target.checked)} style={{ marginLeft: 8 }} />
            </label>
            <label className={styles.label}>{t("album_optional") || "Album (opcionalno)"}</label>
            <select className={styles.input} value={albumID} onChange={(e) => setAlbumID(e.target.value ? Number(e.target.value) : "")}>
              <option value="">{t("no_album") || "Bez albuma"}</option>
              {albumi.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.naziv}
                </option>
              ))}
            </select>
            <label className={styles.label}>{t("new_image_optional") || "Nova slika (opcionalno)"}</label>
            <input type="file" accept="image/*" onChange={(e) => setFileSlika(e.target.files?.[0] || null)} />
            <label className={styles.label}>{t("new_gif_optional") || "Novi gif (opcionalno)"}</label>
            <input type="file" accept="image/gif" onChange={(e) => setFileGif(e.target.files?.[0] || null)} />
            <label className={styles.label}>{t("new_audio_optional") || "Novi audio (opcionalno)"}</label>
            <input type="file" accept="audio/*" onChange={(e) => setFileAudio(e.target.files?.[0] || null)} />
            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}
            <button className={styles.button} type="submit">{t("save_changes")}</button>
          </form>

          <div className={styles.artistsSection}>
            <h4 className={styles.artistsTitle}>{t("song_artists") || "Izvođači na pjesmi"}</h4>
            <input type="text" placeholder={t("search_artists") || "Pretraži izvođače..."} value={search} onChange={(e) => setSearch(e.target.value)} className={styles.artistSearch} />
            <div className={styles.selectedArtists}>
              {izabraniIzvodjaci.map((k) => (
                <span key={k.id} className={styles.artistTag}>
                  {k.korisnicko_ime}
                  <button className={styles.removeArtistBtn} onClick={() => handleRemoveIzvodjac(k.id)} title={k.id === korisnikID ? t("remove_self_artist") || "Ukloni sebe kao izvođača" : t("remove_artist") || "Ukloni izvođača"} type="button">
                    ×
                  </button>
                </span>
              ))}
              <div className={styles.artistNote}>{t("can_remove_self_artist") || "Možete ukloniti bilo kojeg izvođača, uključujući i sebe."}</div>
            </div>
            <ul className={styles.availableArtists}>
              {(sviIzvodjaci || [])
                .filter((k) => k.korisnicko_ime.toLowerCase().includes(search.toLowerCase()) && !izabraniIzvodjaci.find((iz) => iz.id === k.id))
                .slice(0, 8)
                .map((k) => (
                  <li key={k.id} className={styles.artistItem}>
                    <button className={styles.addArtistBtn} type="button" onClick={() => handleAddIzvodjac(k)}>
                      {k.korisnicko_ime}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(UrediPjesmu);
