'use client';

import { QrCode, Smartphone, Sparkles } from 'lucide-react';

interface UpiQrDisplayProps {
  amount: number;
  billNumber: string;
  storeName: string;
  upiId?: string;
}

export default function UpiQrDisplay({
  amount,
  billNumber,
  storeName,
  upiId
}: UpiQrDisplayProps) {
  
  const hasUpi = !!(upiId && upiId.trim());

  if (!hasUpi) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-red-50/50 border border-red-100 p-6 animate-fade-in text-center select-none w-full">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-danger mb-4 shadow-sm">
          <QrCode className="h-6 w-6 stroke-[2px]" />
        </div>
        <h4 className="text-xs font-black text-danger uppercase tracking-wider">
          UPI QR not configured
        </h4>
        <p className="text-[10px] text-text-muted mt-2 leading-relaxed max-w-[200px]">
          Please configure a Virtual Payment Address (VPA) / UPI ID in Settings to display the scan-to-pay QR code.
        </p>
      </div>
    );
  }

  const vpa = upiId.trim();
  
  // Create UPI payment deep link using the precise payment schema
  const upiLink = `upi://pay?pa=${vpa}&am=${amount.toFixed(2)}&cu=INR&tn=Verified Merchant Account`;
  
  // Load high-fidelity QR Code URL using a fast public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="flex flex-col items-center rounded-2xl bg-primary-light border border-blue-100 p-3 sm:p-4 animate-fade-in select-none">
      
      {/* Header Info */}
      <div className="flex items-center space-x-2 text-[10px] sm:text-xs font-bold text-primary mb-2.5 sm:mb-3">
        <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>Scan & Pay via UPI</span>
      </div>

      {/* QR Wrapper */}
      <div className="relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-2xl bg-white p-1.5 sm:p-2 shadow-md border border-blue-50/50 overflow-hidden group">
        <img
          src={qrCodeUrl}
          alt={`UPI QR Code for ₹${amount.toFixed(2)}`}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-102"
        />
        
        {/* Dynamic Scan Indicator badge */}
        <span className="absolute bottom-1 bg-primary text-white font-mono text-[7px] sm:text-[8px] font-black tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm">
          ₹{amount.toFixed(2)}
        </span>
      </div>

      {/* Bottom Details */}
      <div className="mt-2 sm:mt-3 text-center w-full px-1">
        <p className="font-mono text-[9px] sm:text-[10px] font-black text-primary-dark truncate">
          VPA: {vpa}
        </p>
        <p className="text-[8px] sm:text-[9px] font-bold text-text-muted mt-0.5 truncate">
          Reference: {billNumber}
        </p>
      </div>

    </div>
  );
}
