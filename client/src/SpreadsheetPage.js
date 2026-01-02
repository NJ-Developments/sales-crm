import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToLeads, updateFirebaseLead, deleteLead, saveLead } from './firebase';
import './SpreadsheetPage.css';

// Lead status options with colors and icons
const LEAD_STATUSES = ['NEW', 'CALLED', 'CALLBACK', 'INTERESTED', 'REJECTED', 'CLOSED'];
const STATUS_CONFIG = {
  NEW: { icon: '🆕', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  CALLED: { icon: '📞', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
  CALLBACK: { icon: '🔄', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  INTERESTED: { icon: '✅', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  REJECTED: { icon: '❌', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  CLOSED: { icon: '🏆', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' }
};

// Quick filter presets
const QUICK_FILTERS = [
  { id: 'all', label: '📋 All', filter: {} },
  { id: 'callbacks', label: '🔄 Callbacks', filter: { status: 'CALLBACK' } },
  { id: 'hot', label: '🔥 Hot Leads', filter: { status: 'INTERESTED' } },
  { id: 'new', label: '🆕 New Today', filter: { status: 'NEW', date: 'today' } },
  { id: 'uncalled', label: '📵 Never Called', filter: { uncalled: true } },
];

const SpreadsheetPage = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null); // For shift-click range selection
  const [sortConfig, setSortConfig] = useState({ key: 'lastUpdated', direction: 'desc' });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    addedBy: 'all',
    date: 'all',
    uncalled: false
  });
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null); // { message, type }
  
  // New row state for adding leads
  const [showAddRow, setShowAddRow] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', address: '', notes: '', status: 'NEW' });
  const newRowRef = useRef(null);
  
  const inputRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Show action feedback toast
  const showFeedback = (message, type = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 2000);
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  // Load current user
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Subscribe to Firebase leads
  useEffect(() => {
    const unsubscribe = subscribeToLeads((firebaseLeads) => {
      setLeads(firebaseLeads);
    });
    return unsubscribe;
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Get date threshold
  const getDateThreshold = (period) => {
    const now = new Date();
    switch (period) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      case 'week': return now.getTime() - 7 * 24 * 60 * 60 * 1000;
      case 'month': return now.getTime() - 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  };

  // Get unique team members
  const teamMembers = [...new Set(leads.map(l => l.addedBy).filter(Boolean))];

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    
    const allLeads = leads.filter(l => l.isLead);
    const callbacks = allLeads.filter(l => l.status === 'CALLBACK').length;
    const interested = allLeads.filter(l => l.status === 'INTERESTED').length;
    const todayAdded = allLeads.filter(l => (l.addedAt || 0) >= todayTs).length;
    const uncalled = allLeads.filter(l => !l.callHistory || l.callHistory.length === 0).length;
    
    return { total: allLeads.length, callbacks, interested, todayAdded, uncalled };
  }, [leads]);

  // Apply quick filter
  const applyQuickFilter = (filterId) => {
    setActiveQuickFilter(filterId);
    const preset = QUICK_FILTERS.find(f => f.id === filterId);
    if (preset) {
      setFilters(prev => ({
        ...prev,
        status: preset.filter.status || 'all',
        date: preset.filter.date || 'all',
        uncalled: preset.filter.uncalled || false
      }));
    }
  };

  // Filter and sort leads (only show leads marked as isLead)
  const filteredLeads = React.useMemo(() => {
    // Only include leads that are marked as leads
    let result = leads.filter(l => l.isLead);

    // Search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(lead =>
        lead.name?.toLowerCase().includes(query) ||
        lead.address?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.notes?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(lead => lead.status === filters.status);
    }

    // Uncalled filter
    if (filters.uncalled) {
      result = result.filter(lead => !lead.callHistory || lead.callHistory.length === 0);
    }

    // Added by filter
    if (filters.addedBy !== 'all') {
      result = result.filter(lead => lead.addedBy === filters.addedBy);
    }

    // Date filter
    if (filters.date !== 'all') {
      const threshold = getDateThreshold(filters.date);
      result = result.filter(lead => (lead.lastUpdated || lead.addedAt) >= threshold);
    }

    // Sort - prioritize callbacks at top when viewing all
    result.sort((a, b) => {
      // Callbacks first (if not already filtering by status)
      if (filters.status === 'all' && a.status === 'CALLBACK' && b.status !== 'CALLBACK') return -1;
      if (filters.status === 'all' && b.status === 'CALLBACK' && a.status !== 'CALLBACK') return 1;
      
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'calls') {
        valA = a.callHistory?.length || 0;
        valB = b.callHistory?.length || 0;
      }

      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc' 
          ? (valA || '').localeCompare(valB || '')
          : (valB || '').localeCompare(valA || '');
      }
      
      return sortConfig.direction === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });

    return result;
  }, [leads, filters, sortConfig]);

  // Keyboard shortcuts (must be after filteredLeads is defined)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      
      // Escape - clear selection or close export menu
      if (e.key === 'Escape') {
        if (showAddRow) {
          setShowAddRow(false);
        } else if (showExportMenu) {
          setShowExportMenu(false);
        } else if (selectedRows.size > 0) {
          setSelectedRows(new Set());
        }
      }
      // N - New lead
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowAddRow(true);
        setTimeout(() => newRowRef.current?.focus(), 100);
      }
      // Ctrl/Cmd + A - select all (when not editing)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !editingCell) {
        e.preventDefault();
        setSelectedRows(new Set(filteredLeads.map(l => l.id)));
      }
      // Delete - delete selected
      if (e.key === 'Delete' && selectedRows.size > 0 && !editingCell) {
        if (window.confirm(`Delete ${selectedRows.size} leads?`)) {
          selectedRows.forEach(id => deleteLead(id));
          setSelectedRows(new Set());
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRows, showExportMenu, showAddRow, editingCell, filteredLeads]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Start editing a cell
  const startEdit = (lead, field) => {
    setEditingCell({ id: lead.id, field });
    setEditValue(lead[field] || '');
  };

  // Save cell edit
  const saveEdit = useCallback(() => {
    if (!editingCell) return;
    
    const lead = leads.find(l => l.id === editingCell.id);
    if (lead && lead[editingCell.field] !== editValue) {
      updateFirebaseLead(editingCell.id, {
        [editingCell.field]: editValue,
        lastUpdated: Date.now()
      });
    }
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, leads]);

  // Handle keyboard in edit mode
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveEdit();
      // Move to next cell logic could be added here
    }
  };

  // Update status
  const updateStatus = (leadId, newStatus) => {
    updateFirebaseLead(leadId, {
      status: newStatus,
      lastUpdated: Date.now()
    });
    showFeedback(`Status → ${newStatus}`);
  };

  // Quick action: Log a call with one click
  const quickLogCall = (lead, outcome = 'CALLED') => {
    const callEntry = {
      date: Date.now(),
      user: currentUser?.name || 'Unknown',
      outcome: outcome
    };
    
    updateFirebaseLead(lead.id, {
      callHistory: [...(lead.callHistory || []), callEntry],
      status: outcome === 'CALLBACK' ? 'CALLBACK' : (outcome === 'INTERESTED' ? 'INTERESTED' : 'CALLED'),
      lastUpdated: Date.now()
    });
    showFeedback(`📞 Call logged as ${outcome}`);
  };

  // Quick action: Set callback
  const setCallback = (lead) => {
    const callEntry = {
      date: Date.now(),
      user: currentUser?.name || 'Unknown',
      outcome: 'CALLBACK'
    };
    
    updateFirebaseLead(lead.id, {
      callHistory: [...(lead.callHistory || []), callEntry],
      status: 'CALLBACK',
      lastUpdated: Date.now()
    });
    showFeedback('🔄 Callback scheduled');
  };

  // Quick action: Mark as interested
  const markInterested = (lead) => {
    const callEntry = {
      date: Date.now(),
      user: currentUser?.name || 'Unknown',
      outcome: 'INTERESTED'
    };
    
    updateFirebaseLead(lead.id, {
      callHistory: [...(lead.callHistory || []), callEntry],
      status: 'INTERESTED',
      lastUpdated: Date.now()
    });
    showFeedback('✅ Marked as interested!');
  };

  // Quick action: Mark as rejected
  const markRejected = (lead) => {
    updateFirebaseLead(lead.id, {
      status: 'REJECTED',
      lastUpdated: Date.now()
    });
    showFeedback('❌ Marked as rejected');
  };

  // Quick action: Add quick note
  const addQuickNote = (lead, note) => {
    const existingNotes = lead.notes || '';
    const timestamp = new Date().toLocaleDateString();
    const newNotes = existingNotes 
      ? `${existingNotes}\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;
    
    updateFirebaseLead(lead.id, {
      notes: newNotes,
      lastUpdated: Date.now()
    });
    showFeedback('📝 Note added');
  };

  // Add new lead from the add row
  const addNewLead = async () => {
    if (!newLead.name.trim()) {
      alert('Please enter a business name');
      return;
    }
    
    const leadData = {
      name: newLead.name.trim(),
      phone: newLead.phone.trim(),
      address: newLead.address.trim(),
      notes: newLead.notes.trim(),
      status: newLead.status || 'NEW',
      source: 'manual',
      isLead: true,
      addedBy: currentUser?.name || 'Unknown',
      addedAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    try {
      await saveLead(leadData);
      setNewLead({ name: '', phone: '', address: '', notes: '', status: 'NEW' });
      setShowAddRow(false);
    } catch (err) {
      console.error('Failed to add lead:', err);
      alert('Failed to add lead');
    }
  };

  // Handle keyboard in new row
  const handleNewRowKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNewLead();
    } else if (e.key === 'Escape') {
      setShowAddRow(false);
      setNewLead({ name: '', phone: '', address: '', notes: '', status: 'NEW' });
    }
  };

  // Toggle row selection
  const toggleRowSelection = (id, event, rowIndex) => {
    // Shift+click for range selection
    if (event?.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, rowIndex);
      const end = Math.max(lastSelectedIndex, rowIndex);
      const newSelection = new Set(selectedRows);
      for (let i = start; i <= end; i++) {
        newSelection.add(filteredLeads[i].id);
      }
      setSelectedRows(newSelection);
      return;
    }
    
    // Ctrl/Cmd+click for multi-select
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      // Normal click toggles single selection
      setSelectedRows(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    setLastSelectedIndex(rowIndex);
  };

  // Select all
  const selectAll = () => {
    if (selectedRows.size === filteredLeads.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredLeads.map(l => l.id)));
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRows(new Set());
    setLastSelectedIndex(null);
  };

  // Get selected leads data
  const getSelectedLeads = () => {
    return filteredLeads.filter(l => selectedRows.has(l.id));
  };

  // Export to CSV
  const exportToCSV = (leadsToExport) => {
    const headers = ['Name', 'Phone', 'Address', 'Status', 'Notes', 'Added By', 'Calls', 'Last Updated'];
    const rows = leadsToExport.map(lead => [
      lead.name || '',
      lead.phone || '',
      lead.address || '',
      lead.status || 'NEW',
      (lead.notes || '').replace(/"/g, '""'), // Escape quotes
      lead.addedBy || '',
      lead.callHistory?.length || 0,
      lead.lastUpdated ? new Date(lead.lastUpdated).toISOString() : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-export-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Copy to clipboard
  const copyToClipboard = async (leadsToExport) => {
    const text = leadsToExport.map(lead => 
      `${lead.name}\t${lead.phone || ''}\t${lead.address || ''}\t${lead.status || 'NEW'}\t${lead.addedBy || ''}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setShowExportMenu(false);
  };

  // Export selected or all
  const handleExport = (type, scope) => {
    const leadsToExport = scope === 'selected' ? getSelectedLeads() : filteredLeads;
    if (type === 'csv') {
      exportToCSV(leadsToExport);
    } else if (type === 'clipboard') {
      copyToClipboard(leadsToExport);
    }
  };

  // Bulk delete
  const bulkDelete = () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Delete ${selectedRows.size} leads?`)) return;
    
    selectedRows.forEach(id => deleteLead(id));
    setSelectedRows(new Set());
  };

  // Bulk status change
  const bulkStatusChange = (status) => {
    selectedRows.forEach(id => {
      updateFirebaseLead(id, { status, lastUpdated: Date.now() });
    });
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Column definitions
  const columns = [
    { key: 'select', label: '', width: 40 },
    { key: 'name', label: 'Business Name', width: 200, editable: true, sortable: true },
    { key: 'phone', label: 'Phone', width: 120, editable: true, sortable: true },
    { key: 'status', label: 'Status', width: 110, sortable: true },
    { key: 'quickActions', label: 'Quick Actions', width: 160 },
    { key: 'notes', label: 'Notes', width: 180, editable: true },
    { key: 'calls', label: 'Calls', width: 60, sortable: true },
    { key: 'lastUpdated', label: 'Last Updated', width: 130, sortable: true },
    { key: 'addedBy', label: 'By', width: 80, sortable: true },
    { key: 'actions', label: '', width: 60 }
  ];

  return (
    <div className="spreadsheet-page">
      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className={`action-toast ${actionFeedback.type}`}>
          {actionFeedback.message}
        </div>
      )}
      
      {/* Header */}
      <header className="spreadsheet-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/crm')}>← Back to CRM</button>
          <h1>📑 Lead Tracker</h1>
        </div>
        <div className="header-right">
          {/* Stats Pills */}
          <div className="stats-pills">
            <span className="stat-pill total">{stats.total} Total</span>
            <span className="stat-pill callbacks" title="Need callbacks">{stats.callbacks} 🔄</span>
            <span className="stat-pill hot" title="Interested leads">{stats.interested} 🔥</span>
            <span className="stat-pill uncalled" title="Never called">{stats.uncalled} 📵</span>
          </div>
          {currentUser && (
            <span className="current-user">👤 {currentUser.name}</span>
          )}
        </div>
      </header>

      {/* Quick Filters */}
      <div className="quick-filters-bar">
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.id}
            className={`quick-filter-btn ${activeQuickFilter === qf.id ? 'active' : ''}`}
            onClick={() => applyQuickFilter(qf.id)}
          >
            {qf.label}
            {qf.id === 'callbacks' && stats.callbacks > 0 && <span className="badge">{stats.callbacks}</span>}
            {qf.id === 'hot' && stats.interested > 0 && <span className="badge hot">{stats.interested}</span>}
            {qf.id === 'uncalled' && stats.uncalled > 0 && <span className="badge">{stats.uncalled}</span>}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="spreadsheet-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            placeholder="🔍 Search name, phone, address, notes..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          
          <select 
            value={filters.addedBy} 
            onChange={(e) => setFilters(prev => ({ ...prev, addedBy: e.target.value }))}
          >
            <option value="all">👤 All Members</option>
            {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select 
            value={filters.date} 
            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          >
            <option value="all">📅 All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <span className="showing-count">{filteredLeads.length} leads</span>
        </div>

        <div className="toolbar-right">
          {/* Add New Lead Button */}
          <button 
            className="add-row-btn"
            onClick={() => {
              setShowAddRow(true);
              setTimeout(() => newRowRef.current?.focus(), 100);
            }}
          >
            ➕ Add Lead
          </button>
          
          {/* Export menu (always visible) */}
          <div className="export-dropdown" ref={exportMenuRef}>
            <button 
              className="export-btn" 
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              📥 Export ▾
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <div className="export-menu-section">
                  <span className="export-menu-label">Export All ({filteredLeads.length})</span>
                  <button onClick={() => handleExport('csv', 'all')}>📄 Download CSV</button>
                  <button onClick={() => handleExport('clipboard', 'all')}>📋 Copy to Clipboard</button>
                </div>
                {selectedRows.size > 0 && (
                  <div className="export-menu-section">
                    <span className="export-menu-label">Export Selected ({selectedRows.size})</span>
                    <button onClick={() => handleExport('csv', 'selected')}>📄 Download CSV</button>
                    <button onClick={() => handleExport('clipboard', 'selected')}>📋 Copy to Clipboard</button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {copySuccess && <span className="copy-success">✓ Copied!</span>}

          {selectedRows.size > 0 && (
            <div className="bulk-actions">
              <span className="selected-count">{selectedRows.size} selected</span>
              <select onChange={(e) => { if (e.target.value) { bulkStatusChange(e.target.value); e.target.value = ''; }}}>
                <option value="">Status...</option>
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="clear-btn" onClick={clearSelection} title="Clear selection">✕</button>
              <button className="delete-btn" onClick={bulkDelete}>🗑️ Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="spreadsheet-container">
        <table className="spreadsheet">
          <thead>
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  style={{ width: col.width, minWidth: col.width }}
                  className={col.sortable ? 'sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.key === 'select' ? (
                    <input 
                      type="checkbox" 
                      checked={selectedRows.size === filteredLeads.length && filteredLeads.length > 0}
                      onChange={selectAll}
                    />
                  ) : (
                    <>
                      {col.label}
                      {sortConfig.key === col.key && (
                        <span className="sort-indicator">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Add New Row */}
            {showAddRow && (
              <tr className="add-row">
                <td className="cell cell-checkbox">
                  <span className="add-icon">✨</span>
                </td>
                <td className="cell cell-editable">
                  <input
                    ref={newRowRef}
                    type="text"
                    value={newLead.name}
                    onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={handleNewRowKeyDown}
                    placeholder="Business name..."
                    className="cell-input new-row-input"
                    autoFocus
                  />
                </td>
                <td className="cell cell-editable">
                  <input
                    type="text"
                    value={newLead.phone}
                    onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                    onKeyDown={handleNewRowKeyDown}
                    placeholder="Phone..."
                    className="cell-input new-row-input"
                  />
                </td>
                <td className="cell cell-status">
                  <select 
                    value={newLead.status}
                    onChange={(e) => setNewLead(prev => ({ ...prev, status: e.target.value }))}
                    className="status-select status-new"
                  >
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].icon} {s}</option>)}
                  </select>
                </td>
                <td className="cell cell-quick-actions">
                  <span className="new-row-hint">↵ Enter to save</span>
                </td>
                <td className="cell cell-editable">
                  <input
                    type="text"
                    value={newLead.notes}
                    onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                    onKeyDown={handleNewRowKeyDown}
                    placeholder="Notes..."
                    className="cell-input new-row-input"
                  />
                </td>
                <td className="cell cell-calls">
                  <span className="call-badge">0</span>
                </td>
                <td className="cell cell-date">
                  Now
                </td>
                <td className="cell cell-member">
                  {currentUser?.name?.slice(0, 6) || '-'}
                </td>
                <td className="cell cell-actions">
                  <button className="action-btn save-action" onClick={addNewLead} title="Save">✅</button>
                  <button 
                    className="action-btn cancel-action" 
                    onClick={() => {
                      setShowAddRow(false);
                      setNewLead({ name: '', phone: '', address: '', notes: '', status: 'NEW' });
                    }}
                    title="Cancel"
                  >
                    ❌
                  </button>
                </td>
              </tr>
            )}
            
            {filteredLeads.map((lead, rowIndex) => (
              <tr 
                key={lead.id} 
                className={selectedRows.has(lead.id) ? 'selected' : ''}
                onClick={(e) => {
                  // Row click with Shift/Ctrl selects without needing checkbox
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleRowSelection(lead.id, e, rowIndex);
                  }
                }}
              >
                {/* Checkbox */}
                <td className="cell cell-checkbox">
                  <input 
                    type="checkbox" 
                    checked={selectedRows.has(lead.id)}
                    onChange={(e) => toggleRowSelection(lead.id, e.nativeEvent, rowIndex)}
                  />
                </td>

                {/* Name */}
                <td 
                  className="cell cell-editable"
                  onDoubleClick={() => startEdit(lead, 'name')}
                >
                  {editingCell?.id === lead.id && editingCell?.field === 'name' ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleEditKeyDown}
                      className="cell-input"
                    />
                  ) : (
                    <span className="cell-value">{lead.name}</span>
                  )}
                </td>

                {/* Phone */}
                <td 
                  className="cell cell-editable cell-phone"
                  onDoubleClick={() => startEdit(lead, 'phone')}
                >
                  {editingCell?.id === lead.id && editingCell?.field === 'phone' ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleEditKeyDown}
                      className="cell-input"
                    />
                  ) : lead.phone ? (
                    <a href={`tel:${lead.phone}`} className="phone-link" onClick={(e) => e.stopPropagation()}>
                      📞 {lead.phone}
                    </a>
                  ) : (
                    <span className="cell-empty">No phone</span>
                  )}
                </td>

                {/* Status */}
                <td className="cell cell-status">
                  <select 
                    value={lead.status || 'NEW'} 
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className={`status-select status-${(lead.status || 'NEW').toLowerCase()}`}
                    style={{ 
                      background: STATUS_CONFIG[lead.status || 'NEW']?.bg,
                      borderColor: STATUS_CONFIG[lead.status || 'NEW']?.color
                    }}
                  >
                    {LEAD_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].icon} {s}</option>
                    ))}
                  </select>
                </td>

                {/* Quick Actions - ONE CLICK BUTTONS */}
                <td className="cell cell-quick-actions">
                  <div className="quick-action-btns">
                    <button 
                      className="qa-btn qa-called" 
                      onClick={(e) => { e.stopPropagation(); quickLogCall(lead, 'CALLED'); }}
                      title="Log call"
                    >
                      📞
                    </button>
                    <button 
                      className="qa-btn qa-callback" 
                      onClick={(e) => { e.stopPropagation(); setCallback(lead); }}
                      title="Set callback"
                    >
                      🔄
                    </button>
                    <button 
                      className="qa-btn qa-interested" 
                      onClick={(e) => { e.stopPropagation(); markInterested(lead); }}
                      title="Mark interested"
                    >
                      ✅
                    </button>
                    <button 
                      className="qa-btn qa-rejected" 
                      onClick={(e) => { e.stopPropagation(); markRejected(lead); }}
                      title="Mark rejected"
                    >
                      ❌
                    </button>
                  </div>
                </td>

                {/* Notes */}
                <td 
                  className="cell cell-editable cell-notes"
                  onDoubleClick={() => startEdit(lead, 'notes')}
                >
                  {editingCell?.id === lead.id && editingCell?.field === 'notes' ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleEditKeyDown}
                      className="cell-input"
                    />
                  ) : (
                    <span className="cell-value" title={lead.notes || ''}>
                      {lead.notes ? (lead.notes.length > 30 ? lead.notes.slice(0, 30) + '...' : lead.notes) : '-'}
                    </span>
                  )}
                </td>

                {/* Calls */}
                <td className="cell cell-calls">
                  <span className={`call-badge ${(lead.callHistory?.length || 0) === 0 ? 'no-calls' : ''}`}>
                    {lead.callHistory?.length || 0}
                  </span>
                </td>

                {/* Last Updated */}
                <td className="cell cell-date">
                  {formatDate(lead.lastUpdated || lead.addedAt)}
                </td>

                {/* Added By */}
                <td className="cell cell-member">
                  {lead.addedBy?.slice(0, 6) || '-'}
                </td>

                {/* Actions */}
                <td className="cell cell-actions">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="action-btn call-action" title="Call">📞</a>
                  )}
                  <button 
                    className="action-btn delete-action" 
                    onClick={() => { if (window.confirm('Delete this lead?')) deleteLead(lead.id); }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLeads.length === 0 && (
          <div className="empty-state">
            No leads found. Try adjusting your filters.
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="spreadsheet-footer">
        <div className="footer-left">
          <span>📊 {stats.total} leads</span>
          <span>•</span>
          <span>Showing {filteredLeads.length}</span>
          {selectedRows.size > 0 && (
            <>
              <span>•</span>
              <span className="selected-info">✓ {selectedRows.size} selected</span>
            </>
          )}
        </div>
        <div className="footer-right">
          <span className="keyboard-hints">
            <kbd>N</kbd> New • <kbd>Ctrl+A</kbd> Select All • <kbd>Del</kbd> Delete • <kbd>Dbl-Click</kbd> Edit • Quick Actions: 📞🔄✅❌
          </span>
        </div>
      </footer>
    </div>
  );
};

export default SpreadsheetPage;
