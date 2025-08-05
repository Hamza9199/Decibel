import React, { useEffect, useState } from "react";
import styles from "./NovaPretplata.module.css";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../komponente/Header/Header";
import Footer from "../../komponente/Footer/Footer";
import Sidebar from "../../komponente/Sidebar/Sidebar";
import Loading from "../../komponente/Loading/Loading";
import type { Pretplata } from "../../types";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const NovaPretplata: React.FC = () => {
  const { pretplataId } = useParams<{ pretplataId: string }>();
  const { t } = useTranslation();

  const [pretplata, setPretplata] = useState<Pretplata | null>(null);
  const [loading, setLoading] = useState(true);
  const [kupovinaLoading, setKupovinaLoading] = useState(false);
  const [kupovinaError, setKupovinaError] = useState<string | null>(null);
  const [kupovinaSuccess, setKupovinaSuccess] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardType, setCardType] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const detectCardType = (number: string): string => {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.match(/^4/)) return "visa";
    if (cleaned.match(/^5[1-5]/) || cleaned.match(/^2[2-7]/)) return "mastercard";
    if (cleaned.match(/^3[47]/)) return "amex";
    if (cleaned.match(/^6/)) return "discover";
    return "";
  };

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})/);
    if (!match) return cleaned;
    return [match[1], match[2], match[3], match[4]].filter(Boolean).join(" ");
  };

 

 

  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Generate next 10 years of months
    for (let year = currentYear; year <= currentYear + 10; year++) {
      const startMonth = year === currentYear ? currentMonth : 1;
      for (let month = startMonth; month <= 12; month++) {
        const monthName = new Date(year, month - 1).toLocaleDateString('bs-BA', { month: 'long' });
        months.push({
          value: `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`,
          label: `${monthName} ${year}`
        });
      }
    }
    return months;
  };

  const handleDatePickerSelect = (value: string) => {
    setCardExp(value);
    setShowDatePicker(false);
  };

  function validateCard() {
    const cleaned = cardNumber.replace(/\s/g, "");
    if (!cleaned.match(/^\d{16}$/)) return t("card_number_invalid") || "Broj kartice mora imati 16 cifara.";
    if (!cardName.trim()) return t("card_name_required") || "Ime na kartici je obavezno.";
    if (!cardExp.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) return t("card_exp_invalid") || "Datum isteka mora biti MM/YY.";
    
    // Check if expiration date is in the future
    const [month, year] = cardExp.split("/").map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return t("card_expired") || "Kartica je istekla.";
    }
    
    if (!cardCvc.match(/^\d{3,4}$/)) return t("card_cvc_invalid") || "CVC mora imati 3 ili 4 cifre.";
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
            <div className={styles.error}>{t("subscription_not_found") || "Pretplata nije pronađena."}</div>
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
          <h2 className={styles.title}>
            {t("buy_subscription")}: {pretplata.naziv}
          </h2>
          <div className={styles.kupovinaDetalji}>
            <div>
              <b>{t("price") || "Cijena"}:</b> {pretplata.cijena} KM / mj
            </div>
            <div>
              <b>{t("description") || "Opis"}:</b> {pretplata.opis}
            </div>
          </div>
          <form className={styles.karticaForm} onSubmit={handlePotvrdiKupovinu} autoComplete="off">
            <div className={styles.cardContainer}>
              <div className={styles.cardPreview}>
                <div className={styles.cardType}>
                  {cardType && (
                    <img 
                      src={`/card-icons/${cardType}.svg`} 
                      alt={cardType} 
                      className={styles.cardIcon}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  {!cardType && cardNumber && <div className={styles.unknownCard}>💳</div>}
                </div>
                <div className={styles.cardNumber}>
                  {formatCardNumber(cardNumber) || "•••• •••• •••• ••••"}
                </div>
                <div className={styles.cardDetails}>
                  <div className={styles.cardName}>
                    {cardName || t("card_name_placeholder") || "VAŠE IME"}
                  </div>
                  <div className={styles.cardExp}>
                    {cardExp || "MM/YY"}
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="cardNumber">
                {t("card_number") || "Broj kartice"}
              </label>
              <input
                id="cardNumber"
                type="text"
                maxLength={19}
                inputMode="numeric"
                value={formatCardNumber(cardNumber)}
                onChange={e => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  if (cleaned.length <= 16) {
                    setCardNumber(cleaned);
                    setCardType(detectCardType(cleaned));
                  }
                }}
                placeholder="1234 5678 9012 3456"
                className={cardType ? `${styles.input} ${styles[cardType]}` : styles.input}
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="cardName">
                {t("card_name") || "Ime na kartici"}
              </label>
              <input
                id="cardName"
                type="text"
                value={cardName}
                onChange={e => setCardName(e.target.value.toUpperCase())}
                placeholder={t("card_name_placeholder") || "VAŠE IME I PREZIME"}
                className={styles.input}
                required
              />
            </div>
            
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label htmlFor="cardExp">
                  {t("card_exp") || "Datum isteka"}
                </label>
                <div className={styles.datePickerContainer}>
                  <input
                    id="cardExp"
                    type="text"
                    value={cardExp || ""}
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    onChange={() => {}} // Prevent manual typing
                    placeholder="MM/YY"
                    className={styles.input}
                    readOnly
                    required
                  />
                  <div className={styles.calendarIcon} onClick={() => setShowDatePicker(!showDatePicker)}>
                    📅
                  </div>
                  {showDatePicker && (
                    <div className={styles.datePickerDropdown}>
                      <div className={styles.datePickerHeader}>
                        <span>{t("select_expiry") || "Izaberite datum isteka"}</span>
                        <button 
                          type="button" 
                          className={styles.closeBtn}
                          onClick={() => setShowDatePicker(false)}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.monthsList}>
                        {getMonthOptions().map((option) => (
                          <div
                            key={option.value}
                            className={`${styles.monthOption} ${cardExp === option.value ? styles.selected : ''}`}
                            onClick={() => handleDatePickerSelect(option.value)}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="cardCvc">
                  {t("card_cvc") || "CVC"}
                </label>
                <input
                  id="cardCvc"
                  type="text"
                  maxLength={4}
                  inputMode="numeric"
                  value={cardCvc}
                  onChange={e => setCardCvc(e.target.value.replace(/\D/g, ""))}
                  placeholder="123"
                  className={styles.input}
                  required
                />
              </div>
            </div>
            
            {kupovinaError && <div className={styles.error}>{kupovinaError}</div>}
            {kupovinaSuccess && <div className={styles.success}>{kupovinaSuccess}</div>}
            
            <div className={styles.buttonGroup}>
              <button
                className={styles.kupiBtn}
                type="submit"
                disabled={kupovinaLoading}
              >
                {kupovinaLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    {t("buying") || "Kupujem..."}
                  </>
                ) : (
                  <>
                    🔒 {t("confirm_purchase") || "Potvrdi kupovinu"}
                  </>
                )}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => navigate("/pretplata")}
              >
                {t("cancel") || "Odustani"}
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
