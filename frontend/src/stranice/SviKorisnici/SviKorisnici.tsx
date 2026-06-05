import React, { useMemo, useState, useCallback, memo, useEffect } from "react";
// import styles from "./SviKorisnici.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Korisnik, PrijavaIzvodjaca } from "../../types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient as qc } from '../../config/queryClient';

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SviKorisnici: React.FC = () => {
  const [styles, setStyles] = useState<Styles>({});
  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./SviKorisniciWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./SviKorisnici.module.css");
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
  const [success, setSuccess] = useState<string | null>(null);
  const [prijavaModal, setPrijavaModal] = useState<{ korisnikID: string; prijava: PrijavaIzvodjaca } | null>(null);
  const [suspendModal, setSuspendModal] = useState<{ korisnik: Korisnik; poruka: string; vrijemeDo: string } | null>(null);
  const [search, setSearch] = useState("");
  const [localUsers, setLocalUsers] = useState<Korisnik[]>([]);
  const [localPrijave, setLocalPrijave] = useState<PrijavaIzvodjaca[]>([]);
  const { t } = useTranslation();

  const usersQ = useQuery<Korisnik[]>({
    queryKey: ["korisnici"],
    queryFn: async () => axios.get(`${API_BASE}/korisnici/`).then((r) => r.data || []),
    initialData: [],
  });
  const prijaveQ = useQuery<PrijavaIzvodjaca[]>({
    queryKey: ["prijave_izvodjaca"],
    queryFn: async () => axios.get(`${API_BASE}/prijave_izvodjaca/`).then((r) => r.data || []),
    initialData: [],
  });

  const korisnici = localUsers;
  const prijave = localPrijave;

  useEffect(() => {
    setLocalUsers(usersQ.data || []);
  }, [usersQ.data]);

  useEffect(() => {
    setLocalPrijave(prijaveQ.data || []);
  }, [prijaveQ.data]);

  const updateUserMut = useMutation({
    mutationFn: async (vars: { korisnik: Korisnik; field: "rola" | "statusKorisnika"; value: string }) => {
      const body = {
        ...vars.korisnik,
        rola: vars.field === "rola" ? vars.value : vars.korisnik.rola,
        statusKorisnika: vars.field === "statusKorisnika" ? vars.value : vars.korisnik.statusKorisnika,
      };
      await axios.put(`${API_BASE}/korisnici/${vars.korisnik.id}`, body);
      if (vars.field === "statusKorisnika" && (vars.value === "aktivan" || vars.value === "neaktivan")) {
        try {
          const res = await axios.get(`${API_BASE}/suspendovani/korisnik/${vars.korisnik.id}`);
          if (res.data && res.data.id) await axios.delete(`${API_BASE}/suspendovani/${res.data.id}`);
        } catch {
          // Ako nema suspenzije, samo nastavi
        }
      }
      return body as Korisnik;
    },
    onSuccess: (updated) => {
      setSuccess("Uspješno ažurirano.");
      qc.setQueryData<Korisnik[]>(["korisnici"], (old) => (old || []).map((k) => (k.id === updated.id ? updated : k)));
    },
    onError: (_err, vars) => {
      setLocalUsers(prev =>
        prev.map(u =>
          u.id === vars.korisnik.id
            ? vars.korisnik
            : u
        )
      );

      setError("Greška pri ažuriranju korisnika.");
    },
  });

  const suspendMut = useMutation({
    mutationFn: async (vars: { korisnik: Korisnik; poruka: string; vrijemeDo: string }) => {
      await axios.put(`${API_BASE}/korisnici/${vars.korisnik.id}`, { ...vars.korisnik, statusKorisnika: "suspendovan" });
      await axios.post(`${API_BASE}/suspendovani/`, { korisnikID: vars.korisnik.id, vrijemeDo: vars.vrijemeDo, poruka: vars.poruka });
      return vars.korisnik.id;
    },
    onSuccess: (id) => {
      setSuccess("Korisnik je suspendovan.");
      qc.setQueryData<Korisnik[]>(["korisnici"], (old) => (old || []).map((k) => (k.id === id ? { ...k, statusKorisnika: "suspendovan" } : k)));
      setSuspendModal(null);
    },
    onError: () => setError("Greška pri suspenziji korisnika."),
  });

  const deletePrijavaMut = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_BASE}/prijave_izvodjaca/${id}`);
    },
    onSuccess: (_data, id) => {
      setLocalPrijave(prev =>
        prev.filter(p => String(p.id) !== id)
      );

      setPrijavaModal(null);
   },
    onError: () => {
      qc.invalidateQueries({
        queryKey: ["prijave_izvodjaca"],
      });

      alert(
        t("error_deleting_application") ||
        "Greška pri brisanju prijave."
      );
    },
  });

  const handleChange = useCallback(
  (korisnik: Korisnik, field: "rola" | "statusKorisnika", value: string) => {
    setError(null);
    setSuccess(null);

    setLocalUsers(prev =>
      prev.map(u =>
        u.id === korisnik.id
          ? {
              ...u,
              [field]: value,
            }
          : u
      )
    );

    if (field === "statusKorisnika" && value === "suspendovan") {
      setSuspendModal({ korisnik, poruka: "", vrijemeDo: "" });
      return;
    }

    updateUserMut.mutate({ korisnik, field, value });
  },
  [updateUserMut]
);

  const handlePotvrdiSuspenziju = useCallback(async () => {
    if (!suspendModal) return;
    setError(null);
    setSuccess(null);
    suspendMut.mutate({ korisnik: suspendModal.korisnik, poruka: suspendModal.poruka, vrijemeDo: suspendModal.vrijemeDo });
  }, [suspendModal, suspendMut]);

  const handlePrekiniSuspenziju = useCallback(() => {
    if (!suspendModal) return;
    qc.setQueryData<Korisnik[]>(["korisnici"], (old) => (old || []).map((k) => (k.id === suspendModal.korisnik.id ? { ...k, statusKorisnika: "aktivan" } : k)));
    setSuspendModal(null);
  }, [suspendModal]);

  const filtriraniKorisnici = useMemo(
    () => (korisnici || []).filter((k) => k.korisnicko_ime.toLowerCase().includes(search.toLowerCase())),
    [korisnici, search]
  );
  const loading = usersQ.isLoading || prijaveQ.isLoading;

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.bg}>
        <div className={styles.container}>
          <h2 className={styles.title}>{t("all_users") || "Svi korisnici"}</h2>
          <input
            type="text"
            placeholder={t("search_users") || "Pretraži korisnike..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <>
              {success && <div className={styles.success}>{success}</div>}
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("profile_image") || "Profilna"}</th>
                    <th>{t("username") || "Korisničko ime"}</th>
                    <th>{t("email") || "Email"}</th>
                    <th>{t("role") || "Rola"}</th>
                    <th>{t("status") || "Status"}</th>
                    <th>{t("name") || "Ime"}</th>
                    <th>{t("surname") || "Prezime"}</th>
                    <th>{t("artist_application") || "Prijava za izvođača"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtriraniKorisnici.map((k) => {
                    const prijava = prijave.find((p) => p.korisnikID === k.id);
                    return (
                      <tr key={k.id}>
                        <td data-label={t("profile_image") || "Profilna"}>
                          <img
                            src={k.putanjaProfilneSlike || "/logo.gif"}
                            alt={k.korisnicko_ime}
                            className={styles.profileImg}
                          />
                        </td>
                        <td data-label={t("username") || "Korisničko ime"}>
                          <Link to={`/izvodjac/${k.id}`} className={styles.link}>{k.korisnicko_ime}</Link>
                        </td>
                        <td data-label={t("email") || "Email"}>{k.email}</td>
                        <td data-label={t("role") || "Rola"}>
                          <select
                            value={k.rola}
                            onChange={(e) => handleChange(k, "rola", e.target.value)}
                            className={styles.select}
                          >
                            <option value="korisnik">{t("role_user") || "korisnik"}</option>
                            <option value="izvodac">{t("role_artist") || "izvođač"}</option>
                            <option value="admin">{t("role_admin") || "admin"}</option>
                          </select>
                        </td>
                        <td data-label={t("status") || "Status"}>
                          <select
                            value={k.statusKorisnika}
                            onChange={(e) => handleChange(k, "statusKorisnika", e.target.value)}
                            className={styles.select}
                          >
                            <option value="aktivan">{t("status_active") || "aktivan"}</option>
                            <option value="neaktivan">{t("status_inactive") || "neaktivan"}</option>
                            <option value="suspendovan">{t("status_suspended") || "suspendovan"}</option>
                          </select>
                        </td>
                        <td data-label={t("name") || "Ime"}>
                          <Link to={`/izvodjac/${k.id}`} className={styles.link}>{k.ime}</Link>
                        </td>
                        <td data-label={t("surname") || "Prezime"}>
                          <Link to={`/izvodjac/${k.id}`} className={styles.link}>{k.prezime}</Link>
                        </td>
                        <td data-label={t("artist_application") || "Prijava za izvođača"}>
                          {prijava ? (
                            <button
                              className={styles.showApplicationBtn}
                              onClick={() => setPrijavaModal({ korisnikID: k.id, prijava })}
                            >
                              {t("show_application") || "Prikaži prijavu"}
                            </button>
                          ) : (
                            <span className={styles.noApplicationText}>{t("no_application") || "Nema"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {prijavaModal && (
                <div className={styles.modalOverlay} onClick={() => setPrijavaModal(null)}>
                  <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <h4 className={styles.modalTitle}>{t("artist_application")}</h4>
                    <div className={styles.modalSection}>
                      <b>{t("user")}:</b>{" "}
                      {(() => {
                        const korisnik = korisnici.find((x) => x.id === prijavaModal.korisnikID);
                        return korisnik ? `${korisnik.korisnicko_ime} (${korisnik.ime} ${korisnik.prezime})` : prijavaModal.korisnikID;
                      })()}
                    </div>
                    <div className={styles.modalSection}>
                      <b>{t("message") || "Poruka"}:</b>
                      <div className={styles.messageBox}>{prijavaModal.prijava.poruka}</div>
                    </div>
                    <div className={styles.modalSection}>
                      <b>{t("date") || "Datum"}:</b> {prijavaModal.prijava.datum ? new Date(prijavaModal.prijava.datum).toLocaleString() : ""}
                    </div>
                    <div className={styles.modalButtons}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => {
                          if (!window.confirm(t("confirm_delete_application") || "Jeste li sigurni da želite obrisati ovu prijavu?")) return;
                          deletePrijavaMut.mutate(String(prijavaModal.prijava.id));
                        }}
                      >
                        {t("delete_application") || "Obriši prijavu"}
                      </button>
                      <button className={styles.cancelBtn} onClick={() => setPrijavaModal(null)}>
                        {t("close")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {suspendModal && (
                <div className={styles.suspendModalOverlay} onClick={handlePrekiniSuspenziju}>
                  <div className={styles.suspendModalContent} onClick={(e) => e.stopPropagation()}>
                    <h4 className={styles.suspendModalTitle}>{t("suspend_user") || "Suspenduj korisnika"}</h4>
                    <div className={styles.suspendUserInfo}>
                      <b>{t("user")}:</b> {suspendModal.korisnik.korisnicko_ime}
                    </div>
                    <div className={styles.suspendInputGroup}>
                      <label className={styles.suspendLabel}>
                        {t("suspension_reason") || "Poruka za korisnika (razlog suspenzije)"}:
                        <textarea
                          className={styles.suspendTextarea}
                          value={suspendModal.poruka}
                          onChange={(e) => setSuspendModal((prev) => (prev ? { ...prev, poruka: e.target.value } : prev))}
                          required
                        />
                      </label>
                    </div>
                    <div className={styles.suspendInputGroup}>
                      <label className={styles.suspendLabel}>
                        {t("suspension_until") || "Trajanje suspenzije (do kada, ISO format ili YYYY-MM-DDTHH:mm)"}:
                        <input
                          type="datetime-local"
                          className={styles.suspendDateInput}
                          value={suspendModal.vrijemeDo}
                          onChange={(e) => setSuspendModal((prev) => (prev ? { ...prev, vrijemeDo: e.target.value } : prev))}
                          required
                        />
                      </label>
                    </div>
                    <div className={styles.suspendModalButtons}>
                      <button className={styles.confirmSuspendBtn} onClick={handlePotvrdiSuspenziju}>
                        {t("confirm_suspension") || "Potvrdi suspenziju"}
                      </button>
                      <button className={styles.cancelSuspendBtn} onClick={handlePrekiniSuspenziju}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default memo(SviKorisnici);
