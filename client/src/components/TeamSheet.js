import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { saveLead } from '../firebase';
import './TeamSheet.css';

const TeamSheet = ({ leads, team, currentUser, onSelectLead }) => {
  const [filterMember, setFilterMember] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [sortDir, setSortDir] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickLead, setQuickLead] = useState({ name: '', phone: '', notes: '' });

  // Get start of today, this week, etc.
  const getDateThreshold = (period) => {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      case 'yesterday':
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        return yesterday.getTime();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.getTime();
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return monthAgo.getTime();
      default:
        return 0;
    }
  };

  // Check if lead has activity in date range
  const hasActivityInRange = (lead, period) => {
    if (period === 'all') return true;
    const threshold = getDateThreshold(period);
    const endThreshold = period === 'yesterday' ? getDateThreshold('today') : Date.now();
    
    // Check lastUpdated
    if (lead.lastUpdated >= threshold && lead.lastUpdated < endThreshold) return true;
    
    // Check call history
    if (lead.callHistory?.some(call => call.date >= threshold && call.date < endThreshold)) return true;
    
    return false;
  };

  // Get today's calls for a lead
  const getTodaysCalls = (lead) => {
    const todayStart = getDateThreshold('today');
    return lead.callHistory?.filter(call => call.date >= todayStart) || [];
  };

  // Parse town/state from address string
  // Address format is typically: "123 Main St, Town, State ZIP, Country"
  const parseTownState = (address) => {
    if (!address || address === 'Manual Entry') return { town: '-', state: '-' };
    
    const parts = address.split(',').map(p => p.trim());
    if (parts.length < 3) return { town: parts[0] || '-', state: '-' };
    
    // Town is usually the second part
    const town = parts[1] || '-';
    
    // State + ZIP is usually the third part (e.g., "NJ 07081")
    const stateZipPart = parts[2] || '';
    const stateMatch = stateZipPart.match(/^([A-Z]{2})/);
    const state = stateMatch ? stateMatch[1] : stateZipPart.split(' ')[0] || '-';
    
    return { town, state };
  };

  // Get last interaction info
  const getLastInteraction = (lead) => {
    if (!lead.callHistory || lead.callHistory.length === 0) {
      return { type: 'added', date: lead.addedAt, user: lead.addedBy };
    }
    const lastCall = lead.callHistory[lead.callHistory.length - 1];
    return { type: 'called', date: lastCall.date, user: lastCall.user, outcome: lastCall.outcome };
  };

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.address?.toLowerCase().includes(query) ||
        lead.phone?.includes(query)
      );
    }

    // Member filter
    if (filterMember !== 'all') {
      result = result.filter(lead => 
        lead.addedBy === filterMember || 
        lead.assignedTo === filterMember ||
        lead.callHistory?.some(call => call.user === filterMember)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(lead => lead.status === filterStatus);
    }

    // Date filter
    if (filterDate !== 'all') {
      result = result.filter(lead => hasActivityInRange(lead, filterDate));
    }

    // Activity filter
    if (filterActivity === 'called') {
      result = result.filter(lead => lead.callHistory && lead.callHistory.length > 0);
    } else if (filterActivity === 'not-called') {
      result = result.filter(lead => !lead.callHistory || lead.callHistory.length === 0);
    } else if (filterActivity === 'called-today') {
      result = result.filter(lead => getTodaysCalls(lead).length > 0);
    }

    // Sort
    result.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'addedBy':
          valA = a.addedBy || '';
          valB = b.addedBy || '';
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'calls':
          valA = a.callHistory?.length || 0;
          valB = b.callHistory?.length || 0;
          return sortDir === 'asc' ? valA - valB : valB - valA;
        case 'lastUpdated':
        default:
          valA = a.lastUpdated || a.addedAt || 0;
          valB = b.lastUpdated || b.addedAt || 0;
          return sortDir === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [leads, filterMember, filterStatus, filterDate, filterActivity, sortBy, sortDir, searchQuery]);

  // Format date/time
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Get status color
  const getStatusClass = (status) => {
    const statusMap = {
      'NEW': 'status-new',
      'CALLED': 'status-called',
      'CALLBACK': 'status-callback',
      'INTERESTED': 'status-interested',
      'REJECTED': 'status-rejected',
      'CLOSED': 'status-closed'
    };
    return statusMap[status] || 'status-new';
  };

  // Toggle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  // Get unique team members from leads
  const teamMembers = useMemo(() => {
    const members = new Set();
    leads.forEach(lead => {
      if (lead.addedBy) members.add(lead.addedBy);
      lead.callHistory?.forEach(call => {
        if (call.user) members.add(call.user);
      });
    });
    return Array.from(members);
  }, [leads]);

  // Calculate stats
  const stats = useMemo(() => {
    const todayStart = getDateThreshold('today');
    const todayCalls = leads.reduce((acc, lead) => {
      return acc + (lead.callHistory?.filter(c => c.date >= todayStart).length || 0);
    }, 0);
    const todayLeads = leads.filter(lead => lead.addedAt >= todayStart).length;
    const totalCalls = leads.reduce((acc, lead) => acc + (lead.callHistory?.length || 0), 0);
    
    return { todayCalls, todayLeads, totalCalls };
  }, [leads]);

  // Quick add lead
  const handleQuickAdd = async () => {
    if (!quickLead.name.trim()) return;
    
    const leadData = {
      name: quickLead.name.trim(),
      phone: quickLead.phone.trim(),
      notes: quickLead.notes.trim(),
      status: 'NEW',
      source: 'manual',
      isLead: true,
      addedBy: currentUser?.name || 'Unknown',
      addedAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    try {
      await saveLead(leadData);
      setQuickLead({ name: '', phone: '', notes: '' });
      setShowQuickAdd(false);
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

  return (
    <div className="team-sheet">
      {/* Quick Add Bar */}
      <div className="quick-add-bar">
        {showQuickAdd ? (
          <div className="quick-add-form">
            <input
              type="text"
              placeholder="Business name..."
              value={quickLead.name}
              onChange={(e) => setQuickLead(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              autoFocus
            />
            <input
              type="text"
              placeholder="Phone..."
              value={quickLead.phone}
              onChange={(e) => setQuickLead(prev => ({ ...prev, phone: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            />
            <input
              type="text"
              placeholder="Notes..."
              value={quickLead.notes}
              onChange={(e) => setQuickLead(prev => ({ ...prev, notes: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            />
            <button className="save-btn" onClick={handleQuickAdd}>✓ Save</button>
            <button className="cancel-btn" onClick={() => {
              setShowQuickAdd(false);
              setQuickLead({ name: '', phone: '', notes: '' });
            }}>✕</button>
          </div>
        ) : (
          <div className="quick-add-actions">
            <button className="add-lead-btn" onClick={() => setShowQuickAdd(true)}>
              ➕ Quick Add Lead
            </button>
            <Link to="/sheet" className="full-sheet-link">
              📑 Open Full Spreadsheet →
            </Link>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="sheet-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.todayCalls}</span>
          <span className="stat-label">Calls Today</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.todayLeads}</span>
          <span className="stat-label">Leads Added Today</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{leads.length}</span>
          <span className="stat-label">Total Leads</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.totalCalls}</span>
          <span className="stat-label">Total Calls</span>
        </div>
      </div>

      {/* Filters */}
      <div className="sheet-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="🔍 Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
            <option value="all">👤 All Members</option>
            {teamMembers.map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>

          <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">📅 All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">📊 All Statuses</option>
            <option value="NEW">New</option>
            <option value="CALLED">Called</option>
            <option value="CALLBACK">Callback</option>
            <option value="INTERESTED">Interested</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)}>
            <option value="all">📞 All Activity</option>
            <option value="called-today">Called Today</option>
            <option value="called">Has Been Called</option>
            <option value="not-called">Never Called</option>
          </select>
        </div>
        
        <div className="filter-summary">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>

      {/* Table */}
      <div className="sheet-table-container">
        <table className="sheet-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Business {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th>Location</th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('addedBy')} className="sortable">
                Added By {sortBy === 'addedBy' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('calls')} className="sortable">
                Calls {sortBy === 'calls' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th>Today's Activity</th>
              <th onClick={() => handleSort('lastUpdated')} className="sortable">
                Last Update {sortBy === 'lastUpdated' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => {
              const todayCalls = getTodaysCalls(lead);
              const lastInteraction = getLastInteraction(lead);
              
              return (
                <tr key={lead.id} onClick={() => onSelectLead(lead)} className="clickable">
                  <td className="lead-cell">
                    <div className="lead-name">{lead.name}</div>
                    <div className="lead-address">{lead.address}</div>
                    {lead.phone && <div className="lead-phone">{lead.phone}</div>}
                  </td>
                  <td className="location-cell">
                    {(() => {
                      const { town, state } = parseTownState(lead.address);
                      return (
                        <>
                          <div className="location-town">{town}</div>
                          <div className="location-state">{state}</div>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(lead.status)}`}>
                      {lead.status || 'NEW'}
                    </span>
                  </td>
                  <td className="member-cell">
                    <span className="member-name">{lead.addedBy || '-'}</span>
                    <span className="added-date">{formatDateTime(lead.addedAt)}</span>
                  </td>
                  <td className="calls-cell">
                    <span className="call-count">{lead.callHistory?.length || 0}</span>
                  </td>
                  <td className="activity-cell">
                    {todayCalls.length > 0 ? (
                      <div className="today-activity">
                        {todayCalls.map((call, i) => (
                          <div key={i} className="activity-item">
                            <span className="activity-user">{call.user}</span>
                            <span className={`activity-outcome outcome-${call.outcome?.toLowerCase()}`}>
                              {call.outcome}
                            </span>
                            <span className="activity-time">{formatDateTime(call.date)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="no-activity">-</span>
                    )}
                  </td>
                  <td className="last-update-cell">
                    <div className="last-interaction">
                      <span className="interaction-type">
                        {lastInteraction.type === 'called' ? '📞' : '➕'}
                      </span>
                      <span className="interaction-user">{lastInteraction.user}</span>
                      <span className="interaction-time">{formatDateTime(lastInteraction.date)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredLeads.length === 0 && (
          <div className="empty-table">
            No leads match your filters
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSheet;
