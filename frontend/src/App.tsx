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


const RequireAuth: FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem("korisnik");
    if (!user && location.pathname !== "/login" && location.pathname !== "/register") {
      navigate("/login");
    }
  }, [location, navigate]);

  return <>{children}</>;
};

const setBodyBackground = (imgUrl?: string) => {
  const body = document.body;
  if (!body) return;
  if (imgUrl) {
    body.style.background = `url('${imgUrl}') center center / cover no-repeat fixed`;
    body.style.setProperty('--has-bg-img', '1');
  } else {
    body.style.background = 'radial-gradient(ellipse at 10% 60%, #b91d95 0%, #222222 60%)';
    body.style.setProperty('--has-bg-img', '0');
  }
};

const AppContent: FC = () => {
  // Listen for active song changes via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { gif, slika } = (customEvent.detail || {});
      if (gif) setBodyBackground(gif);
      else if (slika) setBodyBackground(slika);
      else setBodyBackground(undefined);
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



        <Route path="*" element={<Home />} />
      </Routes>
    </RequireAuth>
  );
};

const App: FC = () => {
  const [audioState, setAudioState] = useState<{
    src?: string;
    title?: string;
    putanjaGif?: string;
    putanjaSlika?: string;
    visible: boolean;
    korisnikID?: string;
    minimized?: boolean;
  }>({ visible: false, minimized: false });

  // Slušaj event iz Home i drugih stranica za promjenu pjesme
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { src, title, putanjaGif, putanjaSlika, korisnikID } = (customEvent.detail || {});
      if (src) {
        setAudioState({
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

 
 

  return (
    <Router>
      <AppContent />
      <AudioPlayer
        src={audioState.src}
        title={audioState.title}
        putanjaGif={audioState.putanjaGif}
        putanjaSlika={audioState.putanjaSlika}
        korisnikID={audioState.korisnikID}
        visible={audioState.visible}
        minimized={audioState.minimized}
        onEnded={() => {/* ne gasi player automatski */}
        }
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