import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Loading from "../../komponente/Loading/Loading";
import Footer from "../../komponente/Footer/Footer";
import Header from "../../komponente/Header/Header";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import { Album, Korisnik } from "../../types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import PreviewCard from "../../komponente/Preview/PreviewCard";

type Styles = Record<string, string>;

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

  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>("");
  const [previewSlika, setPreviewSlika] = useState<string>("");
  const [previewGif, setPreviewGif] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [albumID, setAlbumID] = useState<number | "">("");
  const [izabraniIzvodjaci, setIzabraniIzvodjaci] = useState<Korisnik[]>([]);
  const [search, setSearch] = useState("");

  const [styles, setStyles] = useState<Styles>({});
  const [javno, setJavno] = useState(false);
  const [jezikPjesme, setJezikPjesme] = useState("");
  const [eksplicitniSadrzaj, setEksplicitniSadrzaj] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const korisnik = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("korisnik") || "");
    } catch {
      return {} as Partial<Korisnik>;
    }
  }, []);

  const korisnikId = useMemo(() => String((korisnik as Korisnik | Partial<Korisnik> | undefined)?.id || ""), [korisnik]);

  const albumiQ = useQuery<Album[]>({
    queryKey: ["albumi", korisnikId],
    enabled: Boolean(korisnikId),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/albumi/`);
      const all: Album[] = r.data || [];
      return all.filter((a) => String(a.korisnikID) === String(korisnikId));
    },
    initialData: [],
  });

  const sviIzvodjaciQ = useQuery<Korisnik[]>({
    queryKey: ["korisnici"],
    queryFn: async () => axios.get(`${API_BASE}/korisnici/`).then((r) => r.data || []),
    initialData: [],
  });

  useEffect(() => {
    if (!korisnikId) return;
    setIzabraniIzvodjaci((prev) => {
      if (prev.length === 0) {
        const userObj =
          (sviIzvodjaciQ.data || []).find((k) => String(k.id) === String(korisnikId)) || (korisnik as Korisnik);
        return [userObj as Korisnik];
      }
      return prev;
    });
  }, [korisnikId, sviIzvodjaciQ.data, korisnik]);

  const createSongMut = useMutation({
    mutationFn: async (vars: {
      naziv: string;
      opis: string;
      datumObjave: string;
      trajanjeSekunde: number;
      zanr: string;
      albumID: number | "";
      audio: File | null;
      slika: File | null;
      gif: File | null;
      autorId: string;
      izvodjaci: Korisnik[];
      javno: boolean;
      jezikPjesme: string;
      eksplicitniSadrzaj: boolean;
    }) => {
      const formData = new FormData();
      formData.append("korisnikID", vars.autorId as string);
      formData.append("naziv", vars.naziv);
      formData.append("opis", vars.opis);
      formData.append("datumObjave", vars.datumObjave);
      formData.append("trajanjeSekunde", String(vars.trajanjeSekunde));
      formData.append("zanr", vars.zanr);
      if (vars.albumID) formData.append("albumID", String(vars.albumID));
      if (vars.audio) formData.append("file_audio", vars.audio);
      if (vars.slika) formData.append("file_slika", vars.slika);
      if (vars.gif) formData.append("file_gif", vars.gif);
      formData.append("javno", String(vars.javno));
      formData.append("jezikPjesme", vars.jezikPjesme);
      formData.append("eksplicitniSadrzaj", String(vars.eksplicitniSadrzaj));

      const res = await axios.post<{ id: number }>(`${API_BASE}/pjesme/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const pjesmaId = res.data.id;
      const uniqueIzvodjaci = vars.izvodjaci.filter((izv, idx, arr) => arr.findIndex((x) => x.id === izv.id) === idx);

      await Promise.all(
        uniqueIzvodjaci.map((izv) =>
          axios
            .post(`${API_BASE}/izvodjac_pjesma/`, {
              izvodjacID: izv.id,
              pjesmaID: pjesmaId,
              potvrdjeno: String(izv.id) === String(vars.autorId),
            })
            .catch(() => {})
        )
      );

      return pjesmaId;
    },
    onSuccess: () => {
      setSuccess("Pjesma je uspješno dodana!");
      setTimeout(() => navigate("/"), 1200);
    },
    onError: () => {
      setError("Greška pri dodavanju pjesme.");
    },
  });

  const handleAddIzvodjac = useCallback((k: Korisnik) => {
    setIzabraniIzvodjaci((prev) => (prev.find((x) => x.id === k.id) ? prev : [...prev, k]));
  }, []);

  const handleRemoveIzvodjac = useCallback((korisnikId2: string) => {
    setIzabraniIzvodjaci((prev) => prev.filter((k) => k.id !== korisnikId2));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      if (!korisnikId) return;
      createSongMut.mutate({
        naziv,
        opis,
        datumObjave,
        trajanjeSekunde,
        zanr,
        albumID,
        audio,
        slika,
        gif,
        autorId: korisnikId,
        izvodjaci: izabraniIzvodjaci,
        javno,
        jezikPjesme,
        eksplicitniSadrzaj,
      });
    },
    [
      korisnikId,
      createSongMut,
      naziv,
      opis,
      datumObjave,
      trajanjeSekunde,
      zanr,
      albumID,
      audio,
      slika,
      gif,
      izabraniIzvodjaci,
      javno,
      jezikPjesme,
      eksplicitniSadrzaj,
    ]
  );

  const availableArtists = useMemo(() => {
    const all = sviIzvodjaciQ.data || [];
    const selectedIds = new Set(izabraniIzvodjaci.map((k) => k.id));
    return all
      .filter((k) => k.korisnicko_ime.toLowerCase().includes(search.toLowerCase()) && !selectedIds.has(k.id))
      .slice(0, 8);
  }, [sviIzvodjaciQ.data, izabraniIzvodjaci, search]);

  const loading = useMemo(() => albumiQ.isLoading || sviIzvodjaciQ.isLoading || createSongMut.isPending, [
    albumiQ.isLoading,
    sviIzvodjaciQ.isLoading,
    createSongMut.isPending,
  ]);

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./NovaPjesmaWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./NovaPjesma.module.css");
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

  return (
    <>
      <Header />
      <Sidebar />
      {loading && <Loading />}

      <div className={styles.novaPjesmaBg}>
        <div className={styles.formContainer}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", width: "100%", justifyContent: "center" }}>
            <form className={styles.novaPjesmaForm} onSubmit={handleSubmit} style={{ minWidth: 340, maxWidth: 520 }}>
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
              <textarea placeholder={t("description") || "Opis"} className={styles.input} value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />

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
              <select className={styles.input} value={zanr} onChange={(e) => setZanr(e.target.value)} required>
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
              <select className={styles.input} value={albumID} onChange={(e) => setAlbumID(e.target.value ? Number(e.target.value) : "")}> 
                <option value="">{t("no_album") || "Bez albuma"}</option>
                {(albumiQ.data || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.naziv}
                  </option>
                ))}
              </select>

              <label className={styles.label}>
                {t("audio_file") || "Audio fajl"}:
                <input
                  type="file"
                  accept="audio/*"
                  className={styles.fileInput}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAudio(f);
                    if (f) {
                      const url = URL.createObjectURL(f);
                      setAudioPreviewUrl(url);
                    } else {
                      setAudioPreviewUrl("");
                    }
                  }}
                  required
                />
              </label>

              <label className={styles.label}>
                {t("image") || "Slika"}:
                <input
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSlika(f);
                    if (!f) {
                      setPreviewSlika("");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => setPreviewSlika(String(ev.target?.result || ""));
                    reader.readAsDataURL(f);
                  }}
                />
              </label>

              <label className={styles.label}>
                GIF:
                <input
                  type="file"
                  accept="image/gif"
                  className={styles.fileInput}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setGif(f);
                    if (!f) {
                      setPreviewGif("");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => setPreviewGif(String(ev.target?.result || ""));
                    reader.readAsDataURL(f);
                  }}
                />
              </label>

              <label className={styles.label}>
                {t("public") || "Javno"}
                <input type="checkbox" checked={javno} onChange={(e) => setJavno(e.target.checked)} style={{ marginLeft: 8 }} />
              </label>

              <label className={styles.label}>{t("song_language") || "Jezik pjesme"}</label>
              <input type="text" className={styles.input} value={jezikPjesme} onChange={(e) => setJezikPjesme(e.target.value)} />

              <label className={styles.label}>
                {t("explicit_content") || "Eksplicitni sadržaj"}
                <input
                  type="checkbox"
                  checked={eksplicitniSadrzaj}
                  onChange={(e) => setEksplicitniSadrzaj(e.target.checked)}
                  style={{ marginLeft: 8 }}
                />
              </label>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              <button className={styles.button} type="submit">
                {t("add_song") || "Dodaj pjesmu"}
              </button>
            </form>

            <div style={{ width: 320, maxWidth: "35vw" }}>
              <PreviewCard title={naziv || ""}>
                <div style={{ marginTop: 10 }}>
                  {(previewSlika || previewGif) && (
                    <img
                      src={previewSlika || previewGif}
                      alt="Preview"
                      style={{ width: "100%", borderRadius: 10, objectFit: "cover" }}
                    />
                  )}

                  {audioPreviewUrl && (
                    <audio controls src={audioPreviewUrl} style={{ width: "100%", marginTop: 10 }} />
                  )}
                </div>
              </PreviewCard>
            </div>
          </div>

          <div className={styles.artistsSection}>
            <h4 className={styles.artistsTitle}>{t("song_artists") || "Izvođači na pjesmi"}</h4>
            <input
              type="text"
              placeholder={t("search_artists") || "Pretraži izvođače..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.artistSearch}
            />

            <div className={styles.selectedArtists}>
              {izabraniIzvodjaci.map((k) => (
                <span key={k.id} className={styles.artistTag}>
                  {k.korisnicko_ime}
                  <button
                    className={styles.removeArtistBtn}
                    onClick={() => handleRemoveIzvodjac(k.id)}
                    title={k.id === (korisnik as Korisnik)?.id ? t("remove_self_artist") || "Ukloni sebe kao izvođača" : t("remove_artist") || "Ukloni izvođača"}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className={styles.artistNote}>{t("can_remove_self_artist") || "Možete ukloniti i sebe kao izvođača."}</div>
            </div>

            <ul className={styles.availableArtists}>
              {availableArtists.map((k) => (
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

export default memo(NovaPjesma);

