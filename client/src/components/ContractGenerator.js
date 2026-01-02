import React, { useState, useEffect, useRef } from 'react';
import { saveContract, updateContract, deleteContract, subscribeToContracts, subscribeToLeads } from '../firebase';
import SignaturePad from './SignaturePad';
import './ContractGenerator.css';

// Contract statuses
const CONTRACT_STATUSES = [
  { value: 'DRAFT', label: '📝 Draft', color: '#6b7280' },
  { value: 'SENT', label: '📤 Sent', color: '#3b82f6' },
  { value: 'VIEWED', label: '👁️ Viewed', color: '#8b5cf6' },
  { value: 'SIGNED', label: '✅ Signed', color: '#22c55e' },
  { value: 'EXPIRED', label: '⏰ Expired', color: '#f59e0b' },
  { value: 'CANCELLED', label: '❌ Cancelled', color: '#ef4444' },
];

// Pre-defined contract templates
const CONTRACT_TEMPLATES = {
  junk_removal: {
    name: 'Junk Removal Service Agreement',
    content: `JUNK REMOVAL SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of {{date}} between:

SERVICE PROVIDER:
{{companyName}}
{{companyAddress}}
{{companyPhone}}
{{companyEmail}}

CLIENT:
{{clientName}}
{{clientAddress}}
{{clientPhone}}
{{clientEmail}}

1. SCOPE OF SERVICES
The Service Provider agrees to perform junk removal services at the following location:
{{serviceAddress}}

Services include:
{{serviceDescription}}

2. PRICING AND PAYMENT
- Total Service Cost: ${{totalAmount}}
- Deposit Required: ${{depositAmount}} (due upon signing)
- Balance Due: ${{balanceAmount}} (due upon completion)

Payment Methods Accepted: Credit Card, Cash, Check

3. SERVICE DATE
Scheduled Service Date: {{serviceDate}}
Estimated Time: {{serviceTime}}

4. TERMS AND CONDITIONS
a) The Service Provider will remove all items specified in Section 1.
b) The Client confirms they have the authority to dispose of all items.
c) Hazardous materials are NOT included unless specifically agreed upon.
d) The Service Provider is not responsible for items left behind.

5. CANCELLATION POLICY
- Cancellation more than 48 hours before service: Full deposit refund
- Cancellation within 48 hours: 50% deposit forfeiture
- No-show: Full deposit forfeiture

6. LIABILITY
The Service Provider maintains liability insurance. Any damages during service will be handled according to insurance policy terms.

7. AGREEMENT ACCEPTANCE
By signing below, both parties agree to the terms and conditions stated in this Agreement.

CLIENT SIGNATURE:
_________________________________
Name: {{clientName}}
Date: {{signatureDate}}

SERVICE PROVIDER:
_________________________________
{{companyName}}
`,
  },
  real_estate: {
    name: 'Real Estate Services Agreement',
    content: `REAL ESTATE SERVICES AGREEMENT

This Agreement is entered into on {{date}} between:

AGENT/BROKER:
{{companyName}}
{{companyAddress}}
License #: {{licenseNumber}}

CLIENT:
{{clientName}}
{{clientAddress}}
{{clientPhone}}
{{clientEmail}}

1. TYPE OF AGREEMENT
☐ Buyer Representation Agreement
☐ Listing Agreement
☐ Property Management Agreement

2. PROPERTY INFORMATION
Property Address: {{propertyAddress}}
Property Type: {{propertyType}}
Listing/Purchase Price: ${{propertyPrice}}

3. TERM OF AGREEMENT
This agreement shall be effective from {{startDate}} to {{endDate}}.

4. COMMISSION/FEES
Commission Rate: {{commissionRate}}%
Calculated Commission: ${{commissionAmount}}
Due Upon: Closing of Transaction

5. SERVICES PROVIDED
The Agent agrees to provide the following services:
{{serviceDescription}}

6. CLIENT RESPONSIBILITIES
The Client agrees to:
- Provide accurate property information
- Be available for showings/meetings
- Notify Agent of any changes in circumstances
- Work exclusively with this Agent during the term

7. CONFIDENTIALITY
Both parties agree to keep all information confidential.

8. TERMINATION
Either party may terminate with 30 days written notice.

9. SIGNATURES

CLIENT:
_________________________________
Name: {{clientName}}
Date: {{signatureDate}}

AGENT/BROKER:
_________________________________
{{companyName}}
`,
  },
  general_service: {
    name: 'General Service Agreement',
    content: `SERVICE AGREEMENT

Date: {{date}}

This Service Agreement is between:

SERVICE PROVIDER ("Provider"):
{{companyName}}
{{companyAddress}}
{{companyPhone}}
{{companyEmail}}

CLIENT ("Client"):
{{clientName}}
{{clientAddress}}
{{clientPhone}}
{{clientEmail}}

1. SERVICES
The Provider agrees to perform the following services:
{{serviceDescription}}

Location: {{serviceAddress}}
Date(s): {{serviceDate}}

2. COMPENSATION
Total Amount: ${{totalAmount}}
Deposit: ${{depositAmount}}
Balance Due: ${{balanceAmount}}
Payment Due: {{paymentDueDate}}

3. TERMS
a) Services will be performed in a professional manner.
b) Client will provide access to the work area.
c) Changes to scope may affect pricing.
d) Provider maintains appropriate insurance.

4. WARRANTY
Provider warrants work for {{warrantyPeriod}} days from completion.

5. CANCELLATION
- 48+ hours notice: Full refund
- Less than 48 hours: 50% charge
- No-show: Full charge

6. LIMITATION OF LIABILITY
Provider's liability is limited to the contract amount.

7. GOVERNING LAW
This Agreement is governed by the laws of {{state}}.

8. ENTIRE AGREEMENT
This document constitutes the entire agreement.

SIGNATURES:

CLIENT:
_________________________________
{{clientName}}
Date: {{signatureDate}}

SERVICE PROVIDER:
_________________________________
{{companyName}}
`,
  },
};

export default function ContractGenerator({ onClose }) {
  const [contracts, setContracts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'preview', 'sign'
  const [selectedContract, setSelectedContract] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    templateType: 'general_service',
    customFields: {},
    content: '',
    status: 'DRAFT',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Company info
  const [companyInfo] = useState({
    name: 'NJ Developments',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    email: 'contracts@njdevelopments.com',
  });

  // Subscribe to data
  useEffect(() => {
    const unsubContracts = subscribeToContracts(setContracts);
    const unsubLeads = subscribeToLeads(setLeads);
    return () => {
      unsubContracts();
      unsubLeads();
    };
  }, []);

  // Handle client selection
  const handleClientSelect = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setFormData(prev => ({
        ...prev,
        clientId: lead.id,
        clientName: lead.name || '',
        clientEmail: lead.email || '',
        clientPhone: lead.phone || '',
        clientAddress: lead.address || '',
      }));
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateType) => {
    const template = CONTRACT_TEMPLATES[templateType];
    if (template) {
      setFormData(prev => ({
        ...prev,
        templateType,
        content: template.content,
      }));
    }
  };

  // Replace template variables
  const processTemplate = (content, data) => {
    let processed = content;
    const variables = {
      date: new Date().toLocaleDateString(),
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      companyPhone: companyInfo.phone,
      companyEmail: companyInfo.email,
      clientName: data.clientName || '_______________',
      clientAddress: data.clientAddress || '_______________',
      clientPhone: data.clientPhone || '_______________',
      clientEmail: data.clientEmail || '_______________',
      signatureDate: new Date().toLocaleDateString(),
      ...data.customFields,
    };

    Object.entries(variables).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value || '_______________');
    });

    return processed;
  };

  // Save contract
  const handleSaveContract = async (sendAfterSave = false) => {
    const contractData = {
      id: selectedContract?.id || `contract_${Date.now()}`,
      ...formData,
      processedContent: processTemplate(formData.content, formData),
      status: sendAfterSave ? 'SENT' : formData.status,
      sentAt: sendAfterSave ? Date.now() : selectedContract?.sentAt,
    };

    try {
      await saveContract(contractData);
      setView('list');
      resetForm();
    } catch (error) {
      console.error('Error saving contract:', error);
      alert('Failed to save contract');
    }
  };

  // Delete contract
  const handleDeleteContract = async (contractId) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    try {
      await deleteContract(contractId);
    } catch (error) {
      console.error('Error deleting contract:', error);
    }
  };

  // Edit contract
  const handleEditContract = (contract) => {
    setSelectedContract(contract);
    setFormData({
      clientId: contract.clientId || '',
      clientName: contract.clientName || '',
      clientEmail: contract.clientEmail || '',
      clientPhone: contract.clientPhone || '',
      clientAddress: contract.clientAddress || '',
      templateType: contract.templateType || 'general_service',
      customFields: contract.customFields || {},
      content: contract.content || '',
      status: contract.status || 'DRAFT',
      expiresAt: contract.expiresAt || '',
    });
    setView('edit');
  };

  // Reset form
  const resetForm = () => {
    setSelectedContract(null);
    setFormData({
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      templateType: 'general_service',
      customFields: {},
      content: CONTRACT_TEMPLATES.general_service.content,
      status: 'DRAFT',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  };

  // Handle signature
  const handleSignatureComplete = async (signatureData) => {
    if (selectedContract) {
      try {
        await updateContract(selectedContract.id, {
          status: 'SIGNED',
          signedAt: Date.now(),
          signatureData,
          signedBy: selectedContract.clientName,
        });
        setShowSignaturePad(false);
        setView('list');
      } catch (error) {
        console.error('Error saving signature:', error);
      }
    }
  };

  // Generate PDF
  const handleGeneratePDF = async (contract) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(companyInfo.name, 20, 20);
      
      // Content
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const processedContent = processTemplate(contract.content, contract);
      const lines = doc.splitTextToSize(processedContent, 170);
      
      let y = 35;
      lines.forEach((line) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 5;
      });
      
      // Add signature if exists
      if (contract.signatureData) {
        doc.addPage();
        doc.text('CLIENT SIGNATURE:', 20, 30);
        doc.addImage(contract.signatureData, 'PNG', 20, 35, 80, 30);
        doc.text(`Signed by: ${contract.signedBy}`, 20, 75);
        doc.text(`Date: ${new Date(contract.signedAt).toLocaleDateString()}`, 20, 82);
      }
      
      doc.save(`Contract-${contract.clientName}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  // Copy signing link
  const copySigningLink = (contractId) => {
    const link = `${window.location.origin}/sign/${contractId}`;
    navigator.clipboard.writeText(link);
    alert('Signing link copied to clipboard!');
  };

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Render contract list
  const renderContractList = () => (
    <div className="contract-list-view">
      <div className="contract-header-bar">
        <div className="contract-search">
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            {CONTRACT_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button 
          className="create-contract-btn"
          onClick={() => {
            resetForm();
            setFormData(prev => ({ 
              ...prev, 
              content: CONTRACT_TEMPLATES.general_service.content 
            }));
            setView('create');
          }}
        >
          ➕ New Contract
        </button>
      </div>

      <div className="contract-stats">
        <div className="stat-card">
          <span className="stat-value">{contracts.length}</span>
          <span className="stat-label">Total Contracts</span>
        </div>
        <div className="stat-card signed">
          <span className="stat-value">{contracts.filter(c => c.status === 'SIGNED').length}</span>
          <span className="stat-label">Signed</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-value">{contracts.filter(c => ['SENT', 'VIEWED'].includes(c.status)).length}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card draft">
          <span className="stat-value">{contracts.filter(c => c.status === 'DRAFT').length}</span>
          <span className="stat-label">Drafts</span>
        </div>
      </div>

      <div className="contracts-grid">
        {filteredContracts.length === 0 ? (
          <div className="no-contracts">
            <span className="empty-icon">📄</span>
            <p>No contracts found. Create your first contract!</p>
          </div>
        ) : (
          filteredContracts.map(contract => {
            const status = CONTRACT_STATUSES.find(s => s.value === contract.status) || CONTRACT_STATUSES[0];
            const template = CONTRACT_TEMPLATES[contract.templateType];
            return (
              <div key={contract.id} className="contract-card">
                <div className="contract-card-header">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: status.color }}
                  >
                    {status.label}
                  </span>
                  {contract.signatureData && (
                    <span className="signed-indicator">✍️</span>
                  )}
                </div>
                <h3 className="contract-client">{contract.clientName}</h3>
                <p className="contract-type">{template?.name || 'Custom Contract'}</p>
                <p className="contract-date">
                  Created: {new Date(contract.createdAt).toLocaleDateString()}
                </p>
                {contract.signedAt && (
                  <p className="contract-signed-date">
                    Signed: {new Date(contract.signedAt).toLocaleDateString()}
                  </p>
                )}
                <div className="contract-card-actions">
                  <button title="Edit" onClick={() => handleEditContract(contract)}>✏️</button>
                  <button title="Download PDF" onClick={() => handleGeneratePDF(contract)}>📄</button>
                  <button title="Copy Link" onClick={() => copySigningLink(contract.id)}>🔗</button>
                  <button title="Delete" onClick={() => handleDeleteContract(contract.id)}>🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Render contract form
  const renderContractForm = () => (
    <div className="contract-form-view">
      <div className="form-header">
        <button className="back-btn" onClick={() => setView('list')}>← Back</button>
        <h2>{view === 'create' ? 'Create Contract' : 'Edit Contract'}</h2>
      </div>

      <div className="contract-form-grid">
        <div className="form-left">
          {/* Template Selection */}
          <div className="form-section">
            <h3>Contract Template</h3>
            <div className="template-options">
              {Object.entries(CONTRACT_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  className={`template-option ${formData.templateType === key ? 'active' : ''}`}
                  onClick={() => handleTemplateSelect(key)}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Client Selection */}
          <div className="form-section">
            <h3>Client Information</h3>
            <div className="form-row">
              <label>Select from Leads</label>
              <select 
                value={formData.clientId}
                onChange={(e) => handleClientSelect(e.target.value)}
              >
                <option value="">-- Select a client --</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>{lead.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Client Name *</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                required
              />
            </div>
            <div className="form-row-group">
              <div className="form-row">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <label>Address</label>
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
              />
            </div>
          </div>

          {/* Custom Fields */}
          <div className="form-section">
            <h3>Service Details</h3>
            <div className="form-row">
              <label>Service Address</label>
              <input
                type="text"
                value={formData.customFields.serviceAddress || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customFields: { ...prev.customFields, serviceAddress: e.target.value }
                }))}
                placeholder="Where will service be performed?"
              />
            </div>
            <div className="form-row">
              <label>Service Description</label>
              <textarea
                value={formData.customFields.serviceDescription || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customFields: { ...prev.customFields, serviceDescription: e.target.value }
                }))}
                placeholder="Describe the services to be performed..."
                rows={3}
              />
            </div>
            <div className="form-row-group">
              <div className="form-row">
                <label>Service Date</label>
                <input
                  type="date"
                  value={formData.customFields.serviceDate || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customFields: { ...prev.customFields, serviceDate: e.target.value }
                  }))}
                />
              </div>
              <div className="form-row">
                <label>Service Time</label>
                <input
                  type="text"
                  value={formData.customFields.serviceTime || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customFields: { ...prev.customFields, serviceTime: e.target.value }
                  }))}
                  placeholder="e.g., 9:00 AM - 12:00 PM"
                />
              </div>
            </div>
            <div className="form-row-group">
              <div className="form-row">
                <label>Total Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.customFields.totalAmount || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customFields: { ...prev.customFields, totalAmount: e.target.value }
                  }))}
                />
              </div>
              <div className="form-row">
                <label>Deposit Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.customFields.depositAmount || ''}
                  onChange={(e) => {
                    const deposit = parseFloat(e.target.value) || 0;
                    const total = parseFloat(formData.customFields.totalAmount) || 0;
                    setFormData(prev => ({
                      ...prev,
                      customFields: { 
                        ...prev.customFields, 
                        depositAmount: e.target.value,
                        balanceAmount: (total - deposit).toFixed(2)
                      }
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contract Content Editor */}
          <div className="form-section">
            <h3>Contract Content</h3>
            <div className="form-row">
              <label>Edit Contract Text</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={15}
                className="contract-editor"
              />
            </div>
            <p className="template-help">
              Use {"{{variableName}}"} for dynamic fields. Available: clientName, clientAddress, 
              clientPhone, clientEmail, date, serviceDescription, totalAmount, depositAmount, etc.
            </p>
          </div>
        </div>

        <div className="form-right">
          {/* Preview */}
          <div className="preview-card">
            <h3>Preview</h3>
            <div className="contract-preview-content">
              <pre>{processTemplate(formData.content, formData)}</pre>
            </div>
          </div>

          {/* Settings */}
          <div className="settings-card">
            <h3>Settings</h3>
            <div className="form-row">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                {CONTRACT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Expires On</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button 
              className="save-draft-btn"
              onClick={() => handleSaveContract(false)}
            >
              💾 Save Draft
            </button>
            <button 
              className="save-send-btn"
              onClick={() => handleSaveContract(true)}
              disabled={!formData.clientName}
            >
              📤 Save & Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="contract-generator">
      {view === 'list' && renderContractList()}
      {(view === 'create' || view === 'edit') && renderContractForm()}
      
      {/* Signature Modal */}
      {showSignaturePad && selectedContract && (
        <div className="signature-modal-overlay">
          <div className="signature-modal">
            <h3>Sign Contract</h3>
            <p>Please sign below to accept the terms of this agreement.</p>
            <SignaturePad
              onSave={handleSignatureComplete}
              onCancel={() => setShowSignaturePad(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
