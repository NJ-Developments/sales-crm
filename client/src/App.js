import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import PortfolioPage from './pages/PortfolioPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CRM from './CRM';
import SpreadsheetPage from './SpreadsheetPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Website */}
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        
        {/* Internal Tools */}
        <Route path="/crm" element={<CRM />} />
        <Route path="/sheet" element={<SpreadsheetPage />} />
      </Routes>
    </Router>
  );
}

export default App;
