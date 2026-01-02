import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './ServicesPage.css';

const ServicesPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const services = [
    {
      icon: 'fas fa-globe',
      title: 'Website Development',
      desc: 'Professional, mobile-first websites designed to convert visitors into customers. SEO optimized and lightning fast.',
      features: ['Custom Design', 'Mobile Responsive', 'SEO Optimized', 'Fast Loading'],
      popular: true
    },
    {
      icon: 'fas fa-shopping-cart',
      title: 'Online Ordering & POS',
      desc: 'Seamless ordering systems with Toast, Square, or custom solutions. Integrated payment processing with Stripe.',
      features: ['Toast Integration', 'Stripe Payments', 'DoorDash Drive', 'Real-time Orders'],
      popular: true
    },
    {
      icon: 'fas fa-cogs',
      title: 'Custom Platforms',
      desc: 'Purpose-built systems that replace fragmented tools. Tournaments, memberships, scheduling, and more.',
      features: ['Admin Dashboards', 'Member Management', 'Custom Workflows', 'Data Analytics'],
      popular: false
    },
    {
      icon: 'fas fa-search',
      title: 'Google Business & SEO',
      desc: 'Get found when customers search. Google Business optimization and local SEO to drive foot traffic.',
      features: ['Google Maps Ranking', 'Local SEO', 'Review Management', 'Analytics'],
      popular: false
    },
    {
      icon: 'fas fa-headset',
      title: 'Ongoing Support',
      desc: "We don't just build and leave. Live support, updates, and maintenance to keep everything running smoothly.",
      features: ['Priority Support', 'Regular Updates', 'Monthly Reports', 'Training'],
      popular: false
    },
    {
      icon: 'fas fa-bullhorn',
      title: 'Marketing & Ads',
      desc: 'Targeted advertising campaigns on Google and social media to bring new customers through your door.',
      features: ['Google Ads', 'Facebook & Instagram', 'ROI Tracking', 'A/B Testing'],
      popular: false
    },
    {
      icon: 'fas fa-robot',
      title: 'AI Reception & Chat',
      desc: '24/7 AI-powered chat and phone reception that answers questions, takes orders, and books appointments.',
      features: ['AI Phone Answering', 'Website Chatbot', 'Appointment Booking', 'Lead Capture'],
      popular: false
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'App Development',
      desc: 'Custom mobile apps for iOS and Android. Loyalty programs, ordering, reservations, and more.',
      features: ['iOS & Android', 'Push Notifications', 'Loyalty Programs', 'Offline Support'],
      popular: false
    },
  ];

  return (
    <div className="services-page">
      <Navbar />
      
      {/* Hero */}
      <section className="page-hero">
        <div className="container">
          <h1>Our <span className="gradient-text">Services</span></h1>
          <p>End-to-end digital solutions tailored for your business</p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="services-section">
        <div className="container">
          <div className="services-grid">
            {services.map((service, i) => (
              <div key={i} className={`service-card ${service.popular ? 'featured' : ''}`}>
                {service.popular && <div className="featured-badge">Popular</div>}
                <div className="service-icon"><i className={service.icon}></i></div>
                <h3>{service.title}</h3>
                <p>{service.desc}</p>
                <ul className="service-features">
                  {service.features.map((f, j) => (
                    <li key={j}><i className="fas fa-check"></i> {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="process-section">
        <div className="container">
          <div className="section-header">
            <h2>How We <span className="gradient-text">Work</span></h2>
            <p>Simple process, powerful results</p>
          </div>
          <div className="process-steps">
            <div className="step">
              <div className="step-number">01</div>
              <h3>Discovery Call</h3>
              <p>We learn about your business, goals, and challenges.</p>
            </div>
            <div className="step">
              <div className="step-number">02</div>
              <h3>Custom Proposal</h3>
              <p>Clear pricing and timeline—no surprises.</p>
            </div>
            <div className="step">
              <div className="step-number">03</div>
              <h3>Build & Review</h3>
              <p>We build, you review. Iterate until perfect.</p>
            </div>
            <div className="step">
              <div className="step-number">04</div>
              <h3>Launch & Support</h3>
              <p>Go live with ongoing support and optimization.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Get Started?</h2>
            <p>Free consultation. No obligations. Let's talk about your project.</p>
            <Link to="/contact" className="btn btn-primary btn-large">Contact Us</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
