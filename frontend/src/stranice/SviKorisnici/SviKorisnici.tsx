import React, { useEffect, useState } from "react";
import styles from "./SviKorisnici.module.css";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import axios from "axios";
import { Korisnik } from "../../types";
import { PrijavaIzvodjaca } from "../../types"; // Dodaj tip ako ga imaš, ili koristi any
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

    // Ako se bira "suspendovan" status, otvori modal za unos poruke i vremena
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

      // Ako se status mijenja na aktivan ili neaktivan, obriši suspenziju ako postoji
      if (
        field === "statusKorisnika" &&
        (value === "aktivan" || value === "neaktivan")
      ) {
        try {
          // Prvo pokušaj dohvatiti suspenziju
          const res = await axios.get(`${API_BASE}/suspendovani/korisnik/${korisnik.id}`);
          if (res.data && res.data.id) {
            await axios.delete(`${API_BASE}/suspendovani/${res.data.id}`);
          }
        } catch {
          // Nema suspenzije, ignoriši grešku
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

  // Funkcija za potvrdu suspenzije
  const handlePotvrdiSuspenziju = async () => {
    if (!suspendModal) return;
    setError(null);
    setSuccess(null);
    try {
      // Prvo ažuriraj korisnika na suspendovan
      await axios.put(`${API_BASE}/korisnici/${suspendModal.korisnik.id}`, {
        ...suspendModal.korisnik,
        statusKorisnika: "suspendovan",
      });
      // Zatim kreiraj zapis o suspenziji
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

  // Funkcija za prekid suspenzije (zatvaranje modala i vraćanje na aktivan)
  const handlePrekiniSuspenziju = () => {
    if (!suspendModal) return;
    // Vraćanje selecta na "aktivan" bez slanja na backend
    setKorisnici((prev) =>
      prev.map((k) =>
        k.id === suspendModal.korisnik.id
          ? { ...k, statusKorisnika: "aktivan" }
          : k
      )
    );
    setSuspendModal(null);
  };

  // Dodaj filtrirane korisnike prema search-u
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
            style={{
              width: "100%",
              maxWidth: 340,
              marginBottom: 24,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #b91d95",
              background: "#181818",
              color: "#fff",
              fontSize: "1.08rem"
            }}
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
                        <td>
                          <img
                            src={k.putanjaProfilneSlike || "/logo.gif"}
                            alt={k.korisnicko_ime}
                            className={styles.profileImg}
                          />
                        </td>
                        <td>{k.korisnicko_ime}</td>
                        <td>{k.email}</td>
                        <td>
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
                        <td>
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
                        <td>{k.ime}</td>
                        <td>{k.prezime}</td>
                        <td>
                          {prijava ? (
                            <button
                              style={{
                                background: "#b91d95",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "6px 14px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              onClick={() => setPrijavaModal({ korisnikID: k.id, prijava })}
                            >
                              {t("show_application") || "Prikaži prijavu"}
                            </button>
                          ) : (
                            <span style={{ color: "#b3b3b3" }}>{t("no_application") || "Nema"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Modal za prikaz prijave */}
              {prijavaModal && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(24,24,24,0.85)",
                    zIndex: 3000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => setPrijavaModal(null)}
                >
                  <div
                    style={{
                      background: "#232323",
                      borderRadius: 14,
                      padding: "32px 24px 24px 24px",
                      minWidth: 320,
                      maxWidth: 480,
                      boxShadow: "0 4px 24px #b91d9533",
                      textAlign: "left",
                      color: "#fff",
                      position: "relative",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <h4 style={{ marginTop: 0 }}>{t("artist_application")}</h4>
                    <div style={{ marginBottom: 12 }}>
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
                    <div style={{ marginBottom: 12 }}>
                      <b>{t("message") || "Poruka"}:</b>
                      <div style={{
                        background: "#181818",
                        borderRadius: 6,
                        padding: 12,
                        marginTop: 4,
                        whiteSpace: "pre-wrap",
                        maxHeight: 200,
                        overflowY: "auto"
                      }}>
                        {prijavaModal.prijava.poruka}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <b>{t("date") || "Datum"}:</b> {prijavaModal.prijava.datum ? new Date(prijavaModal.prijava.datum).toLocaleString() : ""}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        style={{
                          background: "#e754a2",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "7px 18px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
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
                      <button
                        style={{
                          background: "#444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "7px 18px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        onClick={() => setPrijavaModal(null)}
                      >
                        {t("close")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Modal za suspenziju korisnika */}
              {suspendModal && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(24,24,24,0.85)",
                    zIndex: 4000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={handlePrekiniSuspenziju}
                >
                  <div
                    style={{
                      background: "#232323",
                      borderRadius: 14,
                      padding: "32px 24px 24px 24px",
                      minWidth: 320,
                      maxWidth: 480,
                      boxShadow: "0 4px 24px #b91d9533",
                      textAlign: "left",
                      color: "#fff",
                      position: "relative",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <h4 style={{ marginTop: 0 }}>{t("suspend_user") || "Suspenduj korisnika"}</h4>
                    <div style={{ marginBottom: 12 }}>
                      <b>{t("user")}:</b> {suspendModal.korisnik.korisnicko_ime}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label>
                        {t("suspension_reason") || "Poruka za korisnika (razlog suspenzije)"}:
                        <textarea
                          style={{
                            width: "100%",
                            minHeight: 60,
                            marginTop: 6,
                            borderRadius: 6,
                            border: "1px solid #b91d95",
                            background: "#181818",
                            color: "#fff",
                            padding: 8,
                            marginBottom: 8,
                          }}
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
                    <div style={{ marginBottom: 18 }}>
                      <label>
                        {t("suspension_until") || "Trajanje suspenzije (do kada, ISO format ili YYYY-MM-DDTHH:mm)"}:
                        <input
                          type="datetime-local"
                          style={{
                            width: "100%",
                            borderRadius: 6,
                            border: "1px solid #b91d95",
                            background: "#181818",
                            color: "#fff",
                            padding: 8,
                            marginTop: 6,
                          }}
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
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        style={{
                          background: "#e754a2",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "7px 18px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          await handlePotvrdiSuspenziju();
                        }}
                      >
                        {t("confirm_suspension") || "Potvrdi suspenziju"}
                      </button>
                      <button
                        style={{
                          background: "#444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "7px 18px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
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
