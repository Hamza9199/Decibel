import React, { useEffect, useState } from "react";
import styles from "./NovaPretplata.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Loading from "../../komponente/Loading/Loading";
import type { Pretplata } from "../../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NovaPretplata: React.FC = () => {
const { pretplataId } = useParams<{ pretplataId: string }>();

  const [pretplata, setPretplata] = useState<Pretplata | null>(null);
  const [loading, setLoading] = useState(true);
  const [kupovinaLoading, setKupovinaLoading] = useState(false);
  const [kupovinaError, setKupovinaError] = useState<string | null>(null);
  const [kupovinaSuccess, setKupovinaSuccess] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const navigate = useNavigate();

  let korisnikID = "";
  try {
    const user = JSON.parse(localStorage.getItem("korisnik") || "");
    korisnikID = user?.id || "";
  } catch {
    korisnikID = "";
  }

  useEffect(() => {
    if (!pretplataId) {
      setLoading(false);
      setPretplata(null);
      return;
    }
    setLoading(true);
    axios
      .get(`${API_BASE}/pretplate/${pretplataId}`)
      .then((res) => setPretplata(res.data))
      .catch(() => setPretplata(null))
      .finally(() => setLoading(false));
  }, [pretplataId]);

  function validateCard() {
    if (!cardNumber.match(/^\d{16}$/)) return "Broj kartice mora imati 16 cifara.";
    if (!cardName.trim()) return "Ime na kartici je obavezno.";
    if (!cardExp.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) return "Datum isteka mora biti MM/YY.";
    if (!cardCvc.match(/^\d{3,4}$/)) return "CVC mora imati 3 ili 4 cifre.";
    return null;
  }

  const handlePotvrdiKupovinu = async (e: React.FormEvent) => {
    e.preventDefault();
    setKupovinaError(null);
    setKupovinaSuccess(null);
    const err = validateCard();
    if (err) {
      setKupovinaError(err);
      return;
    }
    setKupovinaLoading(true);
    try {
      console.log("Kupovina payload:", {
        korisnikID,
        pretplataID: pretplata?.id,
        pretplataStatus: "aktivna",
      });
      await axios.post(`${API_BASE}/korisnik_pretplata/`, {
        korisnikID,
        pretplataID: pretplata?.id,
        pretplataStatus: "aktivna",
      });
      setKupovinaSuccess("Pretplata je uspješno kupljena!");

      setTimeout(() => window.location.href = "/pretplata", 1500);
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error) && error.response
        ? error.response.data.detail || "Greška pri kupovini pretplate."
        : "Greška pri kupovini pretplate.";
      setKupovinaError(errorMessage);
    } finally {
      setKupovinaLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!pretplata)
    return (
      <>
        <Header />
        <Sidebar />
        <div className={styles.novaPretplataBg}>
          <div className={styles.container}>
            <div className={styles.error}>Pretplata nije pronađena.</div>
          </div>
        </div>
        <Footer />
      </>
    );

  return (
    <>
      <Header />
      <Sidebar />
      <div className={styles.novaPretplataBg}>
        <div className={styles.container}>
          <h2 className={styles.title}>Kupovina pretplate: {pretplata.naziv}</h2>
          <div className={styles.kupovinaDetalji}>
            <div>
              <b>Cijena:</b> {pretplata.cijena} KM / mj
            </div>
            <div>
              <b>Opis:</b> {pretplata.opis}
            </div>
          </div>
          <form className={styles.karticaForm} onSubmit={handlePotvrdiKupovinu} autoComplete="off">
            <label>
              Broj kartice
              <input
                type="text"
                maxLength={16}
                inputMode="numeric"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="1234 5678 9012 3456"
                required
              />
            </label>
            <label>
              Ime na kartici
              <input
                type="text"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                placeholder="IME I PREZIME"
                required
              />
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ flex: 1 }}>
                Istek (MM/YY)
                <input
                  type="text"
                  maxLength={5}
                  value={cardExp}
                  onChange={e => setCardExp(e.target.value)}
                  placeholder="MM/YY"
                  required
                />
              </label>
              <label style={{ flex: 1 }}>
                CVC
                <input
                  type="text"
                  maxLength={4}
                  inputMode="numeric"
                  value={cardCvc}
                  onChange={e => setCardCvc(e.target.value.replace(/\D/g, ""))}
                  placeholder="123"
                  required
                />
              </label>
            </div>
            {kupovinaError && <div className={styles.error}>{kupovinaError}</div>}
            {kupovinaSuccess && <div className={styles.success}>{kupovinaSuccess}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button
                className={styles.kupiBtn}
                type="submit"
                disabled={kupovinaLoading}
              >
                {kupovinaLoading ? "Kupujem..." : "Potvrdi kupovinu"}
              </button>
              <button
                type="button"
                className={styles.kupiBtn}
                style={{ background: "#232323", color: "#ffe6ec", border: "1px solid #b91d95" }}
                onClick={() => navigate("/pretplata")}
              >
                Odustani
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default NovaPretplata;
