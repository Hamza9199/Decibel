import React from "react";
import styles from "./Sidebar.module.css";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Role = "korisnik" | "izvodac" | "admin";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userStr = localStorage.getItem("korisnik");
  let role: Role = "korisnik";
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      role = user.rola;
    } catch {
        role = "korisnik";
    }
  }

  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
const [showPlaylistMenu, setShowPlaylistMenu] = React.useState(false);
const [showSongsMenu, setShowSongsMenu] = React.useState(false);
const [showAlbumsMenu, setShowAlbumsMenu] = React.useState(false);
const [showFavoritesMenu, setShowFavoritesMenu] = React.useState(false);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoWrap}>
        <Link to="/">
          <img src="/logo.gif" alt="Decibel logo" className={styles.logoImg} />
        </Link>
        <Link to="/">
          <span className={styles.logoText}>Decibel</span>
        </Link>
      </div>
      <nav className={styles.nav}>
        <button className={styles.navBtn} onClick={() => navigate("/")}>
          {/* Home icon */}
          <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
            <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
              <path d="M3 12L12 4l9 8v7a2 2 0 0 1-2 2h-3v-5h-6v5H5a2 2 0 0 1-2-2z" />
            </svg>
          </span>
          {t("home") || "Početna"}
        </button>
        <div className={styles.profileMenu}>
          <button
            className={styles.navBtn}
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            {/* Profile icon */}
            <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
              <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 16-4 16 0" />
              </svg>
            </span>
            {t("profile")}
          </button>
          {showProfileMenu && (
            <div className={styles.subMenu}>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/profile/settings")}
              >
                {/* Settings icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="18" height="18" fill="#b91d95" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.36.36.58.86.6 1.39V9a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                {t("settings")}
              </button>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/profile/edit")}
              >
                {/* Edit icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="18" height="18" fill="#b91d95" viewBox="0 0 24 24">
                    <path d="M12.3 6.7l5 5L7 22H2v-5l10.3-10.3z" />
                    <path d="M18.4 2.6a2 2 0 0 1 2.8 2.8l-2 2-2.8-2.8 2-2z" />
                  </svg>
                </span>
                {t("edit_profile")}
              </button>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/profile/subscription")}
              >
                {/* Subscription icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="18" height="18" fill="#b91d95" viewBox="0 0 24 24">
                    <rect x="2" y="7" width="20" height="14" rx="4" />
                    <path d="M16 3v4" />
                    <path d="M8 3v4" />
                  </svg>
                </span>
                {t("subscription")}
              </button>
            </div>
          )}
        </div>
        <div className={styles.profileMenu}>
          <button
            className={styles.navBtn}
            onClick={() => navigate("/historija")}
          >
            <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
              <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                <rect x="3" y="6" width="18" height="2" rx="1" />
                <rect x="3" y="10" width="14" height="2" rx="1" />
                <rect x="3" y="14" width="10" height="2" rx="1" />
              </svg>
            </span>
            {t("history")}
          </button>
        </div>
        <div className={styles.profileMenu}>
          <button
            className={styles.navBtn}
            onClick={() => setShowFavoritesMenu((prev) => !prev)}
          >
            <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
              <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
            {t("favorites")}
          </button>
          {showFavoritesMenu && (
            <div className={styles.subMenu}>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/omiljene/pjesme")}
              >
                {/* Music note icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                    <path d="M9 17V5l12-2v12" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </span>
                {t("songs")}
              </button>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/omiljene/playliste")}
              >
                {/* Playlist icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                    <rect x="4" y="6" width="16" height="2" rx="1" />
                    <rect x="4" y="10" width="16" height="2" rx="1" />
                    <rect x="4" y="14" width="16" height="2" rx="1" />
                    <circle cx="19" cy="15" r="3" />
                  </svg>
                </span>
                {t("playlists")}
              </button>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/omiljene/albumi")}
              >
                {/* Album icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </span>
                {t("albums")}
              </button>
            </div>
          )}
        </div>
        <div className={styles.profileMenu}>
          <button
            className={styles.navBtn}
            onClick={() => setShowPlaylistMenu((prev) => !prev)}
          >
            {/* Playlist icon */}
            <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
              <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                <rect x="3" y="6" width="18" height="2" rx="1" />
                <rect x="3" y="10" width="14" height="2" rx="1" />
                <rect x="3" y="14" width="10" height="2" rx="1" />
                <circle cx="19" cy="15" r="3" />
              </svg>
            </span>
            {t("playlists")}
          </button>
          {showPlaylistMenu && (
            <div className={styles.subMenu}>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/playlists")}
              >
                {/* List icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                    <rect x="4" y="6" width="16" height="2" rx="1" />
                    <rect x="4" y="10" width="16" height="2" rx="1" />
                    <rect x="4" y="14" width="16" height="2" rx="1" />
                  </svg>
                </span>
                {t("all_playlists") || "Sve playliste"}
              </button>
              <button
                className={styles.subNavBtn}
                onClick={() => navigate("/playlists/add")}
              >
                {/* Add icon */}
                <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                    <rect x="4" y="11" width="16" height="2" rx="1" />
                    <rect x="11" y="4" width="2" height="16" rx="1" />
                  </svg>
                </span>
                {t("create_playlist")}
              </button>
            </div>
          )}
        </div>
        

        {(role === "izvodac" || role === "admin") && (
          <>
            <div className={styles.sectionTitle}>{t("artists")}</div>
            <div className={styles.profileMenu}>
              <button
                className={styles.navBtn}
                onClick={() => setShowSongsMenu((prev) => !prev)}
              >
                {/* Music note icon */}
                <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                    <path d="M9 17V5l12-2v12" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </span>
                {t("songs")}
              </button>
              {showSongsMenu && (
                <div className={styles.subMenu}>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/songs")}
                  >
                    {/* List icon */}
                    <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                      <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                        <rect x="4" y="6" width="16" height="2" rx="1" />
                        <rect x="4" y="10" width="16" height="2" rx="1" />
                        <rect x="4" y="14" width="16" height="2" rx="1" />
                      </svg>
                    </span>
                    {t("all_songs") || "Sve pjesme"}
                  </button>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/add-song")}
                  >
                    {/* Add icon */}
                    <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                      <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                        <rect x="4" y="11" width="16" height="2" rx="1" />
                        <rect x="11" y="4" width="2" height="16" rx="1" />
                      </svg>
                    </span>
                    {t("new_song") || "Nova pjesma"}
                  </button>
                </div>
              )}
            </div>
            <div className={styles.profileMenu}>
              <button
                className={styles.navBtn}
                onClick={() => setShowAlbumsMenu((prev) => !prev)}
              >
                {/* Album icon */}
                <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
                  <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </span>
                {t("albums")}
              </button>
              {showAlbumsMenu && (
                <div className={styles.subMenu}>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/albums")}
                  >
                    {/* List icon */}
                    <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                      <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                        <rect x="4" y="6" width="16" height="2" rx="1" />
                        <rect x="4" y="10" width="16" height="2" rx="1" />
                        <rect x="4" y="14" width="16" height="2" rx="1" />
                      </svg>
                    </span>
                    {t("all_albums") || "Svi albumi"}
                  </button>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/add-album")}
                  >
                    {/* Add icon */}
                    <span style={{ marginRight: 8, display: "inline-flex", verticalAlign: "middle" }}>
                      <svg width="16" height="16" fill="#b91d95" viewBox="0 0 24 24">
                        <rect x="4" y="11" width="16" height="2" rx="1" />
                        <rect x="11" y="4" width="2" height="16" rx="1" />
                      </svg>
                    </span>
                    {t("new_album") || "Novi album"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {role === "admin" && (
          <>
            <div className={styles.sectionTitle}>Admin</div>
            <button className={styles.navBtn} onClick={() => navigate("/admin-panel")}>
              {/* Admin panel icon */}
              <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
                <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </span>
              {t("admin_panel")}
            </button>
            <button className={styles.navBtn} onClick={() => navigate("/statistika")}>
              {/* Stats icon */}
              <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
                <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                  <rect x="3" y="12" width="4" height="8" rx="1" />
                  <rect x="9" y="8" width="4" height="12" rx="1" />
                  <rect x="15" y="4" width="4" height="16" rx="1" />
                </svg>
              </span>
              {t("statistic")}
            </button>
            <button className={styles.navBtn} onClick={() => navigate("/korisnici")}>
              {/* Users icon */}
              <span style={{ marginRight: 10, display: "inline-flex", verticalAlign: "middle" }}>
                <svg width="22" height="22" fill="#ffe6ec" viewBox="0 0 24 24">
                  <circle cx="9" cy="7" r="4" />
                  <circle cx="17" cy="17" r="3" />
                  <path d="M17 14v-1a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v1" />
                  <path d="M17 20v-1a3 3 0 0 0-3-3h-2" />
                </svg>
              </span>
              {t("all_users") || "Svi korisnici"}
            </button>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
