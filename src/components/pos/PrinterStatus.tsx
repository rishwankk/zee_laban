'use client';

import { useEffect, useState } from 'react';
import { usePrinterStore } from '@/store/usePrinterStore';
import { CheckCircle2, AlertCircle, Printer, RefreshCw } from 'lucide-react';

export default function PrinterStatus() {
  const { 
    isConnected, 
    printerType, 
    printerAddress, 
    checkPrinterStatus, 
    startStatusPolling, 
    stopStatusPolling,
    testPrint 
  } = usePrinterStore();

  const [isTesting, setIsTesting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Poll printer connection states during the session
  useEffect(() => {
    startStatusPolling();
    return () => stopStatusPolling();
  }, [startStatusPolling, stopStatusPolling]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    await checkPrinterStatus();
    setIsChecking(false);
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    await testPrint();
    setIsTesting(false);
  };

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white border border-gray-100 p-3.5 shadow-sm select-none">
      
      {/* Printer Info & Status badge */}
      <div className="flex items-center space-x-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          isConnected ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
        }`}>
          <Printer className="h-5 w-5" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-text-primary">
              Receipt Printer
            </span>
            <span className={`flex items-center space-x-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              isConnected 
                ? 'bg-emerald-100 text-emerald-700 animate-pulse' 
                : 'bg-red-100 text-red-700'
            }`}>
              <span className={`mr-1 h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <p className="text-[9px] font-bold text-text-muted mt-0.5 truncate max-w-[150px]">
            {printerType}: {printerAddress}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Recheck Trigger */}
        <button
          onClick={handleManualCheck}
          disabled={isChecking}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 text-text-muted transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Refresh Printer Connection"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        </button>

        {/* Test receipt dumper */}
        {isConnected && (
          <button
            onClick={handleTestPrint}
            disabled={isTesting}
            className="rounded-lg bg-primary-light border border-blue-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? 'Printing...' : 'Test'}
          </button>
        )}
      </div>

    </div>
  );
}
