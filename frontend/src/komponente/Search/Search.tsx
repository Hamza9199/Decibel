import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
// import styles from "./Search.module.css";
import axios from "axios";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Album, Korisnik, Pjesma, Playlista } from "../../types";
import { useQuery } from "@tanstack/react-query";
import Loading from "../Loading/Loading";

type Styles = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

type SearchResult = {
  izvodjaci: Korisnik[];
  pjesme: Pjesma[];
  albumi: Album[];
  playliste: Playlista[];
};

const withTimeout = <T,>(p: Promise<T>, ms = 10000) =>
  new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(id);
      resolve(v);
    }).catch((e) => {
      clearTimeout(id);
      reject(e);
    });
  });

const Search: React.FC = () => {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [styles, setStyles] = useState<Styles>({});
  const [cssReady, setCssReady] = useState(false);
  const [cssDelayDone, setCssDelayDone] = useState(false);

  useEffect(() => {
    const loadThemeStyles = async (theme?: string) => {
      const current = theme || localStorage.getItem("decibel_tema") || "dark";
      if (current === "light") {
        const mod = await import("./SearchWhite.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      } else {
        const mod = await import("./Search.module.css");
        setStyles(mod.default || (mod as unknown as Styles));
      }
      setCssReady(true);
    };
    setCssReady(false);
    loadThemeStyles();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "decibel_tema") {
        setCssReady(false);
        setCssDelayDone(false);
        loadThemeStyles(e.newValue || undefined);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!cssReady) { setCssDelayDone(false); return; }
    const t = setTimeout(() => setCssDelayDone(true), 1000);
    return () => clearTimeout(t);
  }, [cssReady]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(normalizedQuery), 200);
    return () => clearTimeout(id);
  }, [normalizedQuery]);

  const { data, isFetching } = useQuery<SearchResult>({
    queryKey: ["search", debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: async ({ signal }) => {
      const reqConfig = { signal, timeout: 10000 } as const;
      const [korisniciRes, pjesmeRes, albumiRes, playlisteRes] = await withTimeout(
        Promise.all([
          axios.get(`${API_BASE}/korisnici/`, reqConfig),
          axios.get(`${API_BASE}/pjesme/`, reqConfig),
          axios.get(`${API_BASE}/albumi/`, reqConfig),
          axios.get(`${API_BASE}/playliste/`, reqConfig),
        ]),
        10000
      );
      const izvodjaci: Korisnik[] = (korisniciRes.data || []).filter((k: Korisnik) =>
        k.rola === "izvodac" && (
          k.korisnicko_ime?.toLowerCase().includes(debouncedQuery) ||
          k.ime?.toLowerCase().includes(debouncedQuery) ||
          k.prezime?.toLowerCase().includes(debouncedQuery)
        )
      );
      const pjesme: Pjesma[] = (pjesmeRes.data || []).filter((p: Pjesma) =>
        p.naziv?.toLowerCase().includes(debouncedQuery)
      );
      const albumi: Album[] = (albumiRes.data || []).filter((a: Album) =>
        a.naziv?.toLowerCase().includes(debouncedQuery)
      );
      const playliste: Playlista[] = (playlisteRes.data || []).filter((pl: Playlista) =>
        pl.naziv?.toLowerCase().includes(debouncedQuery)
      );
      return { izvodjaci, pjesme, albumi, playliste };
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const results = useMemo<SearchResult>(() => data || { izvodjaci: [], pjesme: [], albumi: [], playliste: [] }, [data]);

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

  const placeholder = useMemo(() => `${t("search_artists")}, ${t("songs")}...`, [t]);
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length > 0) setShowDropdown(true);
  }, []);
  const onFocus = useCallback(() => normalizedQuery && setShowDropdown(true), [normalizedQuery]);

  if (!cssReady || !cssDelayDone) return <Loading />;

  return (
    <div className={styles.searchWrap}>
      <input
        ref={inputRef}
        className={styles.searchInput}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={onChange}
        onFocus={onFocus}
        autoComplete="off"
        {...(isMobile ? { inputMode: "search" } : {})}
      />
      <span className={styles.searchIcon}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#b91d95" strokeWidth="2" />
          <line x1="16" y1="16" x2="21" y2="21" stroke="#b91d95" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      {showDropdown && (debouncedQuery || isFetching) && (
        <div className={styles.dropdown} ref={dropdownRef}>
          {isFetching ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : (
            <>
              {results.izvodjaci.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("artists")}</div>
                  {results.izvodjaci.map((k: Korisnik) => (
                    <Link key={k.id} to={`/izvodjac/${k.id}`} className={styles.resultRow} style={{ textDecoration: "none" }}>
                      <img src={k.putanjaProfilneSlike || "/logo.gif"} alt={k.korisnicko_ime} className={styles.resultImg} />
                      <span>{k.korisnicko_ime}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.pjesme.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("songs")}</div>
                  {results.pjesme.map((p: Pjesma) => (
                    <Link key={p.id} to={`/pjesma/${p.id}`} className={styles.resultRow} style={{ textDecoration: "none" }}>
                      <img src={p.putanjaSlika || "/logo.gif"} alt={p.naziv} className={styles.resultImg} />
                      <span>{p.naziv}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.albumi.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("albums")}</div>
                  {results.albumi.map((a: Album) => (
                    <Link key={a.id} to={`/album/${a.id}`} className={styles.resultRow} style={{ textDecoration: "none" }}>
                      <img src={a.putanjaSlika || "/logo.gif"} alt={a.naziv} className={styles.resultImg} />
                      <span>{a.naziv}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.playliste.length > 0 && (
                <div>
                  <div className={styles.sectionTitle}>{t("playlists")}</div>
                  {results.playliste.map((pl: Playlista) => (
                    <Link key={pl.id} to={`/playlista/${pl.id}`} className={styles.resultRow} style={{ textDecoration: "none" }}>
                      <img src={pl.putanjaSlika || "/logo.gif"} alt={pl.naziv} className={styles.resultImg} />
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

export default memo(Search);