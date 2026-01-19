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
    { icon: 'fas fa-globe', title: 'Websites That Work', desc: 'Fast, modern websites designed to turn visitors into customers—not just look good' },
    { icon: 'fas fa-code', title: 'Custom Software', desc: 'Built-from-scratch platforms like booking systems, member portals, and tournament management' },
    { icon: 'fas fa-search', title: 'SEO & Visibility', desc: 'Get found on Google. We optimize your presence so customers find you first' },
    { icon: 'fas fa-headset', title: 'Ongoing Support', desc: 'We don\'t disappear after launch. Real support from real people who know your project' },
  ];

  return (
    <div className="home-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="container">
          <div className="hero-content">
            <h1>Websites, Custom Software & <span className="gradient-text">Digital Growth</span> for Your Business</h1>
            <p>We build high-performance websites, custom platforms (like tournament systems and booking tools), and handle your SEO—so you can focus on running your business.</p>
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
            <h2>What We <span className="gradient-text">Do</span></h2>
            <p>We specialize in websites, custom software, and SEO</p>
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
