import React, { useRef, useState, useEffect } from 'react';
import './SignaturePad.css';

export default function SignaturePad({ onSave, onCancel, width = 400, height = 200 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set up canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    setContext(ctx);
  }, [width, height]);

  // Get position from event (mouse or touch)
  const getPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Start drawing
  const startDrawing = (e) => {
    e.preventDefault();
    const pos = getPosition(e);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  // Draw
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPosition(e);
    context.lineTo(pos.x, pos.y);
    context.stroke();
  };

  // Stop drawing
  const stopDrawing = (e) => {
    if (isDrawing) {
      e.preventDefault();
      context.closePath();
      setIsDrawing(false);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    setHasSignature(false);
  };

  // Save signature
  const handleSave = () => {
    if (!hasSignature) {
      alert('Please provide your signature first');
      return;
    }
    
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="signature-pad-container">
      <div className="signature-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="signature-line">
          <span>Sign above</span>
        </div>
      </div>
      
      <div className="signature-actions">
        <button className="clear-btn" onClick={clearCanvas}>
          🗑️ Clear
        </button>
        <div className="action-buttons">
          {onCancel && (
            <button className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={!hasSignature}
          >
            ✅ Accept & Sign
          </button>
        </div>
      </div>
      
      <p className="signature-disclaimer">
        By signing above, you acknowledge that this is your legal signature and 
        you agree to the terms stated in this document.
      </p>
    </div>
  );
}
