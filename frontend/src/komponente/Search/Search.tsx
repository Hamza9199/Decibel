import React, { useState, useRef, useEffect } from "react";
import styles from "./Search.module.css";
import axios from "axios";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Album, Korisnik, Pjesma, Playlista } from "../../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

type SearchResult = {
  izvodjaci: Korisnik[];
  pjesme: Pjesma[];
  albumi: Album[];
  playliste: Playlista[];
};

const Search: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    izvodjaci: [],
    pjesme: [],
    albumi: [],
    playliste: [],
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ izvodjaci: [], pjesme: [], albumi: [], playliste: [] });
      return;
    }
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/korisnici/`).then(res =>
        (res.data || []).filter((k: Korisnik) =>
          k.rola === "izvodac" &&
          (k.korisnicko_ime?.toLowerCase().includes(query.toLowerCase()) ||
            k.ime?.toLowerCase().includes(query.toLowerCase()) ||
            k.prezime?.toLowerCase().includes(query.toLowerCase()))
        )
      ),
      axios.get(`${API_BASE}/pjesme/`).then(res =>
        (res.data || []).filter((p: Pjesma) =>
          p.naziv?.toLowerCase().includes(query.toLowerCase())
        )
      ),
      axios.get(`${API_BASE}/albumi/`).then(res =>
        (res.data || []).filter((a: Album) =>
          a.naziv?.toLowerCase().includes(query.toLowerCase())
        )
      ),
      axios.get(`${API_BASE}/playliste/`).then(res =>
        (res.data || []).filter((pl: Playlista) =>
          pl.naziv?.toLowerCase().includes(query.toLowerCase())
        )
      ),
    ])
      .then(([izvodjaci, pjesme, albumi, playliste]) => {
        setResults({ izvodjaci, pjesme, albumi, playliste });
        setShowDropdown(true);
      })
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  useEffect(() => {
    if (isMobile && showDropdown) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, showDropdown]);

  return (
    <div className={styles.searchWrap}>
      <input
        ref={inputRef}
        className={styles.searchInput}
        type="text"
        placeholder={t("search_artists") + ", " + t("songs") + "..."
        }
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => query && setShowDropdown(true)}
        autoComplete="off"
        {...(isMobile ? { inputMode: "search" } : {})}
      />
      <span className={styles.searchIcon}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#b91d95" strokeWidth="2"/>
          <line x1="16" y1="16" x2="21" y2="21" stroke="#b91d95" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
      {showDropdown && (query.trim() || loading) && (
        <div className={styles.dropdown} ref={dropdownRef}>
          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : (
            <>
              {results.izvodjaci.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("artists")}</div>
                  {results.izvodjaci.map((k: Korisnik) => (
                    <Link
                      key={k.id}
                      to={`/izvodjac/${k.id}`}
                      className={styles.resultRow}
                      style={{ textDecoration: "none" }}
                    >
                      <img
                        src={k.putanjaProfilneSlike || "/logo.gif"}
                        alt={k.korisnicko_ime}
                        className={styles.resultImg}
                      />
                      <span>{k.korisnicko_ime}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.pjesme.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("songs")}</div>
                  {results.pjesme.map((p: Pjesma) => (
                    <Link
                      key={p.id}
                      to={`/pjesma/${p.id}`}
                      className={styles.resultRow}
                      style={{ textDecoration: "none" }}
                    >
                      <img
                        src={p.putanjaSlika || "/logo.gif"}
                        alt={p.naziv}
                        className={styles.resultImg}
                      />
                      <span>{p.naziv}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.albumi.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("albums")}</div>
                  {results.albumi.map((a: Album) => (
                    <Link
                      key={a.id}
                      to={`/album/${a.id}`}
                      className={styles.resultRow}
                      style={{ textDecoration: "none" }}
                    >
                      <img
                        src={a.putanjaSlika || "/logo.gif"}
                        alt={a.naziv}
                        className={styles.resultImg}
                      />
                      <span>{a.naziv}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.playliste.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("playlists")}</div>
                  {results.playliste.map((pl: Playlista) => (
                    <Link
                      key={pl.id}
                      to={`/playlista/${pl.id}`}
                      className={styles.resultRow}
                      style={{ textDecoration: "none" }}
                    >
                      <img
                        src={pl.putanjaSlika || "/logo.gif"}
                        alt={pl.naziv}
                        className={styles.resultImg}
                      />
                      <span>{pl.naziv}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.izvodjaci.length === 0 &&
                results.pjesme.length === 0 &&
                results.albumi.length === 0 &&
                results.playliste.length === 0 && (
                  <div className={styles.noResults}>{t("no_data") || "Nema rezultata."}</div>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;