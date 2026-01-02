import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { subscribeToContracts, updateContract } from '../firebase';
import SignaturePad from './SignaturePad';
import './ContractSigningPortal.css';

// Contract status display
const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: '#6b7280', icon: '📝' },
  SENT: { label: 'Awaiting Signature', color: '#3b82f6', icon: '📤' },
  VIEWED: { label: 'Viewed', color: '#8b5cf6', icon: '👁️' },
  SIGNED: { label: 'Signed', color: '#22c55e', icon: '✅' },
  EXPIRED: { label: 'Expired', color: '#f59e0b', icon: '⏰' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', icon: '❌' },
};

export default function ContractSigningPortal() {
  const { contractId } = useParams();
  const [searchParams] = useSearchParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signingComplete, setSigningComplete] = useState(false);

  // Company info
  const companyInfo = {
    name: 'NJ Developments',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    email: 'contracts@njdevelopments.com',
  };

  // Subscribe to contract data
  useEffect(() => {
    const unsubscribe = subscribeToContracts((contracts) => {
      const found = contracts.find(c => c.id === contractId);
      if (found) {
        setContract(found);
        // Mark as viewed if first time
        if (found.status === 'SENT') {
          updateContract(contractId, { status: 'VIEWED', viewedAt: Date.now() });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [contractId]);

  // Process template variables
  const processTemplate = (content, data) => {
    if (!content) return '';
    let processed = content;
    const variables = {
      date: new Date().toLocaleDateString(),
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      companyPhone: companyInfo.phone,
      companyEmail: companyInfo.email,
      clientName: data?.clientName || '_______________',
      clientAddress: data?.clientAddress || '_______________',
      clientPhone: data?.clientPhone || '_______________',
      clientEmail: data?.clientEmail || '_______________',
      signatureDate: new Date().toLocaleDateString(),
      ...(data?.customFields || {}),
    };

    Object.entries(variables).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value || '_______________');
    });

    return processed;
  };

  // Handle signature
  const handleSignatureComplete = async (signatureData) => {
    try {
      await updateContract(contractId, {
        status: 'SIGNED',
        signedAt: Date.now(),
        signatureData,
        signedBy: contract.clientName,
        signedFromIP: 'client', // In production, you'd capture the actual IP
      });
      setShowSignaturePad(false);
      setSigningComplete(true);
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature. Please try again.');
    }
  };

  // Download signed contract
  const handleDownloadPDF = async () => {
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
      
      // Add signature
      if (contract.signatureData) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('CLIENT SIGNATURE:', 20, 30);
        doc.addImage(contract.signatureData, 'PNG', 20, 35, 80, 30);
        doc.setFontSize(10);
        doc.text(`Signed by: ${contract.signedBy}`, 20, 75);
        doc.text(`Date: ${new Date(contract.signedAt).toLocaleDateString()}`, 20, 82);
      }
      
      doc.save(`Signed-Contract-${contract.clientName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="signing-portal">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading contract...</p>
        </div>
      </div>
    );
  }

  // Contract not found
  if (!contract) {
    return (
      <div className="signing-portal">
        <div className="not-found">
          <span className="not-found-icon">📄</span>
          <h2>Contract Not Found</h2>
          <p>The contract you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Check if expired
  const isExpired = contract.expiresAt && new Date(contract.expiresAt) < new Date();
  const isSigned = contract.status === 'SIGNED';
  const canSign = ['SENT', 'VIEWED'].includes(contract.status) && !isExpired;

  const status = STATUS_CONFIG[contract.status] || STATUS_CONFIG.SENT;

  return (
    <div className="signing-portal">
      <div className="portal-container">
        {/* Header */}
        <div className="portal-header">
          <h1>{companyInfo.name}</h1>
          <p>Contract Signing Portal</p>
        </div>

        {/* Signing Complete Message */}
        {signingComplete && (
          <div className="signing-complete-banner">
            <span className="complete-icon">✅</span>
            <div>
              <h3>Contract Signed Successfully!</h3>
              <p>You will receive a copy via email shortly.</p>
            </div>
          </div>
        )}

        {/* Contract Card */}
        <div className="contract-card">
          <div className="contract-card-header">
            <div>
              <span className="contract-label">Service Agreement</span>
              <h2 className="contract-title">
                {contract.templateType === 'junk_removal' && 'Junk Removal Service Agreement'}
                {contract.templateType === 'real_estate' && 'Real Estate Services Agreement'}
                {contract.templateType === 'general_service' && 'General Service Agreement'}
                {!contract.templateType && 'Service Agreement'}
              </h2>
            </div>
            <div 
              className="status-badge"
              style={{ backgroundColor: status.color }}
            >
              {status.icon} {status.label}
            </div>
          </div>

          {/* Client Info */}
          <div className="contract-parties">
            <div className="party">
              <h4>Service Provider</h4>
              <p className="party-name">{companyInfo.name}</p>
              <p>{companyInfo.address}</p>
              <p>{companyInfo.phone}</p>
            </div>
            <div className="party">
              <h4>Client</h4>
              <p className="party-name">{contract.clientName}</p>
              <p>{contract.clientAddress}</p>
              <p>{contract.clientEmail}</p>
            </div>
          </div>

          {/* Contract Content */}
          <div className="contract-content">
            <pre>{processTemplate(contract.content, contract)}</pre>
          </div>

          {/* Signature Section */}
          {isSigned && contract.signatureData && (
            <div className="signature-section signed">
              <h4>✅ Signed by {contract.signedBy}</h4>
              <div className="signature-display">
                <img src={contract.signatureData} alt="Signature" />
              </div>
              <p className="signature-date">
                Signed on {new Date(contract.signedAt).toLocaleString()}
              </p>
              <button className="download-btn" onClick={handleDownloadPDF}>
                📥 Download Signed Contract
              </button>
            </div>
          )}

          {/* Expired Notice */}
          {isExpired && !isSigned && (
            <div className="expired-notice">
              <span className="expired-icon">⏰</span>
              <h3>This Contract Has Expired</h3>
              <p>Please contact {companyInfo.name} for a new agreement.</p>
            </div>
          )}

          {/* Signing Area */}
          {canSign && !showSignaturePad && (
            <div className="signing-area">
              <div className="terms-agreement">
                <label>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <span>
                    I have read and agree to the terms and conditions stated in this agreement.
                  </span>
                </label>
              </div>
              <button 
                className="sign-btn"
                onClick={() => setShowSignaturePad(true)}
                disabled={!agreedToTerms}
              >
                ✍️ Sign Contract
              </button>
            </div>
          )}

          {/* Signature Pad */}
          {showSignaturePad && (
            <div className="signature-pad-section">
              <h3>Sign Below</h3>
              <SignaturePad
                onSave={handleSignatureComplete}
                onCancel={() => setShowSignaturePad(false)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="portal-footer">
          <p>Questions about this contract?</p>
          <p>Contact us at {companyInfo.email}</p>
        </div>
      </div>
    </div>
  );
}
