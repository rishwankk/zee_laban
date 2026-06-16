export async function getEscPosImage(imageUrl: string, maxWidth = 240): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      // Width must be multiple of 8 for byte alignment
      width = Math.ceil(width / 8) * 8;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(new Uint8Array(0)); // return empty if canvas fails
        return;
      }

      // Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      
      // Center the image if it was resized
      const xOffset = Math.floor((width - img.width * (height / img.height)) / 2);
      ctx.drawImage(img, xOffset > 0 ? xOffset : 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      // ESC/POS GS v 0 0
      const widthBytes = width / 8;
      const dataLen = widthBytes * height;
      
      const buffer = new Uint8Array(8 + dataLen);
      buffer[0] = 0x1D; // GS
      buffer[1] = 0x76; // v
      buffer[2] = 0x30; // 0
      buffer[3] = 0x00; // m = 0 (Normal mode)
      buffer[4] = widthBytes % 256;      // xL
      buffer[5] = Math.floor(widthBytes / 256); // xH
      buffer[6] = height % 256;          // yL
      buffer[7] = Math.floor(height / 256);     // yH

      let offset = 8;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < widthBytes; x++) {
          let b = 0;
          for (let bit = 0; bit < 8; bit++) {
            const pxIndex = (y * width + (x * 8 + bit)) * 4;
            const r = pixels[pxIndex];
            const g = pixels[pxIndex + 1];
            const bl = pixels[pxIndex + 2];
            const a = pixels[pxIndex + 3];
            
            // If pixel is visible
            if (a > 128) {
              // Convert to grayscale
              const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
              // Threshold at 128 (dark pixels become black dots)
              if (gray < 128) {
                b |= (1 << (7 - bit));
              }
            }
          }
          buffer[offset++] = b;
        }
      }

      // Add center alignment command before and left alignment after
      const alignCenter = new Uint8Array([0x1B, 0x61, 0x01]);
      const alignLeft = new Uint8Array([0x1B, 0x61, 0x00]);
      const newline = new Uint8Array([0x0A, 0x0A]);
      
      const finalBuffer = new Uint8Array(alignCenter.length + buffer.length + alignLeft.length + newline.length);
      finalBuffer.set(alignCenter, 0);
      finalBuffer.set(buffer, alignCenter.length);
      finalBuffer.set(alignLeft, alignCenter.length + buffer.length);
      finalBuffer.set(newline, alignCenter.length + buffer.length + alignLeft.length);
      
      resolve(finalBuffer);
    };
    img.onerror = () => {
      resolve(new Uint8Array(0)); // Fail gracefully without breaking print
    };
    img.src = imageUrl;
  });
}
