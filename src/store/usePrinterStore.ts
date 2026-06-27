import { create } from 'zustand';

export type PrinterType = 'USB' | 'Network' | 'Bluetooth';

interface PrinterState {
  isConnected: boolean;
  printerType: PrinterType;
  printerAddress: string;
  isPolling: boolean;
  showOfflineModal: boolean;
  onContinueWithoutPrinting: (() => void) | null;

  btDevice: any;
  btCharacteristic: any;
  usbDevice: any;
  usbEndpoint: number | null;

  // Actions
  setPrinterConfig: (type: PrinterType, address: string) => void;
  checkPrinterStatus: () => Promise<boolean>;
  connectHardware: () => Promise<boolean>;
  disconnectHardware: () => void;
  autoConnectHardware: () => Promise<boolean>;
  startStatusPolling: () => void;
  stopStatusPolling: () => void;
  sendRawData: (data: Uint8Array) => Promise<boolean>;
  triggerPrint: (printData: { htmlContent?: string; htmlContents?: string[]; rawTexts?: string[]; rawBuffers?: Uint8Array[]; onComplete: () => void }) => Promise<void>;
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

  btDevice: null,
  btCharacteristic: null,
  usbDevice: null,
  usbEndpoint: null,

  setPrinterConfig: (type: PrinterType, address: string) => {
    set({ printerType: type, printerAddress: address });
    get().checkPrinterStatus();
  },

  checkPrinterStatus: async () => {
    const { printerType, printerAddress, btDevice, usbDevice } = get();

    if (printerType === 'Network') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

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
      if (usbDevice && usbDevice.opened) {
        set({ isConnected: true });
        return true;
      }
      set({ isConnected: false });
      return false;
    }

    if (printerType === 'Bluetooth') {
      if (btDevice && btDevice.gatt && btDevice.gatt.connected) {
        set({ isConnected: true });
        return true;
      }
      set({ isConnected: false });
      return false;
    }

    set({ isConnected: false });
    return false;
  },

  connectHardware: async () => {
    const { printerType } = get();

    if (printerType === 'Bluetooth') {
      try {
        if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
          const device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              '000018f0-0000-1000-8000-00805f9b34fb', // Common POS thermal printer service
              'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
              '49535343-fe7d-4ae5-8fa9-9fafd205e455'
            ]
          });
          
          if (device) {
            const server = await device.gatt.connect();
            const services = await server.getPrimaryServices();
            
            let targetCharacteristic = null;
            for (const service of services) {
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  targetCharacteristic = char;
                  break;
                }
              }
              if (targetCharacteristic) break;
            }

            if (targetCharacteristic) {
              device.addEventListener('gattserverdisconnected', () => {
                set({ isConnected: false, btDevice: null, btCharacteristic: null });
              });

              set({ 
                isConnected: true, 
                printerAddress: device.name || 'Bluetooth Printer',
                btDevice: device,
                btCharacteristic: targetCharacteristic
              });
              return true;
            } else {
              console.error("No writable characteristic found for Bluetooth device.");
            }
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
            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);

            let outEndpoint = null;
            const iface = device.configuration.interfaces[0].alternate;
            for (const endpoint of iface.endpoints) {
              if (endpoint.direction === 'out') {
                outEndpoint = endpoint.endpointNumber;
                break;
              }
            }

            if (outEndpoint !== null) {
              set({ 
                isConnected: true, 
                printerAddress: device.productName || 'USB Printer',
                usbDevice: device,
                usbEndpoint: outEndpoint
              });
              return true;
            } else {
              console.error("No OUT endpoint found for USB device.");
            }
          }
        }
      } catch (err) {
        console.error("USB pairing failed:", err);
      }
    }

    set({ isConnected: false });
    return false;
  },

  disconnectHardware: () => {
    const { printerType, btDevice, usbDevice } = get();
    
    if (printerType === 'Bluetooth' && btDevice && btDevice.gatt) {
      if (btDevice.gatt.connected) {
        btDevice.gatt.disconnect();
      }
    }
    
    if (printerType === 'USB' && usbDevice) {
      if (usbDevice.opened) {
        usbDevice.close();
      }
    }
    
    set({ 
      isConnected: false, 
      btDevice: null, 
      btCharacteristic: null, 
      usbDevice: null, 
      usbEndpoint: null 
    });
  },

  autoConnectHardware: async () => {
    const { printerType } = get();
    
    if (printerType === 'Bluetooth') {
      try {
        if (typeof window !== 'undefined' && 'bluetooth' in navigator && (navigator as any).bluetooth.getDevices) {
          const devices = await (navigator as any).bluetooth.getDevices();
          for (const device of devices) {
            if (device.name === get().printerAddress || devices.length === 1) {
              const server = await device.gatt.connect();
              const services = await server.getPrimaryServices();
              
              let targetCharacteristic = null;
              for (const service of services) {
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                  if (char.properties.write || char.properties.writeWithoutResponse) {
                    targetCharacteristic = char;
                    break;
                  }
                }
                if (targetCharacteristic) break;
              }

              if (targetCharacteristic) {
                device.addEventListener('gattserverdisconnected', () => {
                  set({ isConnected: false, btDevice: null, btCharacteristic: null });
                });

                set({ 
                  isConnected: true, 
                  printerAddress: device.name || 'Bluetooth Printer',
                  btDevice: device,
                  btCharacteristic: targetCharacteristic
                });
                return true;
              }
            }
          }
        }
      } catch (err) {
        console.error("Auto Bluetooth connection failed:", err);
      }
    }

    return false;
  },

  startStatusPolling: () => {
    if (pollingInterval) return;
    set({ isPolling: true });

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

  sendRawData: async (data: Uint8Array) => {
    const state = get();
    if (state.printerType === 'Bluetooth' && state.btCharacteristic) {
      try {
        const chunkSize = 200; // Safe chunk size for BLE
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          await state.btCharacteristic.writeValue(chunk);
        }
        return true;
      } catch (e) {
        console.error('BLE write failed', e);
        return false;
      }
    }
    if (state.printerType === 'USB' && state.usbDevice && state.usbEndpoint !== null) {
      try {
        await state.usbDevice.transferOut(state.usbEndpoint, data);
        return true;
      } catch (e) {
        console.error('USB write failed', e);
        return false;
      }
    }
    return false;
  },

  triggerPrint: async ({ htmlContent, htmlContents, rawTexts, rawBuffers, onComplete }) => {
    get().checkPrinterStatus().catch(console.error);
    const state = get();

    // Check if we can print directly to hardware via Web APIs
    const canPrintDirect = (state.printerType === 'Bluetooth' && state.btCharacteristic) || 
                           (state.printerType === 'USB' && state.usbDevice && state.usbEndpoint !== null);

    if (canPrintDirect) {
      try {
        if (rawBuffers && rawBuffers.length > 0) {
          for (const buf of rawBuffers) {
            await get().sendRawData(buf);
            await new Promise(res => setTimeout(res, 500));
          }
          onComplete();
          return;
        } else if (rawTexts && rawTexts.length > 0) {
          for (const rawText of rawTexts) {
            const encoder = new TextEncoder();
            const init = new Uint8Array([0x1B, 0x40]); // ESC @
            const text = encoder.encode(rawText);
            const cut = new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00]); // GS V 0
            
            const finalData = new Uint8Array(init.length + text.length + cut.length);
            finalData.set(init, 0);
            finalData.set(text, init.length);
            finalData.set(cut, init.length + text.length);

            await get().sendRawData(finalData);
            
            // Small delay between cuts to allow printer to process
            await new Promise(res => setTimeout(res, 500));
          }
          onComplete();
          return; // Skip iframe printing completely
        }
      } catch (err) {
        console.error("Direct printing failed, falling back to window.print", err);
      }
    }

    // Fallback: Print using native browser print pipeline
    const printJob = (html: string): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }

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
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #000;
                  }
                  table { width: 100%; border-collapse: collapse; font-family: inherit; font-size: inherit; }
                  th, td { padding: 4px 0; vertical-align: top; font-family: inherit; font-size: inherit; }
                  th { border-bottom: 1px dashed #000; padding-bottom: 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
                  .center { text-align: center; }
                  .right { text-align: right; }
                  .left { text-align: left; }
                  .bold { font-weight: bold; }
                  .line { border-top: 1px dashed #000; margin: 8px 0; }
                </style>
              </head>
              <body>
                ${html}
                <script>
                  window.onload = function() {
                    window.print();
                    setTimeout(function() {
                      window.parent.postMessage('print_complete_' + window.name, '*');
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          doc.close();

          const messageId = 'print_complete_' + window.name;
          const handleMessage = (e: MessageEvent) => {
            if (e.data === messageId) {
              window.removeEventListener('message', handleMessage);
              setTimeout(() => {
                document.body.removeChild(iframe);
                resolve();
              }, 100);
            }
          };
          window.addEventListener('message', handleMessage);
        } else {
          resolve();
        }
      });
    };

    if (htmlContents && Array.isArray(htmlContents)) {
      for (const html of htmlContents) {
        await printJob(html);
      }
    } else if (htmlContent) {
      await printJob(htmlContent);
    }

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
      <div style="text-align: center; margin-bottom: 5px;">
        <img src="/image.png" style="width: 100px; height: auto; filter: grayscale(100%); mix-blend-mode: multiply;" alt="Logo" />
      </div>
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

