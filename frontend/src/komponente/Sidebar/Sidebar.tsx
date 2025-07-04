import React from "react";
import styles from "./Sidebar.module.css";
import { useNavigate } from "react-router-dom";

type Role = "korisnik" | "izvodac" | "admin";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
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

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoWrap}>
        <img src="/logo.gif" alt="Decibel logo" className={styles.logoImg} />
        <span className={styles.logoText}>Decibel</span>
      </div>
      <nav className={styles.nav}>

<button className={styles.navBtn} onClick={() => navigate("/")}>
          Početna
        </button>
        <div className={styles.profileMenu}>
          <button
            className={styles.navBtn}
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            Profil
          </button>
          {showProfileMenu && (
            <div className={styles.subMenu}>
              <button
            className={styles.subNavBtn}
            onClick={() => navigate("/profile/settings")}
              >
            Postavke
              </button>
              <button
            className={styles.subNavBtn}
            onClick={() => navigate("/profile/edit")}
              >
            Uredi profil
              </button>
              <button
            className={styles.subNavBtn}
            onClick={() => navigate("/profile/subscription")}
              >
            Pretplata
              </button>
            </div>
          )}
        </div>
        <div className={styles.profileMenu}>
          <button
            className={styles.navBtn}
            onClick={() => setShowPlaylistMenu((prev) => !prev)}
          >
            Playliste
          </button>
          {showPlaylistMenu && (
            <div className={styles.subMenu}>
              <button
            className={styles.subNavBtn}
            onClick={() => navigate("/playlists")}
              >
            Sve playliste
              </button>
              <button
            className={styles.subNavBtn}
            onClick={() => navigate("/playlists/add")}
              >
            Dodaj playlistu
              </button>
            </div>
          )}
        </div>
        

        {(role === "izvodac" || role === "admin") && (
          <>
            <div className={styles.sectionTitle}>Izvođač</div>
            <div className={styles.profileMenu}>
              <button
                className={styles.navBtn}
                onClick={() => setShowSongsMenu((prev) => !prev)}
              >
                Pjesme
              </button>
              {showSongsMenu && (
                <div className={styles.subMenu}>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/songs")}
                  >
                    Sve pjesme
                  </button>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/add-song")}
                  >
                    Nova pjesma
                  </button>
                </div>
              )}
            </div>
            <div className={styles.profileMenu}>
              <button
                className={styles.navBtn}
                onClick={() => setShowAlbumsMenu((prev) => !prev)}
              >
                Albumi
              </button>
              {showAlbumsMenu && (
                <div className={styles.subMenu}>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/albums")}
                  >
                    Svi albumi
                  </button>
                  <button
                    className={styles.subNavBtn}
                    onClick={() => navigate("/add-album")}
                  >
                    Novi album
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
              Admin panel
            </button>
            <button className={styles.navBtn} onClick={() => navigate("/statistika")}>
              Statistika
            </button>
            <button className={styles.navBtn} onClick={() => navigate("/korisnici")}>
              Svi korisnici
            </button>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
