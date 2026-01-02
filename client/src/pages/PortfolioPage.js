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
      title: "Odie's Deli & Diner",
      category: 'Restaurant Website',
      desc: 'Full-service deli website with online ordering integration and menu management.',
      tags: ['Website', 'Online Ordering', 'SEO'],
      initials: 'OD',
      link: 'https://odiesdeli.com'
    },
    {
      title: 'GolfCove',
      category: 'Golf Course Platform',
      desc: 'Complete golf course management platform with tee time booking and membership system.',
      tags: ['Custom Platform', 'Booking System', 'Members'],
      initials: 'GC',
      link: '#'
    },
    {
      title: 'Ice Cream Shop POS',
      category: 'Point of Sale',
      desc: 'Custom ordering system with Toast integration and loyalty rewards program.',
      tags: ['POS', 'Toast', 'Loyalty'],
      initials: 'IC',
      link: '#'
    },
    {
      title: 'ChipSim',
      category: 'Web Application',
      desc: 'Interactive chip simulation platform for educational purposes.',
      tags: ['Web App', 'React', 'Education'],
      initials: 'CS',
      link: '#'
    },
    {
      title: 'Sales CRM',
      category: 'Business Tool',
      desc: 'Custom CRM for lead tracking, team collaboration, and sales pipeline management.',
      tags: ['CRM', 'Firebase', 'Real-time'],
      initials: 'SC',
      link: '#'
    },
    {
      title: 'Katz AI',
      category: 'AI Integration',
      desc: 'AI-powered customer service chatbot with appointment scheduling capabilities.',
      tags: ['AI', 'Chatbot', 'Automation'],
      initials: 'KA',
      link: '#'
    },
  ];

  return (
    <div className="portfolio-page">
      <Navbar />
      
      {/* Hero */}
      <section className="page-hero">
        <div className="container">
          <h1>Our <span className="gradient-text">Work</span></h1>
          <p>Real projects. Real results. See what we've built.</p>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="portfolio-section">
        <div className="container">
          <div className="portfolio-grid">
            {projects.map((project, i) => (
              <div key={i} className="portfolio-card">
                <div className="portfolio-image" data-initials={project.initials}>
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

      <Footer />
    </div>
  );
};

export default PortfolioPage;
