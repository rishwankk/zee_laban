'use client';

import { useEffect, useState } from 'react';
import { usePrinterStore, PrinterType } from '@/store/usePrinterStore';
import { Printer, RefreshCw, Wifi, Usb, Bluetooth, X, Sparkles } from 'lucide-react';

export default function PrinterStatus() {
  const { 
    isConnected, 
    printerType, 
    printerAddress, 
    checkPrinterStatus, 
    startStatusPolling, 
    stopStatusPolling,
    connectHardware,
    setPrinterConfig,
    testPrint 
  } = usePrinterStore();

  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectOptions, setShowConnectOptions] = useState(false);
  const [networkIp, setNetworkIp] = useState('');

  // Poll printer connection states during the session
  useEffect(() => {
    // Attempt auto-reconnect if browser supports it and permissions were previously granted
    usePrinterStore.getState().autoConnectHardware().then((connected) => {
      // Start polling status regardless of auto-connect success
      startStatusPolling();
    });
    return () => stopStatusPolling();
  }, [startStatusPolling, stopStatusPolling]);

  const handleTestPrint = async () => {
    setIsTesting(true);
    await testPrint();
    setIsTesting(false);
  };

  const handleDisconnect = () => {
    usePrinterStore.getState().disconnectHardware();
  };

  const handleConnect = async (type: PrinterType) => {
    setIsConnecting(true);
    if (type === 'Network') {
      if (!networkIp.trim()) { setIsConnecting(false); return; }
      setPrinterConfig('Network', networkIp.trim());
      setNetworkIp('');
    } else {
      usePrinterStore.setState({ printerType: type });
      const success = await connectHardware();
      if (success) {
        const newAddr = usePrinterStore.getState().printerAddress;
        setPrinterConfig(type, newAddr);
      }
    }
    setIsConnecting(false);
    setShowConnectOptions(false);
  };

  // ─── CONNECTED STATE ───
  if (isConnected) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-white border border-emerald-100 p-3.5 shadow-sm select-none">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 shrink-0">
            <Printer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-text-primary truncate">
                {printerAddress || 'Printer'}
              </span>
              <span className="flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 shrink-0">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            </div>
            <p className="text-[9px] font-bold text-text-muted mt-0.5">
              via {printerType}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Test Print */}
          <button
            onClick={handleTestPrint}
            disabled={isTesting}
            className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? 'Printing...' : 'Test'}
          </button>
          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 transition-all active:scale-95 cursor-pointer"
            title="Disconnect Printer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── DISCONNECTED STATE ───
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-3.5 shadow-sm select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 shrink-0">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-text-primary">
                Receipt Printer
              </span>
              <span className="flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-700 shrink-0">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                Offline
              </span>
            </div>
            <p className="text-[9px] font-bold text-text-muted mt-0.5">
              No printer connected
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowConnectOptions(!showConnectOptions)}
          className="rounded-lg bg-slate-800 hover:bg-slate-900 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white transition-all active:scale-[0.97] cursor-pointer"
        >
          {showConnectOptions ? 'Cancel' : 'Connect'}
        </button>
      </div>

      {/* Connection Options */}
      {showConnectOptions && (
        <div className="space-y-3 pt-1 animate-fade-in">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Bluetooth' as PrinterType, label: 'Bluetooth', icon: Bluetooth },
              { id: 'USB' as PrinterType, label: 'USB', icon: Usb },
              { id: 'Network' as PrinterType, label: 'WiFi / LAN', icon: Wifi },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  if (opt.id === 'Network') {
                    // Show IP input instead of connecting immediately
                    usePrinterStore.setState({ printerType: 'Network' });
                  } else {
                    handleConnect(opt.id);
                  }
                }}
                disabled={isConnecting}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                  printerType === opt.id
                    ? 'bg-primary text-white border-transparent shadow-md shadow-primary/10'
                    : 'bg-white text-text-primary border-gray-100 hover:border-primary/20'
                }`}
              >
                <opt.icon className="h-4 w-4 mb-1" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Network IP input */}
          {printerType === 'Network' && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={networkIp}
                onChange={(e) => setNetworkIp(e.target.value)}
                placeholder="E.g. http://192.168.1.150:9100"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-mono font-bold outline-none focus:border-primary focus:bg-white transition-all"
              />
              <button
                onClick={() => handleConnect('Network')}
                disabled={!networkIp.trim() || isConnecting}
                className="rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-[10px] font-black uppercase text-white transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isConnecting ? '...' : 'Connect'}
              </button>
            </div>
          )}

          {/* Bluetooth/USB hint */}
          {printerType !== 'Network' && (
            <p className="text-[9px] font-semibold text-slate-400 text-center">
              {isConnecting ? 'Searching for devices...' : 'Tap a connection type to search & pair your printer.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
