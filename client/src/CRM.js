import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './CRM.css';
import { initFirebase, isFirebaseConfigured, saveLead, updateFirebaseLead, subscribeToLeads, deleteLead } from './firebase';
import Dashboard from './components/Dashboard';
import LeadDetailModal from './components/LeadDetailModal';
import TeamSheet from './components/TeamSheet';
import './components/TeamSheet.css';
import { useUserRole, UserLoginSelector, TeamManagementPanel, UserBadge } from './components/UserRoles';

// Lead sources
const LEAD_SOURCES = {
  google_maps: { label: '🗺️ Google Maps', color: '#ea4335', icon: '🗺️' },
  manual: { label: '✏️ Manual', color: '#a855f7', icon: '✏️' },
};

// Lead status options
const LEAD_STATUSES = [
  { value: 'NEW', label: '🆕 New', color: '#3b82f6' },
  { value: 'CALLED', label: '📞 Called', color: '#eab308' },
  { value: 'CALLBACK', label: '🔄 Callback', color: '#f97316' },
  { value: 'REJECTED', label: '❌ Rejected', color: '#ef4444' },
  { value: 'INTERESTED', label: '✅ Interested', color: '#22c55e' },
  { value: 'CLOSED', label: '🏆 Closed', color: '#a855f7' },
];

// Team members
const TEAM_MEMBERS = ['Javi', 'Iamiah', 'Nolan'];

// Google Sheets Web App URL (set this after deploying the Apps Script)
const SHEETS_URL = localStorage.getItem('sheetsUrl') || '';

const RADIUS_OPTIONS = [
  { label: '0.5 mi', value: 805 },
  { label: '1 mi', value: 1609 },
  { label: '2 mi', value: 3219 },
  { label: '5 mi', value: 8047 },
  { label: '10 mi', value: 16093 },
  { label: '15 mi', value: 24140 },
  { label: '25 mi', value: 40234 },
  { label: '50 mi', value: 50000 },
];

const BUSINESS_TYPES = [
  { label: '-- Select Industry --', value: '' },
  { label: '🌐 All Industry Search', value: 'all' },
  // Home Services
  { label: '🔧 Plumbers', value: 'plumber' },
  { label: '⚡ Electricians', value: 'electrician' },
  { label: '🏠 Roofers', value: 'roofing_contractor' },
  { label: '❄️ HVAC', value: 'hvac_contractor' },
  { label: '🔨 General Contractors', value: 'general_contractor' },
  { label: '🪟 Painters', value: 'painter' },
  { label: '🌳 Landscapers', value: 'landscaper' },
  { label: '🧹 Cleaning Services', value: 'house_cleaning_service' },
  { label: '🚿 Carpet Cleaners', value: 'carpet_cleaning_service' },
  { label: '🔐 Locksmiths', value: 'locksmith' },
  { label: '🚚 Moving Companies', value: 'moving_company' },
  { label: '🐜 Pest Control', value: 'pest_control_service' },
  // Auto
  { label: '🚗 Auto Repair', value: 'car_repair' },
  { label: '🚙 Auto Dealers', value: 'car_dealer' },
  { label: '🚘 Auto Body Shops', value: 'auto_body_shop' },
  { label: '🛞 Tire Shops', value: 'tire_shop' },
  { label: '🚐 Towing Services', value: 'towing_service' },
  // Health & Wellness
  { label: '🦷 Dentists', value: 'dentist' },
  { label: '👨‍⚕️ Doctors', value: 'doctor' },
  { label: '💆 Chiropractors', value: 'chiropractor' },
  { label: '🏥 Physical Therapy', value: 'physical_therapist' },
  { label: '👁️ Optometrists', value: 'optometrist' },
  { label: '🐕 Veterinarians', value: 'veterinary_care' },
  { label: '💪 Gyms/Fitness', value: 'gym' },
  { label: '💅 Spas', value: 'spa' },
  // Professional Services
  { label: '⚖️ Lawyers', value: 'lawyer' },
  { label: '📊 Accountants', value: 'accountant' },
  { label: '🏡 Real Estate', value: 'real_estate_agency' },
  { label: '🛡️ Insurance', value: 'insurance_agency' },
  { label: '💰 Financial Advisors', value: 'financial_planner' },
  { label: '📸 Photographers', value: 'photographer' },
  // Food & Hospitality
  { label: '🍽️ Restaurants', value: 'restaurant' },
  { label: '☕ Cafes', value: 'cafe' },
  { label: '🍕 Bakeries', value: 'bakery' },
  { label: '🍸 Bars', value: 'bar' },
  { label: '🏨 Hotels', value: 'hotel' },
  // Retail & Personal
  { label: '🛍️ Retail Stores', value: 'store' },
  { label: '💇 Hair Salons', value: 'hair_care' },
  { label: '💄 Beauty Salons', value: 'beauty_salon' },
  { label: '🌸 Florists', value: 'florist' },
  { label: '💎 Jewelry Stores', value: 'jewelry_store' },
  { label: '🧺 Laundromats', value: 'laundry' },
  { label: '🩺 Pharmacies', value: 'pharmacy' },
  // Education & Care
  { label: '📚 Schools', value: 'school' },
  { label: '👶 Daycares', value: 'child_care_agency' },
  { label: '🎓 Tutoring', value: 'tutor' },
];

export default function CRM() {
  const navigate = useNavigate();
  
  // User roles hook
  const {
    currentUser,
    team,
    login,
    logout,
    hasPermission,
    isAdmin,
    canViewLead,
    canEditLead,
    canDeleteLead,
    addTeamMember,
    updateTeamMember,
    removeTeamMember
  } = useUserRole();

  // Get userName from currentUser for backward compatibility
  const userName = currentUser?.name || '';

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [leads, setLeads] = useState(() => JSON.parse(localStorage.getItem('leads') || '[]'));
  const leadsRef = useRef(leads); // Ref for current leads (for marker click handlers)
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState('map');
  const [filters, setFilters] = useState({ noWeb: false, noPhone: false, notCalled: false, status: '', maxReviews: '', sortBy: 'newest' });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mapsApiKey') || '');
  const [keyInput, setKeyInput] = useState('');
  const markers = useRef([]);
  const markerMap = useRef(new Map()); // Map of lead.id -> marker for efficient updates
  const searchCircle = useRef(null);
  const placesServiceDiv = useRef(null);
  const [mapReady, setMapReady] = useState(false); // Track if map is ready
  const updateMarkersTimer = useRef(null); // Debounce timer for marker updates
  const detailsQueue = useRef([]); // Queue for batching Places API calls
  const detailsProcessing = useRef(false); // Flag to prevent concurrent processing
  
  // Lead detail modal
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Lead search filter
  const [leadSearch, setLeadSearch] = useState('');
  
  // Bulk selection
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  
  // Quick action menu
  const [openMenuId, setOpenMenuId] = useState(null);
  const [quickNote, setQuickNote] = useState('');
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [sheetsUrlInput, setSheetsUrlInput] = useState(() => localStorage.getItem('sheetsUrl') || '');
  
  // Map search panel open (for unified leads view)
  const [mapSearchOpen, setMapSearchOpen] = useState(true);
  
  // Firebase is hardcoded and always connected
  const firebaseConnected = true;
  
  // Search controls
  const [radius, setRadius] = useState(8047); // 5 miles default
  const [customRadius, setCustomRadius] = useState(''); // Custom radius input
  const [businessType, setBusinessType] = useState('');
  const [searchCenter, setSearchCenter] = useState(null);
  const [droppedPin, setDroppedPin] = useState(null); // User-placed pin location
  const [pinDropMode, setPinDropMode] = useState(false); // Whether pin drop mode is active
  const pinDropModeRef = useRef(false); // Ref for pin drop mode (for map click handler)
  const radiusRef = useRef(8047); // Ref for radius (for map click handler)
  const droppedPinMarker = useRef(null); // Marker for dropped pin
  const [pagination, setPagination] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [locating, setLocating] = useState(false); // Track geolocation in progress
  const [locationError, setLocationError] = useState(null); // Location error message

  // Command palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const commandInputRef = useRef(null);

  // Quick Add Modal state
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const quickAddNameRef = useRef(null);

  // Toggle to show/hide lead markers on map
  const [showLeadMarkers, setShowLeadMarkers] = useState(true);

  // Keep refs in sync with state
  useEffect(() => { pinDropModeRef.current = pinDropMode; }, [pinDropMode]);
  useEffect(() => { radiusRef.current = radius; }, [radius]);
  
  // Update search circle when radius changes (if there's a dropped pin)
  useEffect(() => {
    if (droppedPin && mapInstance.current) {
      updateSearchCircle(droppedPin, radius);
    }
  }, [radius, droppedPin]);

  // Track if update came from Firebase to prevent re-sync
  const isFirebaseUpdate = useRef(false);
  const hasFirebaseLoaded = useRef(false); // Track if we've received initial Firebase data
  const deletedIds = useRef(new Set()); // Track deleted IDs to prevent re-syncing
  const firebaseSyncTimer = useRef(null); // Debounce timer for Firebase sync
  const pendingFirebaseUpdates = useRef(new Map()); // Pending updates to batch
  
  // Keep leadsRef in sync with leads state and sync changes to Firebase
  const prevLeadsRef = useRef([]);
  useEffect(() => { 
    leadsRef.current = leads;
    localStorage.setItem('leads', JSON.stringify(leads)); 
    // Debounce marker updates to prevent lag
    if (updateMarkersTimer.current) {
      clearTimeout(updateMarkersTimer.current);
    }
    updateMarkersTimer.current = setTimeout(() => {
      updateMarkers();
    }, 100); // 100ms debounce
    
    // Only sync to Firebase if:
    // 1. Firebase is connected
    // 2. Firebase has already loaded initial data (prevents localStorage overwriting Firebase)
    // 3. This update didn't come from Firebase itself
    if (firebaseConnected && hasFirebaseLoaded.current && leads.length > 0 && !isFirebaseUpdate.current) {
      leads.forEach(lead => {
        // Skip if this lead was recently deleted (don't re-add it)
        if (deletedIds.current.has(lead.id)) return;
        
        // Only sync to Firebase if the lead has been interacted with:
        // - Marked as a lead (isLead = true)
        // - Has notes
        // - Status changed from NEW
        // - Has call history
        const hasBeenInteractedWith = lead.isLead || 
          (lead.notes && lead.notes.trim() !== '') || 
          lead.status !== 'NEW' || 
          (lead.callHistory && lead.callHistory.length > 0);
        
        if (!hasBeenInteractedWith) return;
        
        const prevLead = prevLeadsRef.current.find(l => l.id === lead.id);
        // If lead is new or updated, queue for Firebase sync
        if (!prevLead || lead.lastUpdated !== prevLead.lastUpdated) {
          pendingFirebaseUpdates.current.set(lead.id, lead);
        }
      });
      
      // Debounce Firebase sync to batch multiple updates
      if (firebaseSyncTimer.current) {
        clearTimeout(firebaseSyncTimer.current);
      }
      firebaseSyncTimer.current = setTimeout(() => {
        pendingFirebaseUpdates.current.forEach(lead => {
          saveLead(lead);
        });
        pendingFirebaseUpdates.current.clear();
      }, 500); // 500ms debounce for Firebase writes
    }
    isFirebaseUpdate.current = false;
    prevLeadsRef.current = leads;
  }, [leads, firebaseConnected, showLeadMarkers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Command palette keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleCommandK = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        setCommandSearch('');
        setTimeout(() => commandInputRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handleCommandK);
    return () => document.removeEventListener('keydown', handleCommandK);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      
      // Esc to close modals
      if (e.key === 'Escape') {
        if (showQuickAddModal) setShowQuickAddModal(false);
        else if (showCommandPalette) setShowCommandPalette(false);
        else if (selectedLead) setSelectedLead(null);
        else if (showSettings) setShowSettings(false);
        else if (bulkMode) {
          setBulkMode(false);
          setSelectedLeadIds(new Set());
        }
      }
      // N to add new lead
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowQuickAddModal(true);
        setTimeout(() => quickAddNameRef.current?.focus(), 50);
      }
      // L to locate me
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        locateMe();
      }
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && tab === 'leads') {
        e.preventDefault();
        document.getElementById('lead-search-input')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedLead, showSettings, bulkMode, tab, showQuickAddModal, showCommandPalette]);

  // Firebase real-time sync - Only load leads that user has interacted with
  useEffect(() => {
    if (!firebaseConnected) return;
    const unsubscribe = subscribeToLeads((firebaseLeads) => {
      // Mark that we've received Firebase data
      hasFirebaseLoaded.current = true;
      // Mark this as a Firebase update to prevent re-syncing
      isFirebaseUpdate.current = true;
      // Filter out any leads that were recently deleted locally
      const filteredLeads = firebaseLeads.filter(lead => !deletedIds.current.has(lead.id));
      
      // Only keep Firebase leads that have been interacted with (saved leads)
      // This ensures old search results don't clutter new searches
      const savedFirebaseLeads = filteredLeads.filter(lead => 
        lead.isLead || 
        (lead.notes && lead.notes.trim() !== '') || 
        lead.status !== 'NEW' || 
        (lead.callHistory && lead.callHistory.length > 0)
      );
      
      setLeads(prev => {
        // Keep current search results that haven't been saved yet
        const currentSearchResults = prev.filter(lead => {
          const inFirebase = savedFirebaseLeads.some(fl => fl.id === lead.id);
          const hasBeenInteractedWith = lead.isLead || 
            (lead.notes && lead.notes.trim() !== '') || 
            lead.status !== 'NEW' || 
            (lead.callHistory && lead.callHistory.length > 0);
          // Keep local leads that are not in Firebase AND haven't been interacted with
          return !inFirebase && !hasBeenInteractedWith;
        });
        // Combine saved Firebase leads with current search results
        return [...savedFirebaseLeads, ...currentSearchResults];
      });
    });
    return unsubscribe;
  }, [firebaseConnected]);

  useEffect(() => {
    if (!apiKey) return;
    
    // Check if Google Maps is already loaded
    if (window.google?.maps?.Map) { 
      initMap(); 
      return; 
    }
    
    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for google.maps.Map to be available
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(checkLoaded);
          initMap();
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Wait for google.maps.Map to be available
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(checkLoaded);
          initMap();
        }
      }, 100);
    };
    script.onerror = () => alert('Failed to load Google Maps. Check your API key.');
    document.head.appendChild(script);
  }, [apiKey]);

  function initMap() {
    if (!mapRef.current || mapInstance.current) return;
    if (!window.google?.maps) return;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 }, zoom: 4,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0e' }] },
      ],
      disableDefaultUI: true, zoomControl: true,
    });
    // Mark map as ready after tiles load
    window.google.maps.event.addListenerOnce(mapInstance.current, 'tilesloaded', () => {
      setMapReady(true);
    });
    // Update search center when map is moved
    mapInstance.current.addListener('idle', () => {
      const center = mapInstance.current.getCenter();
      setSearchCenter({ lat: center.lat(), lng: center.lng() });
    });
    // Click to drop pin when in pin drop mode
    mapInstance.current.addListener('click', (e) => {
      if (pinDropModeRef.current) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setDroppedPin({ lat, lng });
        setPinDropMode(false);
        // Update dropped pin marker
        if (droppedPinMarker.current) {
          droppedPinMarker.current.setPosition({ lat, lng });
        } else {
          droppedPinMarker.current = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#a855f7',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3,
            },
            title: 'Search Center',
            zIndex: 9999,
          });
        }
        // Update search circle to show from dropped pin
        updateSearchCircle({ lat, lng }, radiusRef.current);
      }
    });
    updateMarkers();
  }

  function updateSearchCircle(center, radiusVal) {
    if (searchCircle.current) {
      searchCircle.current.setMap(null);
    }
    if (!mapInstance.current || !window.google || !center) return;
    searchCircle.current = new window.google.maps.Circle({
      map: mapInstance.current,
      center: center,
      radius: radiusVal,
      fillColor: '#a855f7',
      fillOpacity: 0.1,
      strokeColor: '#a855f7',
      strokeOpacity: 0.4,
      strokeWeight: 2,
    });
  }

  // Get color for lead status
  function getStatusColor(status) {
    const statusObj = LEAD_STATUSES.find(s => s.value === status);
    return statusObj ? statusObj.color : '#3b82f6'; // Default to NEW (blue)
  }

  function updateMarkers() {
    if (!mapInstance.current || !window.google) return;
    
    // If markers are hidden, remove all markers from map
    if (!showLeadMarkers) {
      markerMap.current.forEach(marker => marker.setMap(null));
      markerMap.current.clear();
      markers.current = [];
      return;
    }
    
    const currentLeadIds = new Set(leads.filter(l => l.lat && l.lng).map(l => l.id));
    const existingMarkerIds = new Set(markerMap.current.keys());
    
    // Remove markers for leads that no longer exist
    existingMarkerIds.forEach(id => {
      if (!currentLeadIds.has(id)) {
        const marker = markerMap.current.get(id);
        if (marker) {
          marker.setMap(null);
          markerMap.current.delete(id);
        }
      }
    });
    
    // Update or create markers
    leads.forEach(lead => {
      if (!lead.lat || !lead.lng) return;
      
      const existingMarker = markerMap.current.get(lead.id);
      const newColor = getStatusColor(lead.status);
      
      if (existingMarker) {
        // Update existing marker's icon color if status changed
        const currentIcon = existingMarker.getIcon();
        if (currentIcon.fillColor !== newColor) {
          existingMarker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: newColor,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2
          });
        }
        // Update position if changed
        const pos = existingMarker.getPosition();
        if (pos.lat() !== lead.lat || pos.lng() !== lead.lng) {
          existingMarker.setPosition({ lat: lead.lat, lng: lead.lng });
        }
      } else {
        // Create new marker - only animate new markers, not updates
        const isNewMarker = !existingMarkerIds.has(lead.id);
        const marker = new window.google.maps.Marker({
          position: { lat: lead.lat, lng: lead.lng },
          map: mapInstance.current,
          icon: { 
            path: window.google.maps.SymbolPath.CIRCLE, 
            scale: 8, 
            fillColor: newColor, 
            fillOpacity: 1, 
            strokeColor: '#fff', 
            strokeWeight: 2 
          },
          animation: isNewMarker ? window.google.maps.Animation.DROP : null,
          title: lead.name,
          optimized: true, // Enable marker optimization
        });
        
        marker.leadId = lead.id;
        
        marker.addListener('click', () => {
          const currentLead = leadsRef.current.find(l => l.id === marker.leadId);
          if (currentLead) setSelectedLead(currentLead);
        });
        
        markerMap.current.set(lead.id, marker);
      }
    });
    
    // Keep markers.current in sync for backward compatibility
    markers.current = Array.from(markerMap.current.values());
  }

  function search(loadMore = false) {
    if (!mapInstance.current) return;
    
    // If loading more, use the pagination object
    if (loadMore && pagination) {
      setSearching(true);
      pagination.nextPage();
      return;
    }
    
    if (!businessType) {
      alert('Please select a business type/industry');
      return;
    }
    
    setSearching(true);
    
    // Use dropped pin location if set, otherwise use map center
    let centerLat, centerLng;
    if (droppedPin) {
      centerLat = droppedPin.lat;
      centerLng = droppedPin.lng;
    } else {
      const center = mapInstance.current.getCenter();
      centerLat = center.lat();
      centerLng = center.lng();
    }
    
    // Show search radius circle
    updateSearchCircle({ lat: centerLat, lng: centerLng }, radius);
    
    // Build search query - use value (clean text) not label (has emoji)
    let searchQuery = query.trim();
    const selectedType = BUSINESS_TYPES.find(t => t.value === businessType);
    
    // Handle "All Industries" - search multiple industry types
    if (businessType === 'all') {
      // Search across multiple industry keywords for comprehensive results
      const industryKeywords = [
        'contractor', 'plumber', 'electrician', 'hvac', 'restaurant', 
        'salon', 'auto repair', 'dentist', 'lawyer', 'real estate',
        'landscaper', 'cleaning service', 'gym', 'retail store'
      ];
      
      const service = new window.google.maps.places.PlacesService(mapInstance.current);
      const allResults = new Map(); // Use Map to dedupe by place_id
      let completedSearches = 0;
      const totalSearches = industryKeywords.length;
      
      console.log(`Starting All Industries search with ${totalSearches} keywords...`);
      
      // Search each industry keyword
      industryKeywords.forEach((keyword, index) => {
        // Stagger requests to avoid rate limiting
        setTimeout(() => {
          const searchTerm = query.trim() ? `${keyword} ${query.trim()}` : keyword;
          
          service.textSearch({
            query: searchTerm,
            location: { lat: centerLat, lng: centerLng },
            radius: radius,
          }, (results, status) => {
            completedSearches++;
            
            if (status === 'OK' && results) {
              // Filter by radius and add to results map
              results.forEach(p => {
                const lat = p.geometry.location.lat();
                const lng = p.geometry.location.lng();
                const distance = getDistanceMeters(centerLat, centerLng, lat, lng);
                if (distance <= radius && !allResults.has(p.place_id)) {
                  allResults.set(p.place_id, {
                    ...p,
                    searchKeyword: keyword // Track which keyword found it
                  });
                }
              });
            }
            
            console.log(`Search ${completedSearches}/${totalSearches}: "${keyword}" found ${results?.length || 0} results`);
            
            // When all searches complete, process the combined results
            if (completedSearches === totalSearches) {
              setSearching(false);
              
              const combinedResults = Array.from(allResults.values());
              console.log(`All Industries search complete: ${combinedResults.length} unique businesses found`);
              
              if (combinedResults.length === 0) {
                alert('No businesses found in this area. Try expanding your radius.');
                return;
              }
              
              const newLeads = combinedResults.map(p => ({
                id: p.place_id, name: p.name, address: p.formatted_address,
                lat: p.geometry.location.lat(), lng: p.geometry.location.lng(),
                phone: null, website: null,
                detailsFetched: false,
                source: 'google_maps',
                status: 'NEW',
                notes: '',
                addedBy: currentUser?.name || 'Unknown',
                assignedTo: '',
                callHistory: [],
                addedAt: Date.now(),
                lastUpdated: Date.now(),
                rating: p.rating || null, userRatingsTotal: p.user_ratings_total || 0,
                businessType: p.searchKeyword || 'all',
                isLead: false,
              }));
              
              // Replace leads with fresh search results
              setLeads(prev => {
                const savedLeads = prev.filter(l => 
                  l.isLead || 
                  (l.notes && l.notes.trim() !== '') || 
                  l.status !== 'NEW' || 
                  (l.callHistory && l.callHistory.length > 0)
                );
                const savedIds = new Set(savedLeads.map(l => l.id));
                const freshLeads = newLeads.filter(l => !savedIds.has(l.id));
                return [...savedLeads, ...freshLeads];
              });
              setTab('leads');
              
              // Queue details fetching
              queueDetailsForLeads(newLeads.map(l => l.id), service);
            }
          });
        }, index * 150); // 150ms between each search to avoid rate limiting
      });
      
      return; // Exit early - the callbacks will handle the rest
    }
    
    // Regular single-industry search
    if (businessType && selectedType) {
      // Use the value (e.g. "plumber") instead of label (e.g. "🔧 Plumbers") for better search results
      const cleanType = selectedType.value.replace(/_/g, ' '); // Convert "general_contractor" to "general contractor"
      searchQuery = searchQuery ? `${cleanType} ${searchQuery}` : cleanType;
    }
    
    console.log('Searching for:', searchQuery, 'at', centerLat, centerLng, 'radius:', radius);
    
    // Use textSearch with location bias
    const service = new window.google.maps.places.PlacesService(mapInstance.current);
    
    service.textSearch({
      query: searchQuery,
      location: { lat: centerLat, lng: centerLng },
      radius: radius,
    }, (results, status) => {
      console.log('Search results:', status, results?.length || 0, 'results');
      setSearching(false);
      if (status !== 'OK' || !results) {
        if (status === 'ZERO_RESULTS') {
          alert('No results found in this area. Try expanding your radius or moving the map.');
        } else {
          alert('Search failed: ' + status);
        }
        return;
      }
      
      // Filter results by distance from center
      const filteredResults = results.filter(p => {
        const lat = p.geometry.location.lat();
        const lng = p.geometry.location.lng();
        const distance = getDistanceMeters(centerLat, centerLng, lat, lng);
        return distance <= radius;
      });
      
      console.log('Filtered to', filteredResults.length, 'results within radius');
      
      if (filteredResults.length === 0) {
        alert('No results found within your selected radius. Try expanding it.');
        return;
      }
      
      const newLeads = filteredResults.map(p => ({
        id: p.place_id, name: p.name, address: p.formatted_address,
        lat: p.geometry.location.lat(), lng: p.geometry.location.lng(),
        phone: null, website: null, 
        detailsFetched: false,   // Track if we've fetched phone/website details
        source: 'google_maps',   // Lead source
        status: 'NEW',           // Lead status
        notes: '',               // User notes
        addedBy: currentUser?.name || 'Unknown',       // Who added this lead
        assignedTo: '',          // Who's handling it
        callHistory: [],         // Array of call logs
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        rating: p.rating || null, userRatingsTotal: p.user_ratings_total || 0,
        businessType: businessType, // Store the searched business type
        isLead: false,           // Must be marked as lead to show on sheet
      }));
      
      // Replace leads with fresh search results (keep only leads marked as isLead or with notes/status changes)
      setLeads(prev => {
        // Keep leads that user has interacted with (marked as lead, has notes, status changed, or has call history)
        const savedLeads = prev.filter(l => 
          l.isLead || 
          (l.notes && l.notes.trim() !== '') || 
          l.status !== 'NEW' || 
          (l.callHistory && l.callHistory.length > 0)
        );
        // Add new leads that aren't already saved
        const savedIds = new Set(savedLeads.map(l => l.id));
        const freshLeads = newLeads.filter(l => !savedIds.has(l.id));
        return [...savedLeads, ...freshLeads];
      });
      setTab('leads');
      
      // Queue details fetching with throttling to prevent API rate limiting
      queueDetailsForLeads(newLeads.map(l => l.id), service);
    });
  }
  
  // Process details queue with rate limiting
  // Google Places API allows ~10 QPS, so we do 10 parallel requests with 100ms between batches
  function processDetailsQueue() {
    if (detailsProcessing.current || detailsQueue.current.length === 0) return;
    if (!mapInstance.current) return;
    
    detailsProcessing.current = true;
    const service = new window.google.maps.places.PlacesService(mapInstance.current);
    
    // Process 10 items at a time with 100ms delay between batches (faster!)
    const processBatch = () => {
      if (detailsQueue.current.length === 0) {
        detailsProcessing.current = false;
        return;
      }
      
      const batch = detailsQueue.current.splice(0, 10); // Increased from 5 to 10
      batch.forEach(placeId => {
        service.getDetails({ placeId, fields: ['formatted_phone_number', 'website', 'international_phone_number'] }, (place, status) => {
          // Mark as fetched regardless of result
          setLeads(prev => prev.map(l => l.id === placeId ? { 
            ...l, 
            phone: place?.formatted_phone_number || place?.international_phone_number || null, 
            website: place?.website || null, 
            detailsFetched: true,
            lastUpdated: Date.now() 
          } : l));
        });
      });
      
      // Wait 100ms before next batch (reduced from 200ms)
      setTimeout(processBatch, 100);
    };
    
    processBatch();
  }
  
  // Queue details for fetching
  function queueDetailsForLeads(placeIds, service) {
    // Filter out any already queued or already fetched
    const newIds = placeIds.filter(id => {
      // Check if already in the queue
      if (detailsQueue.current.includes(id)) return false;
      // Check if already fetched (look up in leadsRef if available)
      const lead = leadsRef.current.find(l => l.id === id);
      // If lead exists in ref and details already fetched, skip it
      if (lead && lead.detailsFetched) return false;
      // Otherwise queue it (including new leads not yet in ref)
      return true;
    });
    
    detailsQueue.current.push(...newIds);
    processDetailsQueue();
  }
  
  // Calculate distance between two points in meters
  function getDistanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Handle pagination results
  useEffect(() => {
    if (!pagination) return;
    
    const handlePagination = (results, status, paginationObj) => {
      setSearching(false);
      if (status !== 'OK' || !results) return;
      
      if (paginationObj && paginationObj.hasNextPage) {
        setPagination(paginationObj);
        setHasMore(true);
      } else {
        setPagination(null);
        setHasMore(false);
      }
      
      const newLeads = results.map(p => ({
        id: p.place_id, name: p.name, address: p.vicinity || p.formatted_address,
        lat: p.geometry.location.lat(), lng: p.geometry.location.lng(),
        phone: null, website: null, 
        source: 'google_maps',   // Lead source
        status: 'NEW',
        notes: '',
        addedBy: currentUser?.name || 'Unknown',
        assignedTo: '',
        callHistory: [],
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        rating: p.rating || null, userRatingsTotal: p.user_ratings_total || 0,
        businessType: businessType,
        isLead: false,           // Must be marked as lead to show on sheet
      }));
      
      // Add leads to state first, then queue details fetching
      setLeads(prev => { const ids = new Set(prev.map(l => l.id)); return [...prev, ...newLeads.filter(l => !ids.has(l.id))]; });
      
      // Queue details with rate limiting
      queueDetailsForLeads(newLeads.map(l => l.id));
    };
    
    // This effect runs when pagination changes, but the actual callback happens in loadMore
  }, [pagination, userName]);

  // Sync lead to Google Sheets (only if marked as lead)
  async function syncToSheet(lead, action = 'update') {
    const sheetsUrl = localStorage.getItem('sheetsUrl');
    if (!sheetsUrl) return; // No sheets URL configured
    if (!lead.isLead) return; // Only sync leads marked for sheet
    
    try {
      // Find the business type label
      const businessTypeLabel = BUSINESS_TYPES.find(b => b.value === lead.businessType)?.label || lead.businessType || 'Unknown';
      
      await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors', // Required for Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          placeId: lead.id,
          name: lead.name,
          phone: lead.phone || 'N/A',
          address: lead.address,
          status: lead.status,
          businessType: businessTypeLabel,
          notes: lead.notes || '',
          markedBy: userName,
          date: new Date().toISOString(),
          reviews: lead.userRatingsTotal || 0,
        })
      });
    } catch (err) {
      console.log('Sheet sync error (may still work):', err);
    }
  }

  // Update a lead's properties
  function updateLead(id, updates) {
    setLeads(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, ...updates, lastUpdated: Date.now() } : l);
      // Sync to sheet if marked as lead
      const lead = updated.find(l => l.id === id);
      if (lead && lead.isLead) {
        syncToSheet(lead);
      }
      return updated;
    });
  }

  // Mark/unmark a lead for the sheet
  function toggleMarkAsLead(id) {
    setLeads(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, isLead: !l.isLead, lastUpdated: Date.now() } : l);
      const lead = updated.find(l => l.id === id);
      // Sync to Firebase
      if (lead && firebaseConnected) {
        updateFirebaseLead(lead.id, lead);
      }
      // Sync to sheet if now marked as lead
      if (lead && lead.isLead) {
        syncToSheet(lead);
      }
      return updated;
    });
  }

  // Update lead status
  function updateLeadStatus(id, newStatus) {
    setLeads(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, status: newStatus, lastUpdated: Date.now() } : l);
      const lead = updated.find(l => l.id === id);
      // Sync to sheet if marked as lead
      if (lead && lead.isLead) {
        syncToSheet(lead);
      }
      // Sync to Firebase
      if (lead && firebaseConnected) {
        updateFirebaseLead(lead.id, lead);
      }
      return updated;
    });
  }

  // Add a call log to a lead
  function logCall(id, outcome, notes) {
    setLeads(prev => {
      const updated = prev.map(l => {
        if (l.id !== id) return l;
        const callLog = {
          date: Date.now(),
          user: userName,
          outcome,
          notes
        };
        return { 
          ...l, 
          callHistory: [...(l.callHistory || []), callLog],
          lastUpdated: Date.now()
        };
      });
      // Sync to Firebase
      const lead = updated.find(l => l.id === id);
      if (lead && firebaseConnected) {
        updateFirebaseLead(lead.id, lead);
      }
      return updated;
    });
  }

  function removeLead(id) { 
    // Add to deleted IDs set to prevent re-syncing
    deletedIds.current.add(id);
    
    // Remove from local state
    setLeads(prev => prev.filter(l => l.id !== id)); 
    if (selectedLead?.id === id) setSelectedLead(null);
    
    // Sync delete to Firebase
    if (firebaseConnected) {
      deleteLead(id)
        .then(() => {
          console.log('Lead deleted from Firebase:', id);
          // Clear from deleted set after a delay to allow for sync cycles
          setTimeout(() => deletedIds.current.delete(id), 5000);
        })
        .catch(err => {
          console.error('Firebase delete error:', err);
          // Remove from deleted set on error so it can be retried
          deletedIds.current.delete(id);
        });
    }
  }

  function clearAllLeads() {
    if (window.confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) {
      // Get current leads and delete each from Firebase
      const currentLeads = [...leads];
      currentLeads.forEach(lead => {
        deletedIds.current.add(lead.id);
        if (firebaseConnected) {
          deleteLead(lead.id)
            .then(() => setTimeout(() => deletedIds.current.delete(lead.id), 5000))
            .catch(err => console.error('Firebase delete error:', err));
        }
      });
      setLeads([]);
      setSelectedLead(null);
    }
  }

  function zoomToLead(lead) {
    if (mapInstance.current && lead.lat && lead.lng) {
      mapInstance.current.panTo({ lat: lead.lat, lng: lead.lng });
      mapInstance.current.setZoom(15);
    }
  }

  // Track geolocation watch ID for cancellation
  const geoWatchId = useRef(null);

  // Locate user using browser geolocation
  function locateMe() {
    // If already locating, cancel it
    if (locating) {
      if (geoWatchId.current !== null) {
        navigator.geolocation.clearWatch(geoWatchId.current);
        geoWatchId.current = null;
      }
      setLocating(false);
      setLocationError(null);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setTimeout(() => setLocationError(null), 3000);
      return;
    }
    
    if (!mapInstance.current || !window.google) {
      setLocationError('Map still loading...');
      setTimeout(() => setLocationError(null), 3000);
      return;
    }
    
    setLocating(true);
    setLocationError(null);

    // Use watchPosition for faster response, then clear it
    geoWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        // Clear watch immediately after first success
        if (geoWatchId.current !== null) {
          navigator.geolocation.clearWatch(geoWatchId.current);
          geoWatchId.current = null;
        }

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        console.log('Located at:', lat, lng);
        
        // Set as dropped pin location
        setDroppedPin({ lat, lng });
        
        // Update or create dropped pin marker
        if (droppedPinMarker.current) {
          droppedPinMarker.current.setPosition({ lat, lng });
        } else {
          droppedPinMarker.current = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#a855f7',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 4,
            },
            title: 'Your Location',
            zIndex: 9999,
          });
        }
        
        // Zoom in first, then pan to location for smoother experience
        mapInstance.current.setZoom(15);
        setTimeout(() => {
          mapInstance.current.panTo({ lat, lng });
        }, 100);
        
        // Update search circle
        updateSearchCircle({ lat, lng }, radius);
        
        setLocating(false);
      },
      (error) => {
        // Clear watch on error
        if (geoWatchId.current !== null) {
          navigator.geolocation.clearWatch(geoWatchId.current);
          geoWatchId.current = null;
        }
        setLocating(false);
        
        let msg = 'Location error';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location access denied';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location unavailable';
            break;
          case error.TIMEOUT:
            msg = 'Location timed out - click to retry';
            break;
          default:
            msg = 'Location error';
        }
        setLocationError(msg);
        setTimeout(() => setLocationError(null), 4000);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );

    // Fallback timeout in case geolocation hangs
    setTimeout(() => {
      if (locating && geoWatchId.current !== null) {
        navigator.geolocation.clearWatch(geoWatchId.current);
        geoWatchId.current = null;
        setLocating(false);
        setLocationError('Location timed out - click to retry');
        setTimeout(() => setLocationError(null), 4000);
      }
    }, 6000);
  }

  // Calculate lead score (0-100)
  function getLeadScore(lead) {
    let score = 50; // Base score
    
    // No website = hot lead (+20)
    if (!lead.website) score += 20;
    
    // Has phone = can contact (+10)
    if (lead.phone) score += 10;
    
    // Good ratings boost
    if (lead.rating >= 4.5) score += 10;
    else if (lead.rating >= 4) score += 5;
    else if (lead.rating < 3 && lead.rating > 0) score -= 10;
    
    // Review count (established business)
    if (lead.userRatingsTotal >= 100) score += 10;
    else if (lead.userRatingsTotal >= 50) score += 5;
    else if (lead.userRatingsTotal < 10) score -= 5;
    
    // Status adjustments
    if (lead.status === 'INTERESTED') score += 15;
    if (lead.status === 'CALLBACK') score += 10;
    if (lead.status === 'REJECTED') score -= 30;
    
    return Math.max(0, Math.min(100, score));
  }

  // Bulk actions
  function toggleLeadSelection(id) {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedLeadIds(new Set(filtered.map(l => l.id)));
  }

  function clearSelection() {
    setSelectedLeadIds(new Set());
  }

  function bulkUpdateStatus(newStatus) {
    selectedLeadIds.forEach(id => {
      updateLeadStatus(id, newStatus);
    });
    setSelectedLeadIds(new Set());
    setBulkMode(false);
  }

  function bulkDelete() {
    if (window.confirm(`Delete ${selectedLeadIds.size} leads? This cannot be undone.`)) {
      selectedLeadIds.forEach(id => {
        removeLead(id);
      });
      setSelectedLeadIds(new Set());
      setBulkMode(false);
    }
  }

  function bulkMarkAsLead(markAs = true) {
    selectedLeadIds.forEach(id => {
      setLeads(prev => {
        const updated = prev.map(l => l.id === id ? { ...l, isLead: markAs, lastUpdated: Date.now() } : l);
        const lead = updated.find(l => l.id === id);
        if (lead && firebaseConnected) {
          updateFirebaseLead(lead.id, lead);
        }
        if (lead && lead.isLead) {
          syncToSheet(lead);
        }
        return updated;
      });
    });
    setSelectedLeadIds(new Set());
    setBulkMode(false);
  }

  // Copy to clipboard helper
  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      // Brief visual feedback could be added here
    }).catch(err => console.error('Copy failed:', err));
  }

  // Add manual lead
  function addManualLead(lead) {
    // Add to leads and auto-save to Firebase since it's manually entered
    setLeads(prev => {
      const updated = [...prev, lead];
      // Save to Firebase immediately
      if (firebaseConnected) {
        saveLead(lead);
      }
      return updated;
    });
  }

  // Filter leads based on user permissions
  const visibleLeads = leads.filter(lead => canViewLead(lead));

  // Filter leads based on current filters, search, AND user permissions
  const filtered = visibleLeads.filter(l => {
    // Text search filter
    if (leadSearch) {
      const searchLower = leadSearch.toLowerCase();
      const matchesName = l.name?.toLowerCase().includes(searchLower);
      const matchesAddress = l.address?.toLowerCase().includes(searchLower);
      const matchesPhone = l.phone?.includes(leadSearch);
      if (!matchesName && !matchesAddress && !matchesPhone) return false;
    }
    // Only apply no-website filter to leads where details have been fetched (or legacy leads without the flag)
    if (filters.noWeb && (l.website || l.detailsFetched === false)) return false;
    // Only apply no-phone filter to leads where details have been fetched (or legacy leads without the flag)
    if (filters.noPhone && (l.phone || l.detailsFetched === false)) return false;
    if (filters.notCalled && l.status !== 'NEW') return false; // Show only NEW leads
    if (filters.status && l.status !== filters.status) return false;
    if (filters.maxReviews && l.userRatingsTotal > parseInt(filters.maxReviews)) return false;
    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'reviews-low': return (a.userRatingsTotal || 0) - (b.userRatingsTotal || 0);
      case 'reviews-high': return (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0);
      case 'rating-low': return (a.rating || 0) - (b.rating || 0);
      case 'rating-high': return (b.rating || 0) - (a.rating || 0);
      case 'name': return (a.name || '').localeCompare(b.name || '');
      case 'oldest': return (a.addedAt || 0) - (b.addedAt || 0);
      case 'score': return getLeadScore(b) - getLeadScore(a); // Highest score first
      case 'newest':
      default: return (b.addedAt || 0) - (a.addedAt || 0);
    }
  });

  // Get only marked leads (not NEW)
  const markedLeads = visibleLeads.filter(l => l.isLead);

  // Get leads for calling mode (filtered, with phone, not rejected/closed)
  const callableLeads = useMemo(() => {
    return filtered.filter(l => 
      l.phone && 
      l.status !== 'REJECTED' && 
      l.status !== 'CLOSED'
    );
  }, [filtered]);

  // Export marked leads to downloadable file
  function exportLeads() {
    const data = markedLeads.map(l => ({
      name: l.name,
      phone: l.phone || 'N/A',
      address: l.address,
      status: LEAD_STATUSES.find(s => s.value === l.status)?.label || l.status,
      businessType: BUSINESS_TYPES.find(b => b.value === l.businessType)?.label || l.businessType || 'Unknown',
      notes: l.notes || '',
      markedBy: l.addedBy,
      date: new Date(l.lastUpdated).toLocaleString(),
      reviews: l.userRatingsTotal || 0,
      rating: l.rating || 'N/A'
    }));
    
    // Create CSV
    const headers = ['Business Name', 'Phone', 'Address', 'Status', 'Business Type', 'Notes', 'Marked By', 'Date', 'Reviews', 'Rating'];
    const csv = [headers.join(','), ...data.map(row => 
      [row.name, row.phone, `"${row.address}"`, row.status, row.businessType, `"${row.notes}"`, row.markedBy, row.date, row.reviews, row.rating].join(',')
    )].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  function saveKey() { if (keyInput.trim()) { localStorage.setItem('mapsApiKey', keyInput.trim()); setApiKey(keyInput.trim()); } }

  // Show API key setup first
  if (!apiKey) {
    return (
      <div className="setup">
        <div className="setup-box">
          <h1>🗺️ Maps Lead Finder</h1>
          <p>Enter your Google Maps API key to get started</p>
          <input placeholder="AIzaSy..." value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKey()} />
          <button onClick={saveKey} disabled={!keyInput.trim()}>Start</button>
          <div className="help">
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Get API Key</a>
            <span> • Enable Maps JavaScript API + Places API</span>
          </div>
        </div>
      </div>
    );
  }

  // Show login selector if no user logged in
  if (!currentUser) {
    return <UserLoginSelector team={team} onLogin={login} />;
  }

  // Command palette results (computed here so leads is available)
  const commandResults = commandSearch.trim() 
    ? leads.filter(l => 
        l.name?.toLowerCase().includes(commandSearch.toLowerCase()) ||
        l.phone?.includes(commandSearch) ||
        l.address?.toLowerCase().includes(commandSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="app">
      <div className="map" ref={mapRef} />
      
      {/* Floating Map Controls - Outside Panel */}
      <div className="map-floating-controls">
        <button 
          className={`map-float-btn locate-me ${locating ? 'loading' : ''} ${locationError ? 'error' : ''}`}
          onClick={locateMe}
          title={locating ? 'Click to cancel' : locationError || 'Find my location'}
        >
          {locating ? '✕' : locationError ? '⚠️' : '📍'}
        </button>
        {locationError && (
          <div className="location-error-toast">{locationError}</div>
        )}
        <button 
          className={`map-float-btn toggle-markers ${showLeadMarkers ? 'active' : ''}`}
          onClick={() => setShowLeadMarkers(!showLeadMarkers)}
          title={showLeadMarkers ? 'Hide lead pins' : 'Show lead pins'}
        >
          {showLeadMarkers ? '📌' : '👁️'}
        </button>
        <button 
          className={`map-float-btn search-cmd`}
          onClick={() => { setShowCommandPalette(true); setTimeout(() => commandInputRef.current?.focus(), 50); }}
          title="Quick search (Ctrl+K)"
        >
          🔍
        </button>
      </div>

      {/* Command Palette - Quick Search */}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={e => e.stopPropagation()}>
            <div className="command-input-wrap">
              <span className="command-icon">🔍</span>
              <input
                ref={commandInputRef}
                type="text"
                placeholder="Search leads by name, phone, address..."
                value={commandSearch}
                onChange={e => setCommandSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setShowCommandPalette(false);
                  if (e.key === 'Enter' && commandResults.length > 0) {
                    setSelectedLead(commandResults[0]);
                    setShowCommandPalette(false);
                  }
                }}
              />
              <kbd>ESC</kbd>
            </div>
            {commandSearch && (
              <div className="command-results">
                {commandResults.length === 0 ? (
                  <div className="command-empty">No leads found</div>
                ) : (
                  commandResults.map(lead => {
                    const statusObj = LEAD_STATUSES.find(s => s.value === lead.status);
                    return (
                      <div 
                        key={lead.id} 
                        className="command-result"
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowCommandPalette(false);
                        }}
                      >
                        <span className="cr-status" style={{ background: statusObj?.color }}></span>
                        <div className="cr-info">
                          <span className="cr-name">{lead.name}</span>
                          <span className="cr-details">{lead.phone || 'No phone'} • {lead.address?.split(',')[0]}</span>
                        </div>
                        <span className="cr-arrow">→</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            <div className="command-hint">
              <span>🆕 <kbd>N</kbd> New Lead</span>
              <span>📍 <kbd>L</kbd> Locate Me</span>
              <span>⏎ Enter to select</span>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal 
          lead={selectedLead}
          statuses={LEAD_STATUSES}
          teamMembers={team.map(t => t.name)}
          currentUser={currentUser}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updates) => {
            if (canEditLead(selectedLead)) {
              updateLead(selectedLead.id, updates);
              setSelectedLead(prev => ({ ...prev, ...updates }));
            }
          }}
          onStatusChange={(status) => {
            if (canEditLead(selectedLead)) {
              updateLeadStatus(selectedLead.id, status);
              setSelectedLead(prev => ({ ...prev, status }));
            }
          }}
          onToggleLead={() => {
            if (canEditLead(selectedLead)) {
              toggleMarkAsLead(selectedLead.id);
              setSelectedLead(prev => ({ ...prev, isLead: !prev.isLead }));
            }
          }}
          onLogCall={(outcome, notes) => {
            logCall(selectedLead.id, outcome, notes);
          }}
          onDelete={() => {
            if (canDeleteLead()) {
              removeLead(selectedLead.id);
            }
          }}
          onZoom={() => { zoomToLead(selectedLead); setSelectedLead(null); }}
          canEdit={canEditLead(selectedLead)}
          canDelete={canDeleteLead()}
        />
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Settings</h2>
              <button onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <label>🔥 Firebase Sync <span style={{color: '#22c55e'}}>● Connected</span></label>
                <p className="help-text">Real-time team sync is active. All leads sync automatically between team members.</p>
                <div className="firebase-status-box">
                  <span className="status-indicator-dot connected"></span>
                  <span>njdevelopmentsales</span>
                </div>
              </div>
              <div className="modal-section">
                <label>Google Sheets Web App URL</label>
                <p className="help-text">Paste your Apps Script deployment URL to sync leads</p>
                <input 
                  type="text"
                  placeholder="https://script.google.com/macros/s/..."
                  value={sheetsUrlInput}
                  onChange={e => setSheetsUrlInput(e.target.value)}
                  className="settings-input"
                />
                <button 
                  className="save-settings-btn"
                  onClick={() => {
                    localStorage.setItem('sheetsUrl', sheetsUrlInput);
                    setShowSettings(false);
                    alert('Sheets URL saved! Leads will now sync automatically.');
                  }}
                >
                  💾 Save Settings
                </button>
              </div>
              <div className="modal-section">
                <label>Current Profile</label>
                <p className="help-text">Switch between team members</p>
                <div className="profile-switch">
                  {team.map(member => (
                    <button 
                      key={member.id}
                      className={`profile-option ${currentUser?.id === member.id ? 'active' : ''}`}
                      onClick={() => login(member.id)}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-section">
                <label>Danger Zone</label>
                <button className="danger-btn" onClick={() => {
                  if (window.confirm('Reset everything? This clears all local data.')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}>
                  🗑️ Reset All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className={`panel ${panelOpen ? '' : 'closed'}`}>
        <div className="panel-header">
          <button className="toggle-btn" onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? '◀' : '▶'}</button>
          {panelOpen && (
            <div className="tabs">
              <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>� Search <span className="count">{filtered.length}</span></button>
              <a href="/sheet" className="tab-link">📊 Full Sheet →</a>
            </div>
          )}
          {panelOpen && (
            <div className="header-actions">
              <a href="/sheet" className="icon-btn" title="Full Spreadsheet">📑</a>
              <a href="/" className="icon-btn" title="Back to Home">🏠</a>
              <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
            </div>
          )}
        </div>
        {panelOpen && (
          <div className="panel-body">
            {tab === 'map' && (
              <div className="map-tab">
                {/* Search Controls */}
                <div className="search-controls-card">
                  <div className="search-row-main">
                    <select 
                      value={businessType} 
                      onChange={e => setBusinessType(e.target.value)} 
                      className="search-select"
                    >
                      {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <select 
                      value={radius} 
                      onChange={e => setRadius(parseInt(e.target.value))}
                      className="search-select small"
                    >
                      {RADIUS_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  
                  <div className="search-row-actions">
                    <button 
                      className={`action-btn pin ${pinDropMode ? 'active' : ''} ${droppedPin ? 'set' : ''}`}
                      onClick={() => setPinDropMode(!pinDropMode)}
                    >
                      📍 {droppedPin ? 'Pin Set' : pinDropMode ? 'Click Map' : 'Set Location'}
                    </button>
                    <button 
                      className="action-btn search-go"
                      onClick={() => search()} 
                      disabled={searching || !businessType}
                    >
                      {searching ? '⏳ Searching...' : '🔍 Search'}
                    </button>
                  </div>
                  
                  {pinDropMode && (
                    <div className="search-hint">👆 Click anywhere on the map to set search center</div>
                  )}
                </div>

                {/* Search Results / Leads List - MAIN CONTENT */}
                {leads.length > 0 && (
                  <div className="search-results-section main-results">
                    <div className="results-header">
                      <h4>📋 Results ({filtered.length})</h4>
                      <div className="results-filters">
                        <input
                          type="text"
                          placeholder="Filter results..."
                          value={leadSearch}
                          onChange={e => setLeadSearch(e.target.value)}
                          className="results-search"
                        />
                        <button 
                          className={`filter-chip ${filters.noWeb ? 'active' : ''}`}
                          onClick={() => setFilters(f => ({ ...f, noWeb: !f.noWeb }))}
                        >
                          🌐 No Website
                        </button>
                        <button 
                          className={`filter-chip ${filters.noPhone ? 'active' : ''}`}
                          onClick={() => setFilters(f => ({ ...f, noPhone: !f.noPhone }))}
                        >
                          📵 No Phone
                        </button>
                      </div>
                    </div>
                    
                    {/* Status Filter Tabs */}
                    <div className="status-tabs">
                      <button 
                        className={filters.status === '' ? 'active' : ''}
                        onClick={() => setFilters(f => ({ ...f, status: '' }))}
                      >
                        All <span className="cnt">{leads.length}</span>
                      </button>
                      <button 
                        className={filters.status === 'NEW' ? 'active' : ''}
                        onClick={() => setFilters(f => ({ ...f, status: 'NEW' }))}
                      >
                        New <span className="cnt">{leads.filter(l => l.status === 'NEW').length}</span>
                      </button>
                      <button 
                        className={filters.status === 'CALLBACK' ? 'active' : ''}
                        onClick={() => setFilters(f => ({ ...f, status: 'CALLBACK' }))}
                      >
                        Callback <span className="cnt">{leads.filter(l => l.status === 'CALLBACK').length}</span>
                      </button>
                      <button 
                        className={filters.status === 'INTERESTED' ? 'active' : ''}
                        onClick={() => setFilters(f => ({ ...f, status: 'INTERESTED' }))}
                      >
                        Hot <span className="cnt">{leads.filter(l => l.status === 'INTERESTED').length}</span>
                      </button>
                    </div>
                    
                    {/* Scrollable Lead List */}
                    <div className="leads-list">
                      {filtered.length === 0 && (
                        <div className="empty-state">
                          {leadSearch ? 'No leads match your search' : 'No leads match filters'}
                        </div>
                      )}
                      {filtered.map(lead => {
                        const statusObj = LEAD_STATUSES.find(s => s.value === lead.status) || LEAD_STATUSES[0];
                        return (
                          <div 
                            key={lead.id} 
                            className={`lead-card ${lead.status === 'INTERESTED' ? 'hot' : ''}`}
                            onClick={() => setSelectedLead(lead)}
                          >
                            <div className="lead-card-header">
                              <span className="lead-name">{lead.name}</span>
                              <span className={`lead-status ${lead.status.toLowerCase()}`}>
                                {statusObj.label}
                              </span>
                            </div>
                            <div className="lead-card-body">
                              <span className="lead-address">📍 {lead.address}</span>
                              {lead.phone && (
                                <a 
                                  href={`tel:${lead.phone}`} 
                                  className="lead-phone"
                                  onClick={e => e.stopPropagation()}
                                >
                                  📞 {lead.phone}
                                </a>
                              )}
                            </div>
                            {/* Quick Status Buttons */}
                            <div className="lead-card-actions" onClick={e => e.stopPropagation()}>
                              <button 
                                className={`status-quick-btn called ${lead.status === 'CALLED' ? 'active' : ''}`}
                                onClick={() => updateLeadStatus(lead.id, 'CALLED')}
                                title="Mark as Called"
                              >📞</button>
                              <button 
                                className={`status-quick-btn callback ${lead.status === 'CALLBACK' ? 'active' : ''}`}
                                onClick={() => updateLeadStatus(lead.id, 'CALLBACK')}
                                title="Schedule Callback"
                              >🔄</button>
                              <button 
                                className={`status-quick-btn interested ${lead.status === 'INTERESTED' ? 'active' : ''}`}
                                onClick={() => updateLeadStatus(lead.id, 'INTERESTED')}
                                title="Mark Interested"
                              >✅</button>
                              <button 
                                className={`status-quick-btn rejected ${lead.status === 'REJECTED' ? 'active' : ''}`}
                                onClick={() => updateLeadStatus(lead.id, 'REJECTED')}
                                title="Mark Rejected"
                              >❌</button>
                              <button 
                                className={`status-quick-btn add-sheet ${lead.isLead ? 'active' : ''}`}
                                onClick={() => {
                                  setLeads(prev => prev.map(l => 
                                    l.id === lead.id ? { ...l, isLead: true, lastUpdated: Date.now() } : l
                                  ));
                                }}
                                title={lead.isLead ? 'On Sheet ✓' : 'Add to Sheet'}
                              >📋</button>
                              <button 
                                className="status-quick-btn zoom"
                                onClick={() => zoomToLead(lead)}
                                title="Show on Map"
                              >🗺️</button>
                            </div>
                            <div className="lead-card-footer">
                              <span className={`source-tag ${lead.source || 'google_maps'}`}>
                                {lead.source === 'manual' ? '✏️ Manual' : '🗺️ Maps'}
                              </span>
                              {lead.detailsFetched === false && lead.source !== 'manual' && (
                                <span className="loading-tag">⏳</span>
                              )}
                              {lead.detailsFetched !== false && !lead.website && <span className="no-web-tag">No 🌐</span>}
                              {lead.detailsFetched !== false && !lead.phone && <span className="no-phone-tag">No 📞</span>}
                              {lead.notes && <span className="has-notes">📝</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Clear All Button */}
                    <button 
                      className="clear-all-btn"
                      onClick={clearAllLeads}
                      title="Delete all leads"
                    >
                      🗑️ Clear All Results
                    </button>
                  </div>
                )}

                {/* Quick Add Lead */}
                <div className="quick-add-card">
                  <div className="add-lead-header">➕ Quick Add Lead</div>
                  <div className="quick-add-row">
                    <input
                      type="text"
                      placeholder="Business name"
                      id="quick-add-name"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const nameInput = document.getElementById('quick-add-name');
                          const phoneInput = document.getElementById('quick-add-phone');
                          const lead = {
                            id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            name: nameInput.value.trim(),
                            phone: phoneInput.value.trim() || null,
                            address: 'Manual Entry',
                            lat: droppedPin?.lat || null,
                            lng: droppedPin?.lng || null,
                            website: null,
                            source: 'manual',
                            sourceDetails: {},
                            status: 'NEW',
                            notes: '',
                            addedBy: currentUser?.name || 'Unknown',
                            assignedTo: '',
                            callHistory: [],
                            addedAt: Date.now(),
                            lastUpdated: Date.now(),
                            businessType: businessType || 'other',
                            isLead: true,
                            rating: null,
                            userRatingsTotal: 0,
                          };
                          addManualLead(lead);
                          nameInput.value = '';
                          phoneInput.value = '';
                        }
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      id="quick-add-phone"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const nameInput = document.getElementById('quick-add-name');
                          if (nameInput.value.trim()) {
                            const phoneInput = document.getElementById('quick-add-phone');
                            const lead = {
                              id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              name: nameInput.value.trim(),
                              phone: phoneInput.value.trim() || null,
                              address: 'Manual Entry',
                              lat: droppedPin?.lat || null,
                              lng: droppedPin?.lng || null,
                              website: null,
                              source: 'manual',
                              sourceDetails: {},
                              status: 'NEW',
                              notes: '',
                              addedBy: currentUser?.name || 'Unknown',
                              assignedTo: '',
                              callHistory: [],
                              addedAt: Date.now(),
                              lastUpdated: Date.now(),
                              businessType: businessType || 'other',
                              isLead: true,
                              rating: null,
                              userRatingsTotal: 0,
                            };
                            addManualLead(lead);
                            nameInput.value = '';
                            phoneInput.value = '';
                          }
                        }
                      }}
                    />
                    <button 
                      className="quick-add-btn"
                      onClick={() => {
                        const nameInput = document.getElementById('quick-add-name');
                        const phoneInput = document.getElementById('quick-add-phone');
                        if (!nameInput.value.trim()) return;
                        const lead = {
                          id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          name: nameInput.value.trim(),
                          phone: phoneInput.value.trim() || null,
                          address: 'Manual Entry',
                          lat: droppedPin?.lat || null,
                          lng: droppedPin?.lng || null,
                          website: null,
                          source: 'manual',
                          sourceDetails: {},
                          status: 'NEW',
                          notes: '',
                          addedBy: currentUser?.name || 'Unknown',
                          assignedTo: '',
                          callHistory: [],
                          addedAt: Date.now(),
                          lastUpdated: Date.now(),
                          businessType: businessType || 'other',
                          isLead: true,
                          rating: null,
                          userRatingsTotal: 0,
                        };
                        addManualLead(lead);
                        nameInput.value = '';
                        phoneInput.value = '';
                      }}
                    >
                      ➕
                    </button>
                  </div>
                  <div className="quick-add-hint">Type name + phone, press Enter or click ➕</div>
                </div>
                
                {/* Quick Stats */}
                <div className="quick-stats">
                  <div className="stat-item">
                    <span className="stat-value">{leads.length}</span>
                    <span className="stat-label">Total Leads</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{leads.filter(l => l.status === 'NEW').length}</span>
                    <span className="stat-label">New</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{leads.filter(l => l.status === 'INTERESTED').length}</span>
                    <span className="stat-label">Interested</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Floating Action Button - Quick Add Lead */}
      <button 
        className="fab-add-lead"
        onClick={() => { setShowQuickAddModal(true); setTimeout(() => quickAddNameRef.current?.focus(), 50); }}
        title="Add New Lead (N)"
      >
        ➕
      </button>

      {/* Quick Add Lead Modal */}
      {showQuickAddModal && (
        <div className="modal-overlay" onClick={() => setShowQuickAddModal(false)}>
          <div className="quick-add-modal" onClick={e => e.stopPropagation()}>
            <div className="qam-header">
              <h3>➕ Add New Lead</h3>
              <button onClick={() => setShowQuickAddModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              const name = form.leadName.value.trim();
              if (!name) return;
              
              const lead = {
                id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                phone: form.leadPhone.value.trim() || null,
                address: form.leadAddress.value.trim() || 'Manual Entry',
                lat: droppedPin?.lat || null,
                lng: droppedPin?.lng || null,
                website: null,
                source: 'manual',
                sourceDetails: {},
                status: form.leadStatus.value || 'NEW',
                notes: form.leadNotes.value.trim() || '',
                addedBy: currentUser?.name || 'Unknown',
                assignedTo: '',
                callHistory: [],
                addedAt: Date.now(),
                lastUpdated: Date.now(),
                businessType: businessType || 'other',
                isLead: true,
                rating: null,
                userRatingsTotal: 0,
              };
              addManualLead(lead);
              setShowQuickAddModal(false);
            }}>
              <div className="qam-field">
                <label>Business Name *</label>
                <input 
                  ref={quickAddNameRef}
                  name="leadName" 
                  type="text" 
                  placeholder="e.g. Joe's Plumbing" 
                  required
                  autoComplete="off"
                />
              </div>
              <div className="qam-row">
                <div className="qam-field">
                  <label>Phone</label>
                  <input name="leadPhone" type="tel" placeholder="(555) 123-4567" />
                </div>
                <div className="qam-field">
                  <label>Status</label>
                  <select name="leadStatus" defaultValue="NEW">
                    {LEAD_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="qam-field">
                <label>Address</label>
                <input name="leadAddress" type="text" placeholder="123 Main St, City, State" />
              </div>
              <div className="qam-field">
                <label>Notes</label>
                <textarea name="leadNotes" rows="2" placeholder="Any notes about this lead..." />
              </div>
              <div className="qam-actions">
                <button type="button" className="qam-cancel" onClick={() => setShowQuickAddModal(false)}>Cancel</button>
                <button type="submit" className="qam-submit">➕ Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="legend">
        {LEAD_STATUSES.map(s => (
          <span key={s.value}><i style={{ background: s.color }}></i> {s.label.split(' ')[1]}</span>
        ))}
      </div>
      
      {/* Keyboard Shortcuts Hint */}
      <div className="keyboard-hints-bar">
        <span><kbd>N</kbd> New Lead</span>
        <span><kbd>L</kbd> Locate Me</span>
        <span><kbd>Ctrl</kbd>+<kbd>K</kbd> Search</span>
      </div>
    </div>
  );
}
