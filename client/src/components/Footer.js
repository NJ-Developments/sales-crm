import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-text">NJ</span> Developments
            </Link>
            <p>Building digital solutions that drive real business growth.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/portfolio">Portfolio</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-services">
            <h4>Services</h4>
            <ul>
              <li><Link to="/services">Website Development</Link></li>
              <li><Link to="/services">Online Ordering</Link></li>
              <li><Link to="/services">Marketing & Ads</Link></li>
              <li><Link to="/services">AI Reception</Link></li>
              <li><Link to="/services">App Development</Link></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:njdevelopments123@gmail.com"><i className="fas fa-envelope"></i> njdevelopments123@gmail.com</a></li>
              <li><a href="tel:860-987-7606"><i className="fas fa-phone"></i> 860-987-7606</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} NJ Developments. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
