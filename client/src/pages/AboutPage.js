import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './AboutPage.css';

const AboutPage = () => {
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const teamMembers = [
    {
      initials: 'JB',
      name: 'Jamiah Barlett',
      role: 'Founder',
      card: '/cards/jamiah-card.png'
    },
    {
      initials: 'JF',
      name: 'Javier Flores',
      role: 'Founder & Developer',
      card: '/cards/javier-card.png'
    },
    {
      initials: 'NK',
      name: 'Nolan Krieger',
      role: 'Founder & Developer',
      card: '/cards/nolan-card.png'
    }
  ];

  const closeModal = () => setSelectedCard(null);

  return (
    <div className="about-page">
      <Navbar />
      
      {/* Hero */}
      <section className="page-hero">
        <div className="container">
          <h1>About <span className="gradient-text">Us</span></h1>
          <p>The team behind your digital success</p>
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="container">
          <div className="story-content">
            <div className="story-text">
              <h2>Our <span className="gradient-text">Story</span></h2>
              <p>
                NJ Developments started with a simple idea: local businesses deserve the same 
                quality digital tools as the big players, without the enterprise price tag.
              </p>
              <p>
                We've seen too many businesses struggle with outdated websites, manual processes, 
                and disconnected systems. That's why we focus on building integrated solutions 
                that actually solve problems—not just look pretty.
              </p>
              <p>
                From restaurants needing online ordering to golf courses managing tee times, 
                we've helped businesses streamline their operations 
                and grow their customer base.
              </p>
            </div>
            <div className="story-values">
              <div className="value-card">
                <div className="value-icon"><i className="fas fa-handshake"></i></div>
                <h3>Partnership</h3>
                <p>We're not vendors—we're partners in your success.</p>
              </div>
              <div className="value-card">
                <div className="value-icon"><i className="fas fa-bolt"></i></div>
                <h3>Speed</h3>
                <p>Fast turnaround without sacrificing quality.</p>
              </div>
              <div className="value-card">
                <div className="value-icon"><i className="fas fa-heart"></i></div>
                <h3>Care</h3>
                <p>We treat your business like it's our own.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <div className="team-content">
            <div className="team-text">
              <h2>Built by Developers Who <span className="gradient-text">Understand Business</span></h2>
              <p>
                NJ Developments was founded with one mission: to give small and medium businesses 
                access to the same powerful digital tools that big companies use—without the enterprise price tag.
              </p>
              <p>
                We're not a faceless agency. We're developers who pick up the phone, solve problems fast, 
                and actually care if your business grows.
              </p>
              <div className="team-values">
                <span className="team-value"><i className="fas fa-handshake"></i> Partner-Level Service</span>
                <span className="team-value"><i className="fas fa-bolt"></i> Fast Turnaround</span>
                <span className="team-value"><i className="fas fa-dollar-sign"></i> Transparent Pricing</span>
              </div>
            </div>
            <div className="team-members">
              {teamMembers.map((member, index) => (
                <div 
                  key={index}
                  className={`team-card ${member.card ? 'clickable' : ''}`}
                  onClick={() => member.card && setSelectedCard(member)}
                >
                  <div className="team-avatar">{member.initials}</div>
                  <div className="team-info">
                    <h4>{member.name}</h4>
                    <span>{member.role}</span>
                  </div>
                  {member.card && <i className="fas fa-id-card card-icon"></i>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="why-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose <span className="gradient-text">NJ Developments</span>?</h2>
          </div>
          <div className="why-grid">
            <div className="why-card">
              <div className="why-number">01</div>
              <h3>Local Understanding</h3>
              <p>We know local businesses. We understand your customers and your challenges.</p>
            </div>
            <div className="why-card">
              <div className="why-number">02</div>
              <h3>All-In-One</h3>
              <p>Website, ordering, marketing, AI—one team handles it all. No juggling multiple vendors.</p>
            </div>
            <div className="why-card">
              <div className="why-number">03</div>
              <h3>Real Support</h3>
              <p>When you call, you get a person who knows your project. Not a ticket number.</p>
            </div>
            <div className="why-card">
              <div className="why-number">04</div>
              <h3>Results Focus</h3>
              <p>We measure success by your growth, not by deliverables checked off a list.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Let's Build Something Great</h2>
            <p>Ready to take your business to the next level?</p>
            <Link to="/contact" className="btn btn-primary btn-large">Get in Touch</Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Business Card Modal */}
      {selectedCard && (
        <div className="card-modal-overlay" onClick={closeModal}>
          <div className="card-modal" onClick={(e) => e.stopPropagation()}>
            <button className="card-modal-close" onClick={closeModal}>
              <i className="fas fa-times"></i>
            </button>
            <img 
              src={selectedCard.card} 
              alt={`${selectedCard.name}'s Business Card`} 
              className="card-modal-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutPage;
