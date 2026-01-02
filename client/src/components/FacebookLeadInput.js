import React, { useState } from 'react';
import './FacebookLeadInput.css';

// Predefined Facebook groups for quick selection
const COMMON_GROUPS = [
  { name: 'Local Business Owners', icon: '🏪' },
  { name: 'Contractors Wanted', icon: '🔨' },
  { name: 'Home Services Needed', icon: '🏠' },
  { name: 'Small Business Marketing', icon: '📢' },
  { name: 'Custom Group', icon: '✏️' },
];

export default function FacebookLeadInput({ onAddLead, currentUser, businessTypes }) {
  const [mode, setMode] = useState('quick'); // 'quick' or 'detailed'
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    website: '',
    email: '',
    notes: '',
    fbGroupName: '',
    fbPostUrl: '',
    businessType: '',
  });
  const [pasteContent, setPasteContent] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Parse pasted content to extract business info
  const parseContent = (content) => {
    const lines = content.split('\n').filter(l => l.trim());
    const extracted = { ...formData };
    
    // Try to extract phone numbers (various formats)
    const phoneRegex = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/g;
    const phones = content.match(phoneRegex);
    if (phones && phones.length > 0) {
      extracted.phone = phones[0].replace(/[^\d+]/g, '');
    }
    
    // Try to extract email
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/gi;
    const emails = content.match(emailRegex);
    if (emails && emails.length > 0) {
      extracted.email = emails[0];
    }
    
    // Try to extract website
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?[\w-]+\.[a-z]{2,}(?:\/[^\s]*)*/gi;
    const urls = content.match(urlRegex);
    if (urls && urls.length > 0) {
      const website = urls.find(u => !u.includes('facebook.com'));
      if (website) extracted.website = website;
      const fbUrl = urls.find(u => u.includes('facebook.com'));
      if (fbUrl) extracted.fbPostUrl = fbUrl;
    }
    
    // First line is usually the business name
    if (lines.length > 0 && !lines[0].match(phoneRegex) && !lines[0].match(emailRegex)) {
      extracted.name = lines[0].substring(0, 100);
    }
    
    // Look for address patterns (contains numbers and common words)
    const addressKeywords = ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'blvd', 'dr', 'drive', 'way', 'ln', 'lane', 'suite', 'ste', 'apt', 'unit'];
    const possibleAddress = lines.find(line => {
      const lower = line.toLowerCase();
      return addressKeywords.some(kw => lower.includes(kw)) && /\d/.test(line);
    });
    if (possibleAddress) {
      extracted.address = possibleAddress;
    }
    
    // Anything else goes to notes
    extracted.notes = `Sourced from Facebook:\n${content}`;
    
    setFormData(extracted);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Business name is required');
      return;
    }
    
    // Create lead object
    const newLead = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || 'From Facebook - No address',
      website: formData.website.trim() || null,
      email: formData.email.trim() || null,
      notes: formData.notes.trim() || '',
      status: 'NEW',
      source: 'facebook',
      fbGroupName: formData.fbGroupName || 'Facebook Group',
      fbPostUrl: formData.fbPostUrl || null,
      businessType: formData.businessType || 'other',
      addedBy: currentUser?.name || 'Unknown',
      assignedTo: '',
      callHistory: [],
      addedAt: Date.now(),
      lastUpdated: Date.now(),
      isLead: true, // Auto-mark as lead since it's manually added
      lat: null,
      lng: null,
    };
    
    onAddLead(newLead);
    
    // Reset form
    setFormData({
      name: '',
      phone: '',
      address: '',
      website: '',
      email: '',
      notes: '',
      fbGroupName: formData.fbGroupName, // Keep group selection
      fbPostUrl: '',
      businessType: '',
    });
    setPasteContent('');
    
    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="fb-lead-input">
      <div className="fb-header">
        <span className="fb-icon">📘</span>
        <h3>Add from Facebook</h3>
      </div>
      
      <div className="mode-toggle">
        <button 
          className={mode === 'quick' ? 'active' : ''}
          onClick={() => setMode('quick')}
        >
          ⚡ Quick Paste
        </button>
        <button 
          className={mode === 'detailed' ? 'active' : ''}
          onClick={() => setMode('detailed')}
        >
          ✏️ Manual Entry
        </button>
      </div>
      
      {/* Facebook Group Selector */}
      <div className="fb-group-selector">
        <label>Source Group</label>
        <div className="group-chips">
          {COMMON_GROUPS.map(group => (
            <button
              key={group.name}
              className={`group-chip ${formData.fbGroupName === group.name ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, fbGroupName: group.name }))}
            >
              {group.icon} {group.name}
            </button>
          ))}
        </div>
        {formData.fbGroupName === 'Custom Group' && (
          <input
            type="text"
            placeholder="Enter group name..."
            className="custom-group-input"
            value={formData.fbGroupName === 'Custom Group' ? '' : formData.fbGroupName}
            onChange={(e) => setFormData(prev => ({ ...prev, fbGroupName: e.target.value || 'Custom Group' }))}
          />
        )}
      </div>
      
      {mode === 'quick' ? (
        <div className="quick-paste-mode">
          <div className="paste-area">
            <textarea
              placeholder="📋 Paste Facebook post content here...

Example:
ABC Plumbing Services
Looking for new customers!
Call us: (555) 123-4567
email@example.com
123 Main St, City, State"
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              rows={8}
            />
            <button 
              className="parse-btn"
              onClick={() => parseContent(pasteContent)}
              disabled={!pasteContent.trim()}
            >
              🔍 Extract Info
            </button>
          </div>
          
          {/* Preview extracted data */}
          {formData.name && (
            <div className="preview-card">
              <h4>Extracted:</h4>
              <div className="preview-fields">
                <div className="preview-field">
                  <label>Name:</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="preview-field">
                  <label>Phone:</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="No phone found"
                  />
                </div>
                <div className="preview-field">
                  <label>Email:</label>
                  <input
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="No email found"
                  />
                </div>
                <div className="preview-field">
                  <label>Address:</label>
                  <input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="No address found"
                  />
                </div>
              </div>
              <button className="add-lead-btn" onClick={handleSubmit}>
                ➕ Add to Leads
              </button>
            </div>
          )}
        </div>
      ) : (
        <form className="detailed-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Business Name *</label>
              <input
                type="text"
                required
                placeholder="ABC Company"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="form-row two-col">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                placeholder="123 Main St, City, State"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="form-row two-col">
            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                placeholder="www.example.com"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Business Type</label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
              >
                <option value="">-- Select --</option>
                {businessTypes?.slice(1).map(bt => (
                  <option key={bt.value} value={bt.value}>{bt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>FB Post URL</label>
              <input
                type="url"
                placeholder="https://facebook.com/groups/..."
                value={formData.fbPostUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, fbPostUrl: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Notes</label>
              <textarea
                placeholder="Additional info from the post..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          
          <button type="submit" className="add-lead-btn">
            ➕ Add to Leads
          </button>
        </form>
      )}
      
      {showSuccess && (
        <div className="success-toast">
          ✅ Lead added successfully!
        </div>
      )}
    </div>
  );
}
