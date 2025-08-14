import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import styles from "./UrediProfil.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import Loading from "../../komponente/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const UrediProfil: React.FC = () => {
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [korisnickoIme, setKorisnickoIme] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [rola, setRola] = useState("korisnik");
  const [slika, setSlika] = useState<string | null>(null);
  const [fileSlika, setFileSlika] = useState<File | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slikaSuccess, setSlikaSuccess] = useState<string | null>(null);
  const [slikaError, setSlikaError] = useState<string | null>(null);
  const { t } = useTranslation();
  const qc = useQueryClient();

  const korisnikID = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("korisnik") || "");
      return user?.id || "";
    } catch {
      return "";
    }
  }, []);

  const profileQ = useQuery({
    queryKey: ["korisnik", korisnikID],
    enabled: Boolean(korisnikID),
    queryFn: async () => axios.get(`${API_BASE}/korisnici/${korisnikID}`).then((r) => r.data),
  });

  useEffect(() => {
    if (profileQ.data) {
      setIme(profileQ.data.ime || "");
      setPrezime(profileQ.data.prezime || "");
      setKorisnickoIme(profileQ.data.korisnicko_ime || "");
      setEmail(profileQ.data.email || "");
      setBio(profileQ.data.bio || "");
      setRola(profileQ.data.rola || "korisnik");
      setSlika(profileQ.data.putanjaProfilneSlike || null);
    }
  }, [profileQ.data]);

  useEffect(() => {
    if (profileQ.isError) setError("Greška pri učitavanju podataka.");
  }, [profileQ.isError]);

  const updateMut = useMutation({
    mutationFn: async () => {
      await axios.put(`${API_BASE}/korisnici/${korisnikID}`, {
        ime,
        prezime,
        korisnicko_ime: korisnickoIme,
        email,
        lozinka: "",
        rola,
        bio,
      });
    },
    onSuccess: () => {
      setSuccess("Podaci su uspješno sačuvani.");
      qc.invalidateQueries({ queryKey: ["korisnik", korisnikID] });
    },
    onError: () => setError("Greška pri čuvanju podataka."),
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

  const handleSlikaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFileSlika(e.target.files[0]);
  }, []);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file_profilna", file);
      const res = await axios.put(`${API_BASE}/korisnici/slika/${korisnikID}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: (data) => {
      setSlika(data.putanjaProfilneSlike || null);
      setSlikaSuccess("Profilna slika je uspješno promijenjena.");
      setFileSlika(null);
      qc.invalidateQueries({ queryKey: ["korisnik", korisnikID] });
    },
    onError: () => setSlikaError("Greška pri promjeni slike."),
  });

  const handleSlikaUpload = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSlikaError(null);
      setSlikaSuccess(null);
      if (!fileSlika) {
        setSlikaError("Odaberite sliku za upload.");
        return;
      }
      uploadMut.mutate(fileSlika);
    },
    [fileSlika, uploadMut]
  );

  const loading = profileQ.isLoading;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.editProfileBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("edit_profile")}</h2>
          {loading ? (
            <Loading />
          ) : (
            <>
              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.label}>
                  {t("name")}:
                  <input className={styles.input} type="text" value={ime} onChange={(e) => setIme(e.target.value)} required />
                </label>
                <label className={styles.label}>
                  {t("surname")}:
                  <input className={styles.input} type="text" value={prezime} onChange={(e) => setPrezime(e.target.value)} required />
                </label>
                <label className={styles.label}>
                  {t("username")}:
                  <input className={styles.input} type="text" value={korisnickoIme} onChange={(e) => setKorisnickoIme(e.target.value)} required />
                </label>
                <label className={styles.label}>
                  {t("email")}:
                  <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label className={styles.label}>
                  Bio:
                  <textarea className={styles.textarea} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                </label>
                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}
                <button className={styles.button} type="submit" disabled={updateMut.isPending}>
                  {t("save_changes")}
                </button>
              </form>
              <div className={styles.profileImageSection}>
                <h3 className={styles.subtitle}>{t("profile")} {t("image") || "slika"}</h3>
                <div className={styles.profileImageWrap}>
                  <img src={slika || "/logo.gif"} alt="Profilna slika" className={styles.profileImage} />
                </div>
                <form className={styles.form} onSubmit={handleSlikaUpload}>
                  <input type="file" accept="image/*" className={styles.input} onChange={handleSlikaChange} />
                  {slikaError && <div className={styles.error}>{slikaError}</div>}
                  {slikaSuccess && <div className={styles.success}>{slikaSuccess}</div>}
                  <button className={styles.button} type="submit" disabled={uploadMut.isPending}>
                    {t("edit") + " " + (t("profile") || "") + " " + (t("image") || "slika")}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(UrediProfil);
