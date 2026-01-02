import React, { useState } from 'react';
import './FacebookLeadModal.css';

// Facebook lead categories from groups
const FB_CATEGORIES = [
  { value: 'junk_removal', label: '🗑️ Junk Removal Request' },
  { value: 'moving', label: '🚚 Moving Services' },
  { value: 'cleaning', label: '🧹 Cleaning Services' },
  { value: 'landscaping', label: '🌳 Landscaping' },
  { value: 'handyman', label: '🔧 Handyman Work' },
  { value: 'pressure_wash', label: '💦 Pressure Washing' },
  { value: 'hauling', label: '🚛 Hauling' },
  { value: 'demo', label: '🔨 Demolition' },
  { value: 'other', label: '📋 Other' },
];

export default function FacebookLeadModal({ onClose, onSave, currentUser }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    category: 'junk_removal',
    groupName: '',
    groupUrl: '',
    postContent: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.address.trim() && !formData.phone.trim()) {
      newErrors.address = 'At least address or phone is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const lead = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || 'From Facebook',
      lat: null,
      lng: null,
      website: null,
      source: 'facebook',
      sourceDetails: {
        groupName: formData.groupName.trim(),
        groupUrl: formData.groupUrl.trim(),
        postContent: formData.postContent.trim(),
        category: formData.category,
      },
      status: 'NEW',
      notes: formData.notes.trim(),
      addedBy: currentUser?.name || 'Unknown',
      assignedTo: '',
      callHistory: [],
      addedAt: Date.now(),
      lastUpdated: Date.now(),
      businessType: formData.category,
      isLead: true, // Auto-mark as lead since manually added
      rating: null,
      userRatingsTotal: 0,
    };

    onSave(lead);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fb-lead-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="fb-icon">📘</span>
            <h2>Add Facebook Lead</h2>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="fb-lead-info">
            <span>💡</span>
            <p>Add leads from Facebook Marketplace, community groups, or local business groups.</p>
          </div>

          <div className="form-section">
            <h3>📋 Lead Details</h3>
            
            <div className="form-group">
              <label>Name / Post Author <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g., John Smith or 'Looking for junk removal'"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={e => handleChange('category', e.target.value)}
                >
                  {FB_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Address / Location</label>
              <input
                type="text"
                placeholder="City, neighborhood, or full address"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className={errors.address ? 'error' : ''}
              />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>
          </div>

          <div className="form-section">
            <h3>📘 Facebook Source</h3>
            
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                placeholder="e.g., Newark Community Board"
                value={formData.groupName}
                onChange={e => handleChange('groupName', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Post / Group URL</label>
              <input
                type="url"
                placeholder="https://facebook.com/groups/..."
                value={formData.groupUrl}
                onChange={e => handleChange('groupUrl', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Post Content (for reference)</label>
              <textarea
                placeholder="Copy/paste the original post for context..."
                value={formData.postContent}
                onChange={e => handleChange('postContent', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>📝 Notes</h3>
            <div className="form-group">
              <textarea
                placeholder="Additional notes, best time to call, etc."
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSubmit}>
            ➕ Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}
