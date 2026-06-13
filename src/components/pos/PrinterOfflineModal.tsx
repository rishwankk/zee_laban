'use client';

import { useState } from 'react';
import { usePrinterStore } from '@/store/usePrinterStore';
import { AlertTriangle, Printer, Save, RefreshCw, X } from 'lucide-react';

interface PrinterOfflineModalProps {
  onRetry: () => Promise<void>;
}

export default function PrinterOfflineModal({ onRetry }: PrinterOfflineModalProps) {
  const { showOfflineModal, closeOfflineModal, onContinueWithoutPrinting } = usePrinterStore();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!showOfflineModal) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    // Simulate a brief delay to feel realistic
    await new Promise(resolve => setTimeout(resolve, 800));
    await onRetry();
    setIsRetrying(false);
  };

  const handleContinue = () => {
    if (onContinueWithoutPrinting) {
      onContinueWithoutPrinting();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4 select-none animate-fade-in">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={closeOfflineModal}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-text-muted hover:bg-gray-50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-warning mb-4 shadow-inner">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
          </div>
          <h3 className="font-display text-lg font-black text-text-primary">
            Printer Not Connected
          </h3>
          <p className="mt-2 text-xs font-semibold text-text-muted px-4 leading-relaxed">
            The thermal receipt printer is currently unreachable. The completed invoice will still be securely saved to the database.
          </p>
        </div>

        {/* Dialog Divider */}
        <div className="h-[1px] w-full bg-gray-100 my-4"></div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3.5 mt-6">
          
          {/* Retry Print Trigger */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center justify-center space-x-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 py-3.5 text-xs font-black text-text-primary transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 text-text-muted" />
                <span>Try Again</span>
              </>
            )}
          </button>

          {/* Force Save Bypass */}
          <button
            onClick={handleContinue}
            className="flex items-center justify-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark py-3.5 text-xs font-black text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Save className="h-4 w-4 text-primary-light" />
            <span>Save & Continue</span>
          </button>

        </div>

      </div>

    </div>
  );
}
