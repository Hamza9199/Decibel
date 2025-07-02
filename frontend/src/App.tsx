import './App.css';
import { FC } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './stranice/Home/Home';


const AppContent: FC = () => {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        
        
        <Route path="*" element={<Home />} />
      </Routes>
    </>
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