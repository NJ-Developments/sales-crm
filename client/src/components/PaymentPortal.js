import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { subscribeToInvoices, updateInvoice, savePaymentRecord } from '../firebase';
import './PaymentPortal.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

// Invoice status display
const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: '#6b7280', icon: '📝' },
  SENT: { label: 'Awaiting Payment', color: '#3b82f6', icon: '📤' },
  VIEWED: { label: 'Viewed', color: '#8b5cf6', icon: '👁️' },
  PARTIAL: { label: 'Partially Paid', color: '#f59e0b', icon: '💵' },
  PAID: { label: 'Paid', color: '#22c55e', icon: '✅' },
  OVERDUE: { label: 'Overdue', color: '#ef4444', icon: '⚠️' },
  CANCELLED: { label: 'Cancelled', color: '#6b7280', icon: '❌' },
};

export default function PaymentPortal() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('full'); // 'full', 'deposit', 'custom'
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);

  // Check for payment result from Stripe redirect
  useEffect(() => {
    const result = searchParams.get('payment');
    if (result === 'success') {
      setPaymentSuccess(true);
    } else if (result === 'cancelled') {
      setPaymentCancelled(true);
    }
  }, [searchParams]);

  // Subscribe to invoice data
  useEffect(() => {
    const unsubscribe = subscribeToInvoices((invoices) => {
      const found = invoices.find(inv => inv.id === invoiceId);
      if (found) {
        setInvoice(found);
        // Mark as viewed if first time
        if (found.status === 'SENT') {
          updateInvoice(invoiceId, { status: 'VIEWED', viewedAt: Date.now() });
        }
        // Set default payment amount
        const balance = found.totalDue - (found.amountPaid || 0);
        setPaymentAmount(balance.toFixed(2));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [invoiceId]);

  // Calculate balance due
  const balanceDue = invoice ? invoice.totalDue - (invoice.amountPaid || 0) : 0;

  // Handle payment type change
  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    if (type === 'full') {
      setPaymentAmount(balanceDue.toFixed(2));
    } else if (type === 'deposit') {
      setPaymentAmount((invoice.depositAmount || 0).toFixed(2));
    }
  };

  // Initiate Stripe Checkout
  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    if (amount > balanceDue) {
      alert('Payment amount cannot exceed balance due');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName}`,
          invoiceId: invoice.id,
          customerId: invoice.stripeCustomerId || null,
          successUrl: `${window.location.origin}/pay/${invoice.id}?payment=success`,
          cancelUrl: `${window.location.origin}/pay/${invoice.id}?payment=cancelled`,
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed: ' + error.message);
      setProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="payment-portal">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  // Invoice not found
  if (!invoice) {
    return (
      <div className="payment-portal">
        <div className="not-found">
          <span className="not-found-icon">🔍</span>
          <h2>Invoice Not Found</h2>
          <p>The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Payment success screen
  if (paymentSuccess) {
    return (
      <div className="payment-portal">
        <div className="payment-result success">
          <div className="result-icon">✅</div>
          <h2>Payment Successful!</h2>
          <p>Thank you for your payment.</p>
          <div className="payment-details">
            <p><strong>Invoice:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Amount Paid:</strong> ${paymentAmount}</p>
          </div>
          <p className="receipt-note">A receipt has been sent to your email.</p>
          <button 
            className="view-invoice-btn"
            onClick={() => window.location.href = `/pay/${invoiceId}`}
          >
            View Invoice
          </button>
        </div>
      </div>
    );
  }

  // Payment cancelled screen
  if (paymentCancelled) {
    return (
      <div className="payment-portal">
        <div className="payment-result cancelled">
          <div className="result-icon">❌</div>
          <h2>Payment Cancelled</h2>
          <p>Your payment was not processed.</p>
          <button 
            className="try-again-btn"
            onClick={() => window.location.href = `/pay/${invoiceId}`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.SENT;
  const isPayable = ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'].includes(invoice.status);
  const isPaid = invoice.status === 'PAID' || balanceDue <= 0;

  return (
    <div className="payment-portal">
      <div className="portal-container">
        {/* Header */}
        <div className="portal-header">
          <h1>NJ Developments</h1>
          <p>Invoice Payment Portal</p>
        </div>

        {/* Invoice Card */}
        <div className="invoice-card">
          <div className="invoice-card-header">
            <div>
              <span className="invoice-label">Invoice</span>
              <h2 className="invoice-number">{invoice.invoiceNumber}</h2>
            </div>
            <div 
              className="status-badge"
              style={{ backgroundColor: status.color }}
            >
              {status.icon} {status.label}
            </div>
          </div>

          <div className="invoice-info-grid">
            <div className="info-section">
              <h4>Bill To</h4>
              <p className="client-name">{invoice.clientName}</p>
              <p>{invoice.clientAddress}</p>
              <p>{invoice.clientEmail}</p>
              <p>{invoice.clientPhone}</p>
            </div>
            <div className="info-section">
              <h4>Invoice Details</h4>
              <p><strong>Issue Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
              {invoice.status === 'OVERDUE' && (
                <p className="overdue-notice">⚠️ This invoice is overdue</p>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="services-section">
            <h4>Services</h4>
            <table className="services-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.services?.map((service, idx) => (
                  <tr key={idx}>
                    <td>{service.description}</td>
                    <td>{service.quantity}</td>
                    <td>${service.unitPrice?.toFixed(2)}</td>
                    <td>${(service.quantity * service.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="totals-section">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>${invoice.subtotal?.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="totals-row discount">
                <span>Discount</span>
                <span>-${invoice.discount?.toFixed(2)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="totals-row">
                <span>Tax ({invoice.taxRate}%)</span>
                <span>${invoice.tax?.toFixed(2)}</span>
              </div>
            )}
            <div className="totals-row total">
              <span>Total</span>
              <span>${invoice.totalDue?.toFixed(2)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="totals-row paid">
                  <span>Paid</span>
                  <span>-${invoice.amountPaid?.toFixed(2)}</span>
                </div>
                <div className="totals-row balance">
                  <span>Balance Due</span>
                  <span>${balanceDue.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="notes-section">
              <h4>Notes</h4>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Payment Section */}
        {isPayable && !isPaid && (
          <div className="payment-section">
            <h3>Make a Payment</h3>
            
            <div className="payment-options">
              <button 
                className={`payment-option ${paymentType === 'full' ? 'active' : ''}`}
                onClick={() => handlePaymentTypeChange('full')}
              >
                <span className="option-label">Pay in Full</span>
                <span className="option-amount">${balanceDue.toFixed(2)}</span>
              </button>
              
              {invoice.depositAmount > 0 && invoice.amountPaid < invoice.depositAmount && (
                <button 
                  className={`payment-option ${paymentType === 'deposit' ? 'active' : ''}`}
                  onClick={() => handlePaymentTypeChange('deposit')}
                >
                  <span className="option-label">Pay Deposit</span>
                  <span className="option-amount">${invoice.depositAmount?.toFixed(2)}</span>
                </button>
              )}
              
              <button 
                className={`payment-option ${paymentType === 'custom' ? 'active' : ''}`}
                onClick={() => handlePaymentTypeChange('custom')}
              >
                <span className="option-label">Custom Amount</span>
                <span className="option-amount">Enter below</span>
              </button>
            </div>

            {paymentType === 'custom' && (
              <div className="custom-amount">
                <label>Payment Amount ($)</label>
                <input
                  type="number"
                  min="1"
                  max={balanceDue}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            <button 
              className="pay-now-btn"
              onClick={handlePayment}
              disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              {processing ? (
                <>
                  <span className="btn-spinner"></span>
                  Processing...
                </>
              ) : (
                <>💳 Pay ${parseFloat(paymentAmount || 0).toFixed(2)} Now</>
              )}
            </button>

            <div className="secure-badge">
              🔒 Secured by Stripe
            </div>
          </div>
        )}

        {/* Paid Badge */}
        {isPaid && (
          <div className="paid-section">
            <div className="paid-badge">
              <span className="paid-icon">✅</span>
              <span>This invoice has been paid in full</span>
            </div>
            <p className="paid-date">
              Paid on {new Date(invoice.paidAt || invoice.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="portal-footer">
          <p>Questions about this invoice?</p>
          <p>Contact us at billing@njdevelopments.com</p>
        </div>
      </div>
    </div>
  );
}
