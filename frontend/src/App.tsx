import './App.css';
import { FC, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './stranice/Home/Home';
import Login from './stranice/Login/Login';
import Register from './stranice/Register/Register';
import AudioPlayer from './komponente/AudioPlayer/AudioPlayer';
import NovaPjesma from './stranice/NovaPjesma/NovaPjesma';
import SvePjesme from './stranice/SvePjesme/SvePjesme';
import SvePlayliste from './stranice/SvePlayliste/SvePlayliste';
import SviAlbumi from './stranice/SviAlbumi/SviAlbumi';
import NovaPlaylista from './stranice/NovaPlaylista/NovaPlaylista';
import NoviAlbum from './stranice/NoviAlbum/NoviAlbum';
import Postavke from './stranice/Postavke/Postavke';
import UrediProfil from './stranice/UrediProfil/UrediProfil';
import Pretplata from './stranice/Pretplata/Pretplata';
import SviKorisnici from './stranice/SviKorisnici/SviKorisnici';
import AdminPanel from './stranice/AdminPanel/AdminPanel';
import Statistika from './stranice/Statistika/Statisitka';
import Pjesma from './stranice/Pjesma/Pjesma';
import Album from './stranice/Album/Album';
import Playlista from './stranice/Playlista/Playlista';
import Izvodjac from './stranice/Izvodjac/Izvodjac';
import UrediPjesmu from './stranice/UrediPjesmu/UrediPjesmu';
import UrediAlbum from './stranice/UrediAlbum/UrediAlbum';
import UrediPlaylistu from './stranice/UrediPlaylistu/UrediPlaylistu';
import NovaPretplata from './stranice/NovaPretplata/NovaPretplata';
import Historija from './stranice/Historija/Historija';
import Omiljeno from './stranice/Omiljeno/Omiljeno';
import axios from "axios";
import { useCallback } from 'react';
import Zahtjevi from './stranice/Zahtjevi/Zahtjevi';
import Download from './stranice/Download/Download';
import DiscordLink from './stranice/DiscordLink/DiscordLink';
import NotFound from './stranice/404/404';
import PrivacyPolicy from './stranice/PrivacyPolicy/PrivacyPolicy';
import TermsConditions from './stranice/TermsConditions/TermsConditions';
import Offline from './stranice/Offline/Offline';
import { useTranslation } from 'react-i18next';
import { getApiBase } from './utils/apiBase';



const SuspendovanScreen: FC<{
  poruka: string;
  vrijemeDo: string;
  onLogout: () => void;
}> = ({ poruka, vrijemeDo, onLogout }) => {

  const { t } = useTranslation();  


  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(24,24,24,0.97)",
      color: "#fff",
      zIndex: 9999
    }}>
      <div style={{
        background: "#232323",
        borderRadius: 18,
        padding: "40px 32px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
        maxWidth: 420,
        textAlign: "center"
      }}>
        <img src="/logo.gif" alt="Suspendovan" style={{ width: 120, height: 120, marginBottom: 24 }} />
        <h2 style={{ color: "#ffffff", marginBottom: 18 }}>{t("account_suspended")}</h2>
        <div style={{ marginBottom: 18, fontSize: "1.1rem" }}>
          <b>{t("suspension_reason")}:</b>
          <div style={{
            background: "#181818",
            borderRadius: 6,
            padding: 12,
            marginTop: 4,
            whiteSpace: "pre-wrap"
          }}>{poruka}</div>
        </div>
        <div style={{ marginBottom: 24 }}>
        <b>{t("suspension_until")}:</b> <span style={{ color: "#cccccc" }}>{new Date(vrijemeDo).toLocaleString()}</span>
        </div>
        <button
          style={{
            background: "#333333",
            color: "#fff",
            border: "1px solid #444444",
            borderRadius: "8px",
            padding: "10px 28px",
            fontWeight: 600,
            fontSize: "1.1rem",
            cursor: "pointer"
          }}
          onClick={onLogout}
        >
          {t("logout")}
        </button>
      </div>
    </div>
     
 );
};

const ObrisanScreen: FC<{
  onLogout: () => void;
  onReaktiviraj: () => void;
}> = ({ onLogout, onReaktiviraj }) => {
  
  const { t } = useTranslation();

    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(24,24,24,0.97)",
        color: "#fff",
        zIndex: 9999
      }}>
        <div style={{
          background: "#232323",
          borderRadius: 18,
          padding: "40px 32px",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
          maxWidth: 420,
          textAlign: "center"
        }}>
          <img src="/logo.gif" alt="Obrisan" style={{ width: 120, height: 120, marginBottom: 24 }} />
          <h2 style={{ color: "#ffffff", marginBottom: 18 }}>{t("profile_deleted")}</h2>
          <div style={{ marginBottom: 18, fontSize: "1.1rem" }}>
    {t("profile_deleted_info")}
          </div>
          <div style={{ marginBottom: 24 }}>
            {t("profile_reactivate_info")}
          </div>
          <button
            style={{
              background: "#333333",
              color: "#fff",
              border: "1px solid #444444",
              borderRadius: "8px",
              padding: "10px 28px",
              fontWeight: 600,
              fontSize: "1.1rem",
              cursor: "pointer",
              marginRight: 12
            }}
            onClick={onReaktiviraj}
          >
            {t("profile_reactivate")}
          </button>
          <button
            style={{
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 28px",
              fontWeight: 600,
              fontSize: "1.1rem",
              cursor: "pointer"
            }}
            onClick={onLogout}
          >
            {t("logout")}
          </button>
        </div>
      </div>
  );
};

const RequireAuth: FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [suspendInfo, setSuspendInfo] = useState<{ poruka: string; vrijemeDo: string } | null>(null);
  const [obrisan, setObrisan] = useState(false);
  const [provjera, setProvjera] = useState(true);

  const publicRoutes = ["/", "/login", "/register", "/download", "/profile/settings"];

  const isPublicRoute = publicRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route + "/")
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem("korisnik");
    navigate("/login");
  }, [navigate]);

  const handleReaktiviraj = useCallback(async () => {
    const userStr = localStorage.getItem("korisnik");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const korisnikID = user?.id;
    if (!korisnikID) return;
    try {
      const res = await axios.get(`${getApiBase()}/korisnici/${korisnikID}`);
      const korisnik = res.data;
      await axios.put(`${getApiBase()}/korisnici/${korisnikID}`, {
        ...korisnik,
        statusKorisnika: "aktivan",
        obrisan: false
      });
      setObrisan(false);
      setProvjera(false);
      window.location.reload();
    } catch {
      alert("Greška pri reaktivaciji naloga.");
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("korisnik");
    
    if (!userStr && !isPublicRoute) {
      navigate("/login");
      return;
    }
    
    if (userStr) {
      const user = JSON.parse(userStr);
      const korisnikID = user?.id;
      if (korisnikID) {
        axios.get(`${getApiBase()}/korisnici/${korisnikID}`)
          .then(res => {
            if (res.data.obrisan === true || res.data.statusKorisnika === "neaktivan") {
              setObrisan(true);
              setProvjera(false);
              return;
            }
            if (res.data.statusKorisnika === "suspendovan") {
              axios.get(`${getApiBase()}/suspendovani/korisnik/${korisnikID}`)
                .then(r => {
                  setSuspendInfo({
                    poruka: r.data.poruka,
                    vrijemeDo: r.data.vrijemeDo,
                  });
                  setProvjera(false);
                })
                .catch(() => {
                  setSuspendInfo({
                    poruka: "Vaš nalog je suspendovan.",
                    vrijemeDo: "",
                  });
                  setProvjera(false);
                });
            } else {
              setSuspendInfo(null);
              setProvjera(false);
            }
          })
          .catch(() => {
            setSuspendInfo(null);
            setProvjera(false);
          });
      } else {
        setSuspendInfo(null);
        setProvjera(false);
      }
    } else {
      setSuspendInfo(null);
      setProvjera(false);
    }
  }, [location, navigate, isPublicRoute]);

  if (provjera) return null;
  if (obrisan) {
    window.dispatchEvent(new CustomEvent("hideSubscriptionMsg"));
    return <ObrisanScreen onLogout={handleLogout} onReaktiviraj={handleReaktiviraj} />;
  }
  if (suspendInfo) {
    window.dispatchEvent(new CustomEvent("hideSubscriptionMsg"));
    return <SuspendovanScreen poruka={suspendInfo.poruka} vrijemeDo={suspendInfo.vrijemeDo} onLogout={handleLogout} />;
  }
  return <>{children}</>;
};

const setBodyBackground = (imgUrl?: string) => {
  const body = document.body;
  if (!body) return;
  
  if (imgUrl) {
    body.style.background = `url('${imgUrl}') center center / cover no-repeat fixed`;
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center center';
    body.style.backgroundRepeat = 'no-repeat';
    
    body.style.setProperty('--bg-image', `url('${imgUrl}')`);
    
    const style = document.createElement('style');
    style.textContent = `
      body::before {
        background: url('${imgUrl}') center center / cover no-repeat fixed !important;
        filter: blur(18px) brightness(0.4) saturate(1.3) !important;
        opacity: 0.9 !important;
      }
      body::after {
        background: rgba(24, 24, 24, 0.4) !important;
      }
    `;
    
    const existingStyle = document.getElementById('dynamic-bg-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.id = 'dynamic-bg-style';
    document.head.appendChild(style);
    
    console.log('Background set to:', imgUrl);
  } else {
    body.style.background = 'radial-gradient(ellipse at 10% 60%, #333333 0%, #181818 60%)';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundSize = 'auto';
    body.style.backgroundPosition = 'initial';
    body.style.backgroundRepeat = 'initial';
    
    const existingStyle = document.getElementById('dynamic-bg-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    console.log('Background reset to default gradient');
  }
};

const AppContent: FC = () => {
  const isElectron = navigator.userAgent.toLowerCase().includes("electron");

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { gif, slika } = (customEvent.detail || {});
      if (gif) {
        setBodyBackground(gif);
      } else if (slika) {
        setBodyBackground(slika);
      } else {
        setBodyBackground(undefined);
      }
    };
    window.addEventListener("activeSongBg", handler);
    return () => window.removeEventListener("activeSongBg", handler);
  }, []);

  return (
    <RequireAuth>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/add-song" element={<NovaPjesma />} />
        <Route path="/songs" element={<SvePjesme />} />
        <Route path="/playlists" element={<SvePlayliste />} />
        <Route path="/playlists/add" element={<NovaPlaylista />} />
        <Route path="/albums" element={<SviAlbumi />} />
        <Route path="/add-album" element={<NoviAlbum />} />
        <Route path="/profile/settings" element={<Postavke />} />
        <Route path="/profile/edit" element={<UrediProfil />} />
        <Route path="/profile/subscription" element={<Pretplata />} />
        <Route path="/korisnici" element={<SviKorisnici />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/statistika" element={<Statistika />} />
        <Route path="/pjesma/:pjesmaId" element={<Pjesma />} />
        <Route path="/album/:albumId" element={<Album />} />
        <Route path="/playlista/:playlistaId" element={<Playlista />} />
        <Route path="/izvodjac/:izvodjacId" element={<Izvodjac />} />
        <Route path="/uredi-pjesmu/:pjesmaId" element={<UrediPjesmu />} />
        <Route path="/uredi-album/:albumId" element={<UrediAlbum />} />
        <Route path="/uredi-playlistu/:playlistaId" element={<UrediPlaylistu />} />
        <Route path='/nova-pretplata/:pretplataId' element={<NovaPretplata />} />
        <Route path="/historija" element={<Historija />} />
        <Route path="/omiljene/pjesme" element={<Omiljeno />} />
        <Route path="/omiljene/albumi" element={<Omiljeno />} />
        <Route path="/omiljene/playliste" element={<Omiljeno />} />
        <Route path="/zahtjevi" element={<Zahtjevi />} />
        <Route path="/download" element={<Download />} />
        <Route path="/discord-link" element={<DiscordLink />} />
        {
          isElectron && (
            <Route path="/offline" element={<Offline />} />
          )
        }
        <Route path="/404" element={<NotFound />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/sitemap.txt" element={<div style={{ padding: 40, color: '#fff', background: '#0d0d0d' }}>Sitemap</div>} />
        <Route path="/robots.txt" element={<div style={{ padding: 40, color: '#fff', background: '#0d0d0d' }}>Robots</div>} />
        <Route path="*" element={<NotFound />} />
      



        <Route path="*" element={<Home />} />
      </Routes>
    </RequireAuth>
  );
};

const App: FC = () => {
  const [audioState, setAudioState] = useState<{
    id?: number;
    src?: string;
    title?: string;
    putanjaGif?: string;
    putanjaSlika?: string;
    visible: boolean;
    korisnikID?: string;
    minimized?: boolean;
    playlist?: unknown[];
    playlistIdx?: number;
    playlistRepeat?: boolean;
  }>({ visible: false, minimized: false });

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { id, src, title, putanjaGif, putanjaSlika, korisnikID } = (customEvent.detail || {});
      if (src) {
        setAudioState({
          id,
          src,
          title,
          putanjaGif,
          putanjaSlika,
          visible: true,
          korisnikID,
          minimized: false,
        });
      } else {
        setAudioState((prev) => ({ ...prev, visible: false, minimized: false }));
      }
    };
    window.addEventListener("globalAudioPlay", handler);
    return () => window.removeEventListener("globalAudioPlay", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.playlist && Array.isArray(detail.playlist) && typeof detail.idx === "number") {
        setAudioState((prev) => ({
          ...prev,
          visible: true,
          minimized: false,
        }));
      }
    };
    window.addEventListener("globalAudioPlaylist", handler);
    return () => window.removeEventListener("globalAudioPlaylist", handler);
  }, []);

  return (
    <Router>
      <AppContent />
      <AudioPlayer
        id={audioState.id}
        src={audioState.src}
        title={audioState.title}
        putanjaGif={audioState.putanjaGif}
        putanjaSlika={audioState.putanjaSlika}
        korisnikID={audioState.korisnikID}
        visible={audioState.visible}
        minimized={audioState.minimized}
        onClose={() =>
          setAudioState((prev) =>
            prev.visible
              ? { ...prev, visible: false, minimized: true }
              : prev
          )
        }
        onExpand={() =>
          setAudioState((prev) =>
            prev.minimized
              ? { ...prev, visible: true, minimized: false }
              : prev
          )
        }
      />
    </Router>
  );
};

export default App;