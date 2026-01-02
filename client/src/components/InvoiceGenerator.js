import React, { useState, useEffect, useRef } from 'react';
import { saveInvoice, updateInvoice, deleteInvoice, subscribeToInvoices, subscribeToLeads } from '../firebase';
import './InvoiceGenerator.css';

// Invoice statuses
const INVOICE_STATUSES = [
  { value: 'DRAFT', label: '📝 Draft', color: '#6b7280' },
  { value: 'SENT', label: '📤 Sent', color: '#3b82f6' },
  { value: 'VIEWED', label: '👁️ Viewed', color: '#8b5cf6' },
  { value: 'PARTIAL', label: '💵 Partial', color: '#f59e0b' },
  { value: 'PAID', label: '✅ Paid', color: '#22c55e' },
  { value: 'OVERDUE', label: '⚠️ Overdue', color: '#ef4444' },
  { value: 'CANCELLED', label: '❌ Cancelled', color: '#6b7280' },
];

// Service line item component
function ServiceLineItem({ item, index, onUpdate, onRemove }) {
  return (
    <div className="service-line-item">
      <input
        type="text"
        placeholder="Service description"
        value={item.description}
        onChange={(e) => onUpdate(index, { ...item, description: e.target.value })}
        className="service-description"
      />
      <input
        type="number"
        placeholder="Qty"
        min="1"
        value={item.quantity}
        onChange={(e) => onUpdate(index, { ...item, quantity: parseInt(e.target.value) || 1 })}
        className="service-quantity"
      />
      <input
        type="number"
        placeholder="Price"
        min="0"
        step="0.01"
        value={item.unitPrice}
        onChange={(e) => onUpdate(index, { ...item, unitPrice: parseFloat(e.target.value) || 0 })}
        className="service-price"
      />
      <span className="service-total">${(item.quantity * item.unitPrice).toFixed(2)}</span>
      <button className="remove-line-btn" onClick={() => onRemove(index)}>×</button>
    </div>
  );
}

// Invoice Preview Component for PDF
function InvoicePreview({ invoice, companyInfo }) {
  return (
    <div className="invoice-preview" id="invoice-preview">
      <div className="invoice-header">
        <div className="company-info">
          <h1>{companyInfo.name || 'Your Company'}</h1>
          <p>{companyInfo.address || '123 Business St'}</p>
          <p>{companyInfo.phone || '(555) 123-4567'}</p>
          <p>{companyInfo.email || 'billing@company.com'}</p>
        </div>
        <div className="invoice-meta">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
          <p><strong>Due:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="bill-to">
        <h3>Bill To:</h3>
        <p><strong>{invoice.clientName}</strong></p>
        <p>{invoice.clientAddress}</p>
        <p>{invoice.clientEmail}</p>
        <p>{invoice.clientPhone}</p>
      </div>

      <table className="invoice-items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.services.map((item, idx) => (
            <tr key={idx}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>${item.unitPrice.toFixed(2)}</td>
              <td>${(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-totals">
        <div className="total-row">
          <span>Subtotal:</span>
          <span>${invoice.subtotal.toFixed(2)}</span>
        </div>
        {invoice.depositAmount > 0 && (
          <div className="total-row deposit">
            <span>Deposit Required:</span>
            <span>-${invoice.depositAmount.toFixed(2)}</span>
          </div>
        )}
        {invoice.discount > 0 && (
          <div className="total-row discount">
            <span>Discount:</span>
            <span>-${invoice.discount.toFixed(2)}</span>
          </div>
        )}
        {invoice.tax > 0 && (
          <div className="total-row">
            <span>Tax ({invoice.taxRate}%):</span>
            <span>${invoice.tax.toFixed(2)}</span>
          </div>
        )}
        <div className="total-row grand-total">
          <span>Total Due:</span>
          <span>${invoice.totalDue.toFixed(2)}</span>
        </div>
        {invoice.amountPaid > 0 && (
          <>
            <div className="total-row paid">
              <span>Amount Paid:</span>
              <span>-${invoice.amountPaid.toFixed(2)}</span>
            </div>
            <div className="total-row balance">
              <span>Balance Due:</span>
              <span>${(invoice.totalDue - invoice.amountPaid).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {invoice.notes && (
        <div className="invoice-notes">
          <h4>Notes:</h4>
          <p>{invoice.notes}</p>
        </div>
      )}

      <div className="invoice-footer">
        <p>Thank you for your business!</p>
        <p className="payment-link">Pay online: {window.location.origin}/pay/{invoice.id}</p>
      </div>
    </div>
  );
}

export default function InvoiceGenerator({ onClose }) {
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'preview'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    services: [{ description: '', quantity: 1, unitPrice: 0 }],
    depositAmount: 0,
    discount: 0,
    taxRate: 0,
    notes: '',
    status: 'DRAFT',
  });

  // Company info (would typically come from settings)
  const [companyInfo] = useState({
    name: 'NJ Developments',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    email: 'billing@njdevelopments.com',
  });

  // Subscribe to data
  useEffect(() => {
    const unsubInvoices = subscribeToInvoices(setInvoices);
    const unsubLeads = subscribeToLeads(setLeads);
    return () => {
      unsubInvoices();
      unsubLeads();
    };
  }, []);

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = invoices.filter(inv => 
      inv.invoiceNumber?.startsWith(`INV-${year}`)
    ).length + 1;
    return `INV-${year}-${String(count).padStart(4, '0')}`;
  };

  // Calculate totals
  const calculateTotals = (data) => {
    const subtotal = data.services.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const tax = subtotal * (data.taxRate / 100);
    const totalDue = subtotal + tax - data.discount;
    return { subtotal, tax, totalDue };
  };

  // Handle client selection from leads
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

  // Handle service line updates
  const handleServiceUpdate = (index, updatedItem) => {
    const newServices = [...formData.services];
    newServices[index] = updatedItem;
    setFormData(prev => ({ ...prev, services: newServices }));
  };

  const addServiceLine = () => {
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeServiceLine = (index) => {
    if (formData.services.length > 1) {
      setFormData(prev => ({
        ...prev,
        services: prev.services.filter((_, i) => i !== index),
      }));
    }
  };

  // Create/Update invoice
  const handleSaveInvoice = async (sendAfterSave = false) => {
    const totals = calculateTotals(formData);
    const invoiceData = {
      id: selectedInvoice?.id || `inv_${Date.now()}`,
      ...formData,
      ...totals,
      amountPaid: selectedInvoice?.amountPaid || 0,
      invoiceNumber: formData.invoiceNumber || generateInvoiceNumber(),
      status: sendAfterSave ? 'SENT' : formData.status,
      sentAt: sendAfterSave ? Date.now() : selectedInvoice?.sentAt,
    };

    try {
      await saveInvoice(invoiceData);
      setView('list');
      resetForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice');
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteInvoice(invoiceId);
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  // Edit invoice
  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      clientId: invoice.clientId || '',
      clientName: invoice.clientName || '',
      clientEmail: invoice.clientEmail || '',
      clientPhone: invoice.clientPhone || '',
      clientAddress: invoice.clientAddress || '',
      invoiceNumber: invoice.invoiceNumber || '',
      issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate || '',
      services: invoice.services || [{ description: '', quantity: 1, unitPrice: 0 }],
      depositAmount: invoice.depositAmount || 0,
      discount: invoice.discount || 0,
      taxRate: invoice.taxRate || 0,
      notes: invoice.notes || '',
      status: invoice.status || 'DRAFT',
    });
    setView('edit');
  };

  // Reset form
  const resetForm = () => {
    setSelectedInvoice(null);
    setFormData({
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      invoiceNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      services: [{ description: '', quantity: 1, unitPrice: 0 }],
      depositAmount: 0,
      discount: 0,
      taxRate: 0,
      notes: '',
      status: 'DRAFT',
    });
  };

  // Generate PDF
  const handleGeneratePDF = async (invoice) => {
    // Dynamic import of jsPDF
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text(companyInfo.name, 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(companyInfo.address, 20, 28);
      doc.text(`${companyInfo.phone} | ${companyInfo.email}`, 20, 34);
      
      // Invoice title
      doc.setFontSize(28);
      doc.setTextColor(59, 130, 246);
      doc.text('INVOICE', 150, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 150, 35);
      doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 150, 41);
      doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 150, 47);
      
      // Bill to
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Bill To:', 20, 55);
      doc.setFontSize(10);
      doc.text(invoice.clientName, 20, 62);
      doc.text(invoice.clientAddress || '', 20, 68);
      doc.text(invoice.clientEmail || '', 20, 74);
      doc.text(invoice.clientPhone || '', 20, 80);
      
      // Items table header
      let y = 95;
      doc.setFillColor(59, 130, 246);
      doc.rect(20, y - 5, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('Description', 25, y);
      doc.text('Qty', 120, y);
      doc.text('Price', 140, y);
      doc.text('Total', 165, y);
      
      // Items
      y += 10;
      doc.setTextColor(0, 0, 0);
      invoice.services.forEach((item) => {
        doc.text(item.description.substring(0, 45), 25, y);
        doc.text(String(item.quantity), 120, y);
        doc.text(`$${item.unitPrice.toFixed(2)}`, 140, y);
        doc.text(`$${(item.quantity * item.unitPrice).toFixed(2)}`, 165, y);
        y += 8;
      });
      
      // Totals
      y += 10;
      doc.setFontSize(10);
      doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 140, y);
      y += 7;
      if (invoice.discount > 0) {
        doc.text(`Discount: -$${invoice.discount.toFixed(2)}`, 140, y);
        y += 7;
      }
      if (invoice.tax > 0) {
        doc.text(`Tax (${invoice.taxRate}%): $${invoice.tax.toFixed(2)}`, 140, y);
        y += 7;
      }
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      doc.text(`Total Due: $${invoice.totalDue.toFixed(2)}`, 140, y);
      
      // Notes
      if (invoice.notes) {
        y += 20;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Notes:', 20, y);
        doc.text(invoice.notes.substring(0, 80), 20, y + 6);
      }
      
      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your business!', 20, 270);
      doc.text(`Pay online: ${window.location.origin}/pay/${invoice.id}`, 20, 276);
      
      // Save
      doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Make sure jspdf is installed.');
    }
  };

  // Copy payment link
  const copyPaymentLink = (invoiceId) => {
    const link = `${window.location.origin}/pay/${invoiceId}`;
    navigator.clipboard.writeText(link);
    alert('Payment link copied to clipboard!');
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Render invoice list
  const renderInvoiceList = () => (
    <div className="invoice-list-view">
      <div className="invoice-header-bar">
        <div className="invoice-search">
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            {INVOICE_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button 
          className="create-invoice-btn"
          onClick={() => {
            resetForm();
            setFormData(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber() }));
            setView('create');
          }}
        >
          ➕ New Invoice
        </button>
      </div>

      <div className="invoice-stats">
        <div className="stat-card">
          <span className="stat-value">${invoices.reduce((sum, inv) => sum + (inv.totalDue || 0), 0).toFixed(2)}</span>
          <span className="stat-label">Total Invoiced</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">${invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0).toFixed(2)}</span>
          <span className="stat-label">Total Collected</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{invoices.filter(inv => inv.status === 'PAID').length}</span>
          <span className="stat-label">Paid</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">{invoices.filter(inv => inv.status === 'OVERDUE').length}</span>
          <span className="stat-label">Overdue</span>
        </div>
      </div>

      <div className="invoices-table">
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-invoices">
                  No invoices found. Create your first invoice!
                </td>
              </tr>
            ) : (
              filteredInvoices.map(invoice => {
                const status = INVOICE_STATUSES.find(s => s.value === invoice.status) || INVOICE_STATUSES[0];
                const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID';
                return (
                  <tr key={invoice.id} className={isOverdue ? 'overdue-row' : ''}>
                    <td className="invoice-number">{invoice.invoiceNumber}</td>
                    <td>{invoice.clientName}</td>
                    <td className="amount">${invoice.totalDue?.toFixed(2) || '0.00'}</td>
                    <td className={isOverdue ? 'overdue-date' : ''}>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="invoice-actions">
                      <button title="Edit" onClick={() => handleEditInvoice(invoice)}>✏️</button>
                      <button title="Download PDF" onClick={() => handleGeneratePDF(invoice)}>📄</button>
                      <button title="Copy Link" onClick={() => copyPaymentLink(invoice.id)}>🔗</button>
                      <button title="Delete" onClick={() => handleDeleteInvoice(invoice.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render invoice form
  const renderInvoiceForm = () => {
    const totals = calculateTotals(formData);
    
    return (
      <div className="invoice-form-view">
        <div className="form-header">
          <button className="back-btn" onClick={() => setView('list')}>← Back</button>
          <h2>{view === 'create' ? 'Create Invoice' : 'Edit Invoice'}</h2>
        </div>

        <div className="invoice-form-grid">
          <div className="form-left">
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

            {/* Invoice Details */}
            <div className="form-section">
              <h3>Invoice Details</h3>
              <div className="form-row-group">
                <div className="form-row">
                  <label>Invoice #</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {INVOICE_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row-group">
                <div className="form-row">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="form-section">
              <h3>Services</h3>
              <div className="services-header">
                <span>Description</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
                <span></span>
              </div>
              {formData.services.map((item, index) => (
                <ServiceLineItem
                  key={index}
                  item={item}
                  index={index}
                  onUpdate={handleServiceUpdate}
                  onRemove={removeServiceLine}
                />
              ))}
              <button className="add-line-btn" onClick={addServiceLine}>
                + Add Service
              </button>
            </div>

            {/* Additional Options */}
            <div className="form-section">
              <h3>Additional Options</h3>
              <div className="form-row-group">
                <div className="form-row">
                  <label>Deposit Required ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="form-row">
                  <label>Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="form-row">
                  <label>Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Payment terms, special instructions, etc."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-right">
            {/* Totals Summary */}
            <div className="totals-card">
              <h3>Summary</h3>
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              {formData.discount > 0 && (
                <div className="totals-row discount">
                  <span>Discount:</span>
                  <span>-${formData.discount.toFixed(2)}</span>
                </div>
              )}
              {formData.taxRate > 0 && (
                <div className="totals-row">
                  <span>Tax ({formData.taxRate}%):</span>
                  <span>${totals.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="totals-row grand-total">
                <span>Total Due:</span>
                <span>${totals.totalDue.toFixed(2)}</span>
              </div>
              {formData.depositAmount > 0 && (
                <div className="totals-row deposit">
                  <span>Deposit Required:</span>
                  <span>${formData.depositAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button 
                className="save-draft-btn"
                onClick={() => handleSaveInvoice(false)}
              >
                💾 Save Draft
              </button>
              <button 
                className="save-send-btn"
                onClick={() => handleSaveInvoice(true)}
                disabled={!formData.clientName}
              >
                📤 Save & Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="invoice-generator">
      {view === 'list' && renderInvoiceList()}
      {(view === 'create' || view === 'edit') && renderInvoiceForm()}
    </div>
  );
}
