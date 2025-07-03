import './App.css';
import { FC, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './stranice/Home/Home';
import Login from './stranice/Login/Login';
import Register from './stranice/Register/Register';


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
        <Route path="*" element={<Home />} />
      </Routes>
    </RequireAuth>
  );
};

const App: FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;