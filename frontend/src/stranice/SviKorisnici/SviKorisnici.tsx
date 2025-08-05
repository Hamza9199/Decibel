import React, { useEffect, useState } from "react";
import styles from "./SviKorisnici.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Korisnik } from "../../types";
import { PrijavaIzvodjaca } from "../../types"; 
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const SviKorisnici: React.FC = () => {
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prijave, setPrijave] = useState<PrijavaIzvodjaca[]>([]);
  const [prijavaModal, setPrijavaModal] = useState<{ korisnikID: string; prijava: PrijavaIzvodjaca } | null>(null);
  const [suspendModal, setSuspendModal] = useState<{
    korisnik: Korisnik;
    poruka: string;
    vrijemeDo: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/korisnici/`).then((res) => res.data || []).catch(() => []),
      axios.get(`${API_BASE}/prijave_izvodjaca/`).then((res) => res.data || []).catch(() => []),
    ])
      .then(([korisniciData, prijaveData]) => {
        setKorisnici(korisniciData);
        setPrijave(prijaveData);
      })
      .catch(() => setError("Greška pri dohvatu korisnika ili prijava."))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (
    korisnik: Korisnik,
    field: "rola" | "statusKorisnika",
    value: string
  ) => {
    setError(null);
    setSuccess(null);

    if (field === "statusKorisnika" && value === "suspendovan") {
      setSuspendModal({
        korisnik,
        poruka: "",
        vrijemeDo: "",
      });
      return;
    }

    try {
      await axios.put(`${API_BASE}/korisnici/${korisnik.id}`, {
        ...korisnik,
        rola: field === "rola" ? value : korisnik.rola,
        statusKorisnika: field === "statusKorisnika" ? value : korisnik.statusKorisnika,
      });

      if (
        field === "statusKorisnika" &&
        (value === "aktivan" || value === "neaktivan")
      ) {
        try {
          const res = await axios.get(`${API_BASE}/suspendovani/korisnik/${korisnik.id}`);
          if (res.data && res.data.id) {
            await axios.delete(`${API_BASE}/suspendovani/${res.data.id}`);
          }
        } catch {
          console.error("Greška pri brisanju suspenzije korisnika.");
        }
      }

      setSuccess("Uspješno ažurirano.");
      setKorisnici((prev) =>
        prev.map((k) =>
          k.id === korisnik.id
            ? {
                ...k,
                rola: field === "rola" ? value : k.rola,
                statusKorisnika: field === "statusKorisnika" ? value : k.statusKorisnika,
              }
            : k
        )
      );
    } catch {
      setError("Greška pri ažuriranju korisnika.");
    }
  };

  const handlePotvrdiSuspenziju = async () => {
    if (!suspendModal) return;
    setError(null);
    setSuccess(null);
    try {
      await axios.put(`${API_BASE}/korisnici/${suspendModal.korisnik.id}`, {
        ...suspendModal.korisnik,
        statusKorisnika: "suspendovan",
      });
      await axios.post(`${API_BASE}/suspendovani/`, {
        korisnikID: suspendModal.korisnik.id,
        vrijemeDo: suspendModal.vrijemeDo,
        poruka: suspendModal.poruka,
      });
      setSuccess("Korisnik je suspendovan.");
      setKorisnici((prev) =>
        prev.map((k) =>
          k.id === suspendModal.korisnik.id
            ? { ...k, statusKorisnika: "suspendovan" }
            : k
        )
      );
      setSuspendModal(null);
    } catch {
      setError("Greška pri suspenziji korisnika.");
    }
  };

  const handlePrekiniSuspenziju = () => {
    if (!suspendModal) return;
    setKorisnici((prev) =>
      prev.map((k) =>
        k.id === suspendModal.korisnik.id
          ? { ...k, statusKorisnika: "aktivan" }
          : k
      )
    );
    setSuspendModal(null);
  };

  const filtriraniKorisnici = korisnici.filter((k) =>
    k.korisnicko_ime.toLowerCase().includes(search.toLowerCase())
  );

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
            onChange={e => setSearch(e.target.value)}
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
                        <td data-label={t("username") || "Korisničko ime"}>{k.korisnicko_ime}</td>
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
                        <td data-label={t("name") || "Ime"}>{k.ime}</td>
                        <td data-label={t("surname") || "Prezime"}>{k.prezime}</td>
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
                  <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                    <h4 className={styles.modalTitle}>{t("artist_application")}</h4>
                    <div className={styles.modalSection}>
                      <b>{t("user")}:</b>{" "}
                      {
                        (() => {
                          const korisnik = korisnici.find(k => k.id === prijavaModal.korisnikID);
                          return korisnik
                            ? `${korisnik.korisnicko_ime} (${korisnik.ime} ${korisnik.prezime})`
                            : prijavaModal.korisnikID;
                        })()
                      }
                    </div>
                    <div className={styles.modalSection}>
                      <b>{t("message") || "Poruka"}:</b>
                      <div className={styles.messageBox}>
                        {prijavaModal.prijava.poruka}
                      </div>
                    </div>
                    <div className={styles.modalSection}>
                      <b>{t("date") || "Datum"}:</b> {prijavaModal.prijava.datum ? new Date(prijavaModal.prijava.datum).toLocaleString() : ""}
                    </div>
                    <div className={styles.modalButtons}>
                      <button
                        className={styles.deleteBtn}
                        onClick={async () => {
                          if (!window.confirm(t("confirm_delete_application") || "Jeste li sigurni da želite obrisati ovu prijavu?")) return;
                          try {
                            await axios.delete(`${API_BASE}/prijave_izvodjaca/${prijavaModal.prijava.id}`);
                            setPrijave((prev) => prev.filter((p) => p.id !== prijavaModal.prijava.id));
                            setPrijavaModal(null);
                          } catch {
                            alert(t("error_deleting_application") || "Greška pri brisanju prijave.");
                          }
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
                  <div className={styles.suspendModalContent} onClick={e => e.stopPropagation()}>
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
                          onChange={e =>
                            setSuspendModal((prev) =>
                              prev ? { ...prev, poruka: e.target.value } : prev
                            )
                          }
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
                          onChange={e =>
                            setSuspendModal((prev) =>
                              prev ? { ...prev, vrijemeDo: e.target.value } : prev
                            )
                          }
                          required
                        />
                      </label>
                    </div>
                    <div className={styles.suspendModalButtons}>
                      <button
                        className={styles.confirmSuspendBtn}
                        onClick={async () => {
                          await handlePotvrdiSuspenziju();
                        }}
                      >
                        {t("confirm_suspension") || "Potvrdi suspenziju"}
                      </button>
                      <button
                        className={styles.cancelSuspendBtn}
                        onClick={handlePrekiniSuspenziju}
                      >
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

export default SviKorisnici;
