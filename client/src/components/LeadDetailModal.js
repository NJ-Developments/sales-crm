import React, { useState, useEffect } from 'react';
import './LeadDetailModal.css';

// Default Lead status options (used if not provided via props)
const DEFAULT_LEAD_STATUSES = [
  { value: 'NEW', label: '🆕 New', color: '#3b82f6' },
  { value: 'CALLED', label: '📞 Called', color: '#eab308' },
  { value: 'CALLBACK', label: '🔄 Callback', color: '#f97316' },
  { value: 'REJECTED', label: '❌ Rejected', color: '#ef4444' },
  { value: 'INTERESTED', label: '✅ Interested', color: '#22c55e' },
  { value: 'CLOSED', label: '🏆 Closed', color: '#a855f7' },
];

// Lead tags
const LEAD_TAGS = [
  { value: 'NO_WEBSITE', label: '🚫 No Website', color: '#f97316' },
  { value: 'NO_PHONE', label: '📵 No Phone', color: '#ef4444' },
  { value: 'HOT_LEAD', label: '🔥 Hot Lead', color: '#22c55e' },
  { value: 'LOW_REVIEWS', label: '⭐ Low Reviews', color: '#eab308' },
  { value: 'HIGH_POTENTIAL', label: '💎 High Potential', color: '#06b6d4' },
  { value: 'NEEDS_SEO', label: '🔍 Needs SEO', color: '#a855f7' },
  { value: 'LOCAL_BUSINESS', label: '📍 Local Business', color: '#2a9d8f' },
];

// Function to extract potential owner name from business name
const extractOwnerFromBusinessName = (businessName) => {
  if (!businessName) return null;
  
  // Common patterns: "John's Plumbing", "Smith & Sons", "Mike's Auto Shop"
  const possessiveMatch = businessName.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)'s\s/);
  if (possessiveMatch) return possessiveMatch[1];
  
  // Pattern: "Smith & Sons", "Johnson Brothers"
  const familyMatch = businessName.match(/^([A-Z][a-z]+)\s+(?:&|and)\s+(?:Sons?|Brothers?|Family|Associates?)/i);
  if (familyMatch) return familyMatch[1];
  
  // Pattern: "The John Smith Company"
  const theCompanyMatch = businessName.match(/^The\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:Company|Co|Group|LLC|Inc)/i);
  if (theCompanyMatch) return theCompanyMatch[1];
  
  return null;
};

// Function to find owner using Google Places API reviews
const findOwnerFromReviews = async (placeId) => {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places || !placeId) {
      resolve({ name: null, source: null, confidence: 0 });
      return;
    }

    // Create a temporary div for PlacesService
    const div = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(div);

    service.getDetails(
      {
        placeId,
        fields: ['reviews', 'name', 'user_ratings_total']
      },
      (place, status) => {
        if (status !== 'OK' || !place) {
          resolve({ name: null, source: null, confidence: 0 });
          return;
        }

        const reviews = place.reviews || [];
        const ownerNames = [];

        // Look for owner responses in reviews
        reviews.forEach(review => {
          // Check if this review has an owner response
          // Google Places API doesn't directly expose owner responses,
          // but we can look for patterns in review author names that might indicate ownership
          const authorName = review.author_name || '';
          
          // Sometimes business owners respond from their personal accounts
          // We look for reviews with very positive ratings and professional language
          if (review.rating === 5 && review.text) {
            // Check if the review mentions the owner by name
            const ownerMentionMatch = review.text.match(/(?:owner|manager|proprietor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
            if (ownerMentionMatch) {
              ownerNames.push({
                name: ownerMentionMatch[1],
                source: 'Review mention',
                confidence: 70
              });
            }
          }
        });

        // Try to extract from business name
        const nameFromBusiness = extractOwnerFromBusinessName(place.name);
        if (nameFromBusiness) {
          ownerNames.push({
            name: nameFromBusiness,
            source: 'Business name',
            confidence: 60
          });
        }

        // Return the highest confidence result
        if (ownerNames.length > 0) {
          ownerNames.sort((a, b) => b.confidence - a.confidence);
          resolve(ownerNames[0]);
        } else {
          resolve({ name: null, source: null, confidence: 0 });
        }
      }
    );
  });
};

const DEFAULT_TEAM_MEMBERS = ['Javi', 'Iamiah'];

export default function LeadDetailModal({ 
  lead, 
  statuses = DEFAULT_LEAD_STATUSES,
  teamMembers = DEFAULT_TEAM_MEMBERS,
  currentUser,
  onClose, 
  onUpdate, 
  onStatusChange,
  onToggleLead,
  onLogCall,
  onDelete,
  onZoom,
  canEdit = true,
  canDelete = true
}) {

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [email, setEmail] = useState(lead.email || '');
  const [editingEmail, setEditingEmail] = useState(false);
  
  // Owner finder state
  const [ownerName, setOwnerName] = useState(lead.ownerName || null);
  const [ownerSource, setOwnerSource] = useState(lead.ownerSource || null);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [manualOwnerName, setManualOwnerName] = useState('');

  // Auto-find owner on mount if not already set
  useEffect(() => {
    if (!ownerName && lead.id && !ownerSearching) {
      handleFindOwner();
    }
  }, [lead.id]);

  const handleFindOwner = async () => {
    setOwnerSearching(true);
    
    try {
      // First, try to extract from business name (instant)
      const nameFromBusiness = extractOwnerFromBusinessName(lead.name);
      if (nameFromBusiness) {
        setOwnerName(nameFromBusiness);
        setOwnerSource('Business name pattern');
        onUpdate({ ownerName: nameFromBusiness, ownerSource: 'Business name pattern', lastUpdated: Date.now() });
        setOwnerSearching(false);
        return;
      }

      // Then try Google Places API if we have a place_id
      if (lead.id && window.google?.maps?.places) {
        const result = await findOwnerFromReviews(lead.id);
        if (result.name) {
          setOwnerName(result.name);
          setOwnerSource(result.source);
          onUpdate({ ownerName: result.name, ownerSource: result.source, lastUpdated: Date.now() });
          setOwnerSearching(false);
          return;
        }
      }

      // If nothing found, set to "Not found"
      setOwnerName(null);
      setOwnerSource('No owner info found');
    } catch (error) {
      console.error('Error finding owner:', error);
      setOwnerSource('Search failed');
    }
    
    setOwnerSearching(false);
  };

  const handleSaveManualOwner = () => {
    if (manualOwnerName.trim()) {
      setOwnerName(manualOwnerName.trim());
      setOwnerSource('Manually entered');
      onUpdate({ 
        ownerName: manualOwnerName.trim(), 
        ownerSource: 'Manually entered', 
        lastUpdated: Date.now() 
      });
    }
    setEditingOwner(false);
    setManualOwnerName('');
  };

  const handleStatusChange = (status) => {
    if (onStatusChange) {
      onStatusChange(status);
    } else {
      onUpdate({ status, lastUpdated: Date.now() });
    }
  };

  const handleTagToggle = (tagValue) => {
    const currentTags = lead.tags || [];
    const isAdding = !currentTags.includes(tagValue);
    const newTags = isAdding
      ? [...currentTags, tagValue]
      : currentTags.filter(t => t !== tagValue);
    
    // Auto-add to sheet when adding a tag
    const updates = { tags: newTags, lastUpdated: Date.now() };
    if (isAdding && !lead.isLead) {
      updates.isLead = true;
    }
    onUpdate(updates);
  };

  const handleAssign = (assignee) => {
    // Auto-add to sheet when assigning to someone
    const updates = { assignedTo: assignee, lastUpdated: Date.now() };
    if (assignee && !lead.isLead) {
      updates.isLead = true;
    }
    onUpdate(updates);
  };

  const handleSaveNotes = () => {
    onUpdate({ notes, lastUpdated: Date.now() });
    setEditingNotes(false);
  };

  const handleSaveEmail = () => {
    onUpdate({ email, lastUpdated: Date.now() });
    setEditingEmail(false);
  };



  // Auto-detect tags based on lead data
  const autoTags = [];
  if (!lead.website) autoTags.push('NO_WEBSITE');
  if (!lead.phone) autoTags.push('NO_PHONE');
  if (lead.rating >= 4.5 && lead.userRatingsTotal >= 100) autoTags.push('HOT_LEAD');
  if (lead.userRatingsTotal < 20) autoTags.push('LOW_REVIEWS');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lead-detail-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-title-row">
              <h2>{lead.name}</h2>
              {lead.source && (
                <span className={`source-badge ${lead.source}`}>
                  {lead.source === 'facebook' ? '📘 Facebook' : lead.source === 'google_maps' ? '🗺️ Maps' : '✏️ Manual'}
                </span>
              )}
            </div>
            <p className="modal-address">{lead.address}</p>
          </div>
          <div className="modal-header-actions">
            {onToggleLead && canEdit && (
              <button 
                className={`sheet-toggle-btn ${lead.isLead ? 'on-sheet' : ''}`}
                onClick={onToggleLead}
              >
                {lead.isLead ? '✅ On Sheet' : '📋 Add to Sheet'}
              </button>
            )}
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Facebook Source Info (if applicable) */}
        {lead.source === 'facebook' && lead.sourceDetails && (
          <div className="fb-source-info">
            <div className="fb-source-row">
              <span className="fb-source-label">📘 Group:</span>
              <span className="fb-source-value">{lead.sourceDetails.groupName || 'Unknown Group'}</span>
            </div>
            {lead.sourceDetails.groupUrl && (
              <a 
                href={lead.sourceDetails.groupUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="fb-source-link"
              >
                🔗 Open in Facebook
              </a>
            )}
            {lead.sourceDetails.postContent && (
              <div className="fb-post-preview">
                <span className="fb-source-label">Original Post:</span>
                <p className="fb-post-content">{lead.sourceDetails.postContent}</p>
              </div>
            )}
          </div>
        )}

        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-buttons">
            {statuses.map(status => (
              <button
                key={status.value}
                className={`status-btn ${lead.status === status.value ? 'active' : ''}`}
                style={{ 
                  '--status-color': status.color,
                  backgroundColor: lead.status === status.value ? status.color : undefined
                }}
                onClick={() => handleStatusChange(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="modal-body">
              {/* Owner Info - Prominent Display */}
              <div className="detail-section owner-section">
                <h4>👤 Business Owner</h4>
                <div className="owner-display">
                  {ownerSearching ? (
                    <div className="owner-searching">
                      <span className="spinner">🔍</span>
                      <span>Searching for owner...</span>
                    </div>
                  ) : editingOwner ? (
                    <div className="owner-edit">
                      <input
                        type="text"
                        value={manualOwnerName}
                        onChange={(e) => setManualOwnerName(e.target.value)}
                        placeholder="Enter owner name..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveManualOwner();
                          if (e.key === 'Escape') setEditingOwner(false);
                        }}
                      />
                      <button className="save-btn" onClick={handleSaveManualOwner}>Save</button>
                      <button className="cancel-btn" onClick={() => setEditingOwner(false)}>Cancel</button>
                    </div>
                  ) : ownerName ? (
                    <div className="owner-found">
                      <span className="owner-name">{ownerName}</span>
                      <span className="owner-source">({ownerSource})</span>
                      <div className="owner-actions">
                        <button className="edit-owner-btn" onClick={() => {
                          setManualOwnerName(ownerName);
                          setEditingOwner(true);
                        }}>✏️</button>
                        <button className="search-owner-btn" onClick={handleFindOwner}>🔄</button>
                      </div>
                    </div>
                  ) : (
                    <div className="owner-not-found">
                      <span className="no-owner">No owner found</span>
                      <div className="owner-actions">
                        <button className="add-owner-btn" onClick={() => setEditingOwner(true)}>
                          ➕ Add Manually
                        </button>
                        <button className="retry-owner-btn" onClick={handleFindOwner}>
                          🔍 Search Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="detail-section">
                <h4>📞 Contact Information</h4>
                <div className="contact-grid">
                  <div className="contact-item">
                    <span className="contact-label">Phone</span>
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="contact-value link">
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="contact-value empty">Not available</span>
                    )}
                  </div>
                  <div className="contact-item">
                    <span className="contact-label">Email</span>
                    {editingEmail ? (
                      <div className="inline-edit">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter email..."
                        />
                        <button onClick={handleSaveEmail}>Save</button>
                      </div>
                    ) : (
                      <div className="editable-field" onClick={() => setEditingEmail(true)}>
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="contact-value link">
                            {lead.email}
                          </a>
                        ) : (
                          <span className="contact-value empty">Click to add</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="contact-item">
                    <span className="contact-label">Website</span>
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="contact-value link">
                        {lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      </a>
                    ) : (
                      <span className="contact-value empty hot">No website! 🔥</span>
                    )}
                  </div>
                  <div className="contact-item">
                    <span className="contact-label">Reviews</span>
                    <span className="contact-value">
                      {lead.rating ? `⭐ ${lead.rating}` : 'N/A'} ({lead.userRatingsTotal || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment */}
              <div className="detail-section">
                <h4>👤 Assignment</h4>
                <div className="assignment-buttons">
                  {teamMembers.map(member => (
                    <button
                      key={member}
                      className={`assign-btn ${lead.assignedTo === member ? 'active' : ''}`}
                      onClick={() => handleAssign(member)}
                    >
                      {member}
                    </button>
                  ))}
                  {lead.assignedTo && (
                    <button
                      className="assign-btn unassign"
                      onClick={() => handleAssign('')}
                    >
                      Unassign
                    </button>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="detail-section">
                <h4>🏷️ Tags</h4>
                <div className="tags-grid">
                  {LEAD_TAGS.map(tag => {
                    const isAuto = autoTags.includes(tag.value);
                    const isManual = (lead.tags || []).includes(tag.value);
                    return (
                      <button
                        key={tag.value}
                        className={`tag-btn ${isAuto || isManual ? 'active' : ''} ${isAuto ? 'auto' : ''}`}
                        style={{ '--tag-color': tag.color }}
                        onClick={() => handleTagToggle(tag.value)}
                      >
                        {tag.label}
                        {isAuto && <span className="auto-badge">auto</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="detail-section">
                <div className="section-header">
                  <h4>📝 Notes</h4>
                  {!editingNotes && (
                    <button className="edit-btn" onClick={() => setEditingNotes(true)}>
                      Edit
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="notes-editor">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this lead..."
                      rows={4}
                    />
                    <div className="notes-actions">
                      <button className="cancel-btn" onClick={() => {
                        setNotes(lead.notes || '');
                        setEditingNotes(false);
                      }}>Cancel</button>
                      <button className="save-btn" onClick={handleSaveNotes}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p className="notes-display">
                    {lead.notes || 'No notes yet. Click Edit to add some.'}
                  </p>
                )}
              </div>

          {/* Meta Info */}
          <div className="meta-info">
            <span>Added by {lead.addedBy || 'Unknown'} on {new Date(lead.addedAt).toLocaleDateString()}</span>
            <span>Last updated {formatTimeAgo(lead.lastUpdated)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {onZoom && (
            <button className="zoom-btn" onClick={onZoom}>
              📍 Zoom to Map
            </button>
          )}
          <button className="google-btn" onClick={() => {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(lead.name + ' ' + (lead.address || ''))}`, '_blank');
          }}>
            🔍 View on Google
          </button>
          {canDelete && (
            <button className="delete-btn" onClick={() => {
              if (window.confirm('Delete this lead? This cannot be undone.')) {
                onDelete(lead.id);
                onClose();
              }
            }}>
              🗑️ Delete Lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
