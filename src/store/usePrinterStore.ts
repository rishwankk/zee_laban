import { create } from 'zustand';

export type PrinterType = 'USB' | 'Network' | 'Bluetooth';

interface PrinterState {
  isConnected: boolean;
  printerType: PrinterType;
  printerAddress: string;
  isPolling: boolean;
  showOfflineModal: boolean;
  onContinueWithoutPrinting: (() => void) | null;

  // Actions
  setPrinterConfig: (type: PrinterType, address: string) => void;
  checkPrinterStatus: () => Promise<boolean>;
  connectHardware: () => Promise<boolean>;
  startStatusPolling: () => void;
  stopStatusPolling: () => void;
  triggerPrint: (printData: { htmlContent: string; onComplete: () => void }) => Promise<void>;
  closeOfflineModal: () => void;
  testPrint: () => Promise<boolean>;
}

let pollingInterval: NodeJS.Timeout | null = null;

export const usePrinterStore = create<PrinterState>((set, get) => ({
  isConnected: false, // Default to offline until verified
  printerType: 'Bluetooth',
  printerAddress: 'default_bt',
  isPolling: false,
  showOfflineModal: false,
  onContinueWithoutPrinting: null,

  setPrinterConfig: (type: PrinterType, address: string) => {
    set({ printerType: type, printerAddress: address });
    get().checkPrinterStatus();
  },

  checkPrinterStatus: async () => {
    const { printerType, printerAddress } = get();

    if (printerType === 'Network') {
      try {
        // Simulate a LAN ping request to custom IP
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout

        await fetch(printerAddress, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        set({ isConnected: true });
        return true;
      } catch (err) {
        set({ isConnected: false });
        return false;
      }
    }

    if (printerType === 'USB') {
      try {
        if (typeof window !== 'undefined' && 'usb' in navigator) {
          const devices = await (navigator as any).usb.getDevices();
          const hasDevices = devices.length > 0;
          set({ isConnected: hasDevices });
          return hasDevices;
        }
      } catch {
        set({ isConnected: false });
        return false;
      }
    }

    if (printerType === 'Bluetooth') {
      try {
        if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
          // Simply check if Bluetooth API is available for now
          // Actual device pairing requires user gesture
          const hasBt = true; // Assume true if API exists, actual printing handles failures
          set({ isConnected: hasBt });
          return hasBt;
        }
      } catch {
        set({ isConnected: false });
        return false;
      }
    }

    set({ isConnected: false });
    return false;
  },

  connectHardware: async () => {
    const { printerType } = get();

    if (printerType === 'Bluetooth') {
      try {
        if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
          const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true });
          if (device) {
            set({ isConnected: true, printerAddress: device.name || 'Bluetooth Printer' });
            return true;
          }
        }
      } catch (err) {
        console.error("Bluetooth pairing failed:", err);
      }
    }

    if (printerType === 'USB') {
      try {
        if (typeof window !== 'undefined' && 'usb' in navigator) {
          const device = await (navigator as any).usb.requestDevice({ filters: [] });
          if (device) {
            const name = device.productName || 'USB Printer';
            set({ isConnected: true, printerAddress: name });
            return true;
          }
        }
      } catch (err) {
        console.error("USB pairing failed:", err);
      }
    }

    set({ isConnected: false });
    return false;
  },

  startStatusPolling: () => {
    if (pollingInterval) return;
    set({ isPolling: true });

    // Poll every 12 seconds
    pollingInterval = setInterval(() => {
      get().checkPrinterStatus();
    }, 12000);
  },

  stopStatusPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ isPolling: false });
  },

  triggerPrint: async ({ htmlContent, onComplete }) => {
    // Ping printer status in the background but do not let it block sales
    get().checkPrinterStatus().catch(console.error);

    // Print immediately using native browser print pipeline
    if (typeof window !== 'undefined') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.write(`
          <html>
            <head>
              <style>
                @page { size: 80mm auto; margin: 0; }
                body {
                  width: 76mm;
                  margin: 0 auto;
                  padding: 2mm;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  font-size: 10px;
                  line-height: 1.4;
                  color: #000;
                }
                .center { text-align: center; }
                .right { text-align: right; }
                .left { text-align: left; }
                .bold { font-weight: bold; }
                .line { border-top: 1px solid #000; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 3px 0; vertical-align: top; }
                th { border-bottom: 1px solid #000; padding-bottom: 5px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
              </style>
            </head>
            <body>
              ${htmlContent}
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() {
                    window.parent.document.body.removeChild(iframe);
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
      }
    }

    // Always trigger success callback immediately to clear cart and log invoice
    onComplete();
  },

  closeOfflineModal: () => {
    set({ showOfflineModal: false, onContinueWithoutPrinting: null });
  },

  testPrint: async () => {
    const isConnected = await get().checkPrinterStatus();
    if (!isConnected) return false;

    // Send a simple test block
    const testHtml = `
      <div class="center bold" style="font-size: 14px;">LABAN DESSERTS</div>
      <div class="center">*** TEST PRINT ***</div>
      <div class="line"></div>
      <div class="center">PRINTER STATUS: ONLINE</div>
      <div class="center">TYPE: ${get().printerType}</div>
      <div class="center">ADDR: ${get().printerAddress}</div>
      <div class="line"></div>
      <div class="center">${new Date().toLocaleString()}</div>
      <div class="center">Connection test successful! 😊</div>
    `;

    if (typeof window !== 'undefined') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.write(`
          <html>
            <head>
              <style>
                @page { size: 80mm auto; margin: 0; }
                body { width: 76mm; margin: 0 auto; padding: 2mm; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-align: center; }
                .line { border-top: 1px dashed #000; margin: 5px 0; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
              </style>
            </head>
            <body>
              ${testHtml}
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.parent.document.body.removeChild(iframe); }, 500);
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
      }
    }
    return true;
  }
}));

