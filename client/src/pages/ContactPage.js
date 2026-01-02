import React, { useEffect, useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './ContactPage.css';

const ContactPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const formRef = useRef();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business: '',
    service: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setError('');

    // EmailJS - sends email to njdevelopments123@gmail.com
    // You need to set up EmailJS account and replace these IDs:
    // 1. Go to https://www.emailjs.com/ and sign up
    // 2. Add Gmail service (connect njdevelopments123@gmail.com)
    // 3. Create email template with variables: {{name}}, {{email}}, {{phone}}, {{business}}, {{service}}, {{message}}
    // 4. Replace 'YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', 'YOUR_PUBLIC_KEY' below
    
    emailjs.sendForm(
      'service_czz2xpq',
      'template_2tg7x6a',
      formRef.current,
      'puDsaIjx-8VjF8nKp'
    )
      .then((result) => {
        console.log('Email sent:', result.text);
        setSubmitted(true);
        setSending(false);
      })
      .catch((error) => {
        console.error('Email error:', error.text);
        setError('Failed to send. Please try again or email us directly.');
        setSending(false);
      });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="contact-page">
      <Navbar />
      
      {/* Hero */}
      <section className="page-hero">
        <div className="container">
          <h1>Get In <span className="gradient-text">Touch</span></h1>
          <p>Let's discuss how we can help your business grow</p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Info */}
            <div className="contact-info">
              <h2>Let's Talk</h2>
              <p>Ready to start your project? Have questions? We're here to help.</p>
              
              <div className="contact-methods">
                <div className="contact-method">
                  <div className="method-icon"><i className="fas fa-phone"></i></div>
                  <div className="method-details">
                    <h4>Phone</h4>
                    <a href="tel:860-987-7606">860-987-7606</a>
                  </div>
                </div>
                <div className="contact-method">
                  <div className="method-icon"><i className="fas fa-envelope"></i></div>
                  <div className="method-details">
                    <h4>Email</h4>
                    <a href="mailto:njdevelopments123@gmail.com">njdevelopments123@gmail.com</a>
                  </div>
                </div>
                <div className="contact-method">
                  <div className="method-icon"><i className="fas fa-clock"></i></div>
                  <div className="method-details">
                    <h4>Response Time</h4>
                    <span>Within 24 hours</span>
                  </div>
                </div>
              </div>

              <div className="free-consultation">
                <h3>Free Consultation</h3>
                <p>Every project starts with a free discovery call. No pressure, no obligations—just a conversation about your business.</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-container">
              {submitted ? (
                <div className="form-success">
                  <div className="success-icon"><i className="fas fa-check-circle"></i></div>
                  <h3>Message Sent!</h3>
                  <p>We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form ref={formRef} className="contact-form" onSubmit={handleSubmit}>
                  {error && <div className="form-error" style={{background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '10px', marginBottom: '1rem'}}>{error}</div>}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input 
                        type="text" 
                        name="name" 
                        required 
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input 
                        type="email" 
                        name="email" 
                        required 
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input 
                        type="tel" 
                        name="phone" 
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="form-group">
                      <label>Business Name</label>
                      <input 
                        type="text" 
                        name="business" 
                        value={formData.business}
                        onChange={handleChange}
                        placeholder="Your business"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>What do you need help with?</label>
                    <select name="service" value={formData.service} onChange={handleChange}>
                      <option value="">Select a service...</option>
                      <option value="website">Website Development</option>
                      <option value="ordering">Online Ordering / POS</option>
                      <option value="platform">Custom Platform</option>
                      <option value="seo">Google SEO</option>
                      <option value="marketing">Marketing & Ads</option>
                      <option value="ai">AI Reception / Chat</option>
                      <option value="app">App Development</option>
                      <option value="other">Something Else</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tell us about your project (optional)</label>
                    <textarea 
                      name="message" 
                      rows="4"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Any details you'd like to share? (We can discuss on the call)"
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
                    {sending ? 'Sending...' : 'Send Message'} {!sending && <i className="fas fa-arrow-right"></i>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
