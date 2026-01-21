import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PortfolioPage.css';

const PortfolioPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const projects = [
    {
      title: 'Ace Hardware',
      category: 'E-commerce & Inventory',
      desc: 'Complete hardware store digital solution with inventory management and online ordering system.',
      tags: ['Website', 'E-commerce', 'Inventory'],
      image: '/logos/ace-hardware.png',
      link: '#'
    },
    {
      title: 'Golf Cove',
      category: 'Golf Course Platform',
      desc: 'Complete golf course management platform with tee time booking and membership system.',
      tags: ['Custom Platform', 'Booking System', 'Members'],
      image: '/logos/golf-cove.png',
      link: '#'
    },
    {
      title: 'Ice Cream Productions',
      category: 'Point of Sale',
      desc: 'Custom ordering system with POS integration and loyalty rewards program.',
      tags: ['POS', 'Ordering', 'Loyalty'],
      image: '/logos/ice-cream-productions.png',
      link: '#'
    },
    {
      title: 'RBM Brokerage',
      category: 'Business Services',
      desc: 'Professional brokerage platform with client management and transaction tracking.',
      tags: ['Business', 'Brokerage', 'Platform'],
      image: '/logos/rbm-brokerage.png',
      link: '#'
    },
  ];

  // Companies/clients we've worked with
  const clients = [
    { name: 'Ace Hardware', logo: '/logos/ace-hardware.png' },
    { name: 'Golf Cove', logo: '/logos/golf-cove.png' },
    { name: 'Ice Cream Productions', logo: '/logos/ice-cream-productions.png' },
    { name: 'RBM Brokerage', logo: '/logos/rbm-brokerage.png' },
  ];

  return (
    <div className="portfolio-page">
      <Navbar />
      
      {/* Hero */}
      <section className="page-hero">
        <div className="container">
          <h1>Our <span className="gradient-text">Work</span></h1>
        </div>
      </section>

      {/* Logo Scroller */}
      <section className="logo-scroller-section">
        <div className="container">
          <p className="scroller-label">Trusted by businesses we've partnered with</p>
        </div>
        <div className="logo-scroller">
          <div className="logo-track">
            {/* Duplicate the logos for seamless infinite scroll */}
            {[...clients, ...clients, ...clients, ...clients, ...clients, ...clients, ...clients, ...clients].map((client, i) => (
              <div key={i} className="logo-item">
                <img src={client.logo} alt={client.name} className="client-logo" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Want to Be Our Next Success Story?</h2>
            <p>Let's build something great together.</p>
            <Link to="/contact" className="btn btn-primary btn-large">Start Your Project</Link>
          </div>
        </div>
      </section>

      {/* Portfolio Grid - Hidden for now
      <section className="portfolio-section">
        <div className="container">
          <div className="portfolio-grid">
            {projects.map((project, i) => (
              <div key={i} className="portfolio-card">
                <div className="portfolio-image">
                  {project.image && (
                    <img src={project.image} alt={project.title} className="portfolio-logo" />
                  )}
                  <div className="portfolio-overlay">
                    <span className="portfolio-category">{project.category}</span>
                  </div>
                </div>
                <div className="portfolio-content">
                  <h3>{project.title}</h3>
                  <p>{project.desc}</p>
                  <div className="portfolio-tags">
                    {project.tags.map((tag, j) => (
                      <span key={j} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}

      <Footer />
    </div>
  );
};

export default PortfolioPage;
