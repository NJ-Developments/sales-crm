import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './HomePage.css';

const HomePage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const services = [
    { icon: 'fas fa-globe', title: 'Website Development', desc: 'Professional, mobile-first websites that convert' },
    { icon: 'fas fa-shopping-cart', title: 'Online Ordering', desc: 'Seamless POS & payment integration' },
    { icon: 'fas fa-robot', title: 'AI Reception', desc: '24/7 AI phone & chat support' },
    { icon: 'fas fa-mobile-alt', title: 'App Development', desc: 'Custom iOS & Android apps' },
  ];

  return (
    <div className="home-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="container">
          <div className="hero-content">
            <h1>We Build <span className="gradient-text">Digital Experiences</span> That Drive Growth</h1>
            <p>From websites to AI-powered systems, we help local businesses thrive in the digital age.</p>
            <div className="hero-ctas">
              <Link to="/contact" className="btn btn-primary">Start Your Project</Link>
              <Link to="/services" className="btn btn-secondary">Our Services</Link>
            </div>
          </div>
        </div>
        <div className="hero-gradient"></div>
      </section>

      {/* Services Preview */}
      <section className="services-preview">
        <div className="container">
          <div className="section-header">
            <h2>What We <span className="gradient-text">Build</span></h2>
            <p>End-to-end digital solutions for modern businesses</p>
          </div>
          <div className="services-grid">
            {services.map((service, i) => (
              <div key={i} className="service-card">
                <div className="service-icon"><i className={service.icon}></i></div>
                <h3>{service.title}</h3>
                <p>{service.desc}</p>
              </div>
            ))}
          </div>
          <div className="section-cta">
            <Link to="/services" className="btn btn-outline">View All Services →</Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to <span className="gradient-text">Transform</span> Your Business?</h2>
            <p>Let's discuss how we can help you grow. Free consultation, no obligations.</p>
            <Link to="/contact" className="btn btn-primary btn-large">Get Started Today</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
