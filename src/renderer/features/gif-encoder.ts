/**
 * Ultra-Fast High-Performance Animated GIF Encoder in Pure TypeScript
 * Features:
 * 1. 15-bit (32x32x32) Direct Color Lookup Cache for instant O(1) pixel quantization
 * 2. High-speed color sampling & palette generation
 * 3. Fast Floyd-Steinberg error diffusion
 * 4. Zero-allocation typed array LZW compressor
 * 5. Pre-allocated chunk buffer management
 */

export interface GifFrameOptions {
  delayMs?: number; // Delay in milliseconds (e.g. 100ms for 10fps)
  dither?: boolean; // Enable Floyd-Steinberg dithering for smooth gradients
  quality?: number; // 1 (best quality) to 30 (fast)
}

export class GifEncoder {
  private width: number;
  private height: number;
  private loopCount: number; // 0 = infinite loop
  private buffer: Uint8Array;
  private capacity: number;
  private length = 0;

  constructor(width: number, height: number, loopCount = 0) {
    this.width = Math.round(width);
    this.height = Math.round(height);
    this.loopCount = loopCount;

    // Allocate initial buffer (1MB, grows dynamically)
    this.capacity = 1024 * 1024;
    this.buffer = new Uint8Array(this.capacity);

    this.writeHeader();
  }

  private ensureCapacity(additionalBytes: number) {
    if (this.length + additionalBytes > this.capacity) {
      let newCapacity = Math.max(this.capacity * 2, this.length + additionalBytes + 1024 * 512);
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this.buffer.subarray(0, this.length));
      this.buffer = newBuffer;
      this.capacity = newCapacity;
    }
  }

  private writeByte(b: number) {
    if (this.length >= this.capacity) this.ensureCapacity(1);
    this.buffer[this.length++] = b;
  }

  private writeBytes(bytes: Uint8Array | number[]) {
    this.ensureCapacity(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer[this.length++] = bytes[i];
    }
  }

  private writeShort(val: number) {
    this.ensureCapacity(2);
    this.buffer[this.length++] = val & 0xff;
    this.buffer[this.length++] = (val >> 8) & 0xff;
  }

  private writeString(str: string) {
    this.ensureCapacity(str.length);
    for (let i = 0; i < str.length; i++) {
      this.buffer[this.length++] = str.charCodeAt(i);
    }
  }

  private writeHeader() {
    // GIF89a Header
    this.writeString("GIF89a");

    // Logical Screen Descriptor
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.writeByte(0x70); // GCT Flag = 0, Color Res = 7 (8 bits), Sort = 0, GCT Size = 0
    this.writeByte(0x00); // Background Color Index
    this.writeByte(0x00); // Pixel Aspect Ratio

    // Netscape 2.0 Application Extension (for looping animation)
    if (this.loopCount >= 0) {
      this.writeByte(0x21); // Extension Introducer
      this.writeByte(0xff); // Application Extension Label
      this.writeByte(0x0b); // Block Size: 11 bytes
      this.writeString("NETSCAPE2.0");
      this.writeByte(0x03); // Sub-block Length: 3 bytes
      this.writeByte(0x01); // Sub-block ID
      this.writeShort(this.loopCount);
      this.writeByte(0x00); // Block Terminator
    }
  }

  public addFrame(
    rgbaData: Uint8ClampedArray | Uint8Array,
    options: GifFrameOptions = {}
  ) {
    const delayMs = options.delayMs ?? 100;
    const dither = options.dither ?? true;
    const delayHundredths = Math.max(1, Math.round(delayMs / 10));

    // 1. Ultra-fast color quantization and palette building
    const quantizer = new FastQuantizer(rgbaData, this.width, this.height, options.quality ?? 10);
    const colorMap = quantizer.getPalette(); // 256 * 3 bytes (RGB)

    // 2. Map RGBA pixels to palette indices
    const numPixels = this.width * this.height;
    const indexedPixels = new Uint8Array(numPixels);

    if (dither) {
      this.applyFastDithering(rgbaData, indexedPixels, quantizer, colorMap);
    } else {
      for (let i = 0; i < numPixels; i++) {
        const p = i * 4;
        indexedPixels[i] = quantizer.lookup(rgbaData[p], rgbaData[p + 1], rgbaData[p + 2]);
      }
    }

    // 3. Graphic Control Extension
    this.writeByte(0x21); // Extension Introducer
    this.writeByte(0xf9); // Graphic Control Label
    this.writeByte(0x04); // Block Size (4 bytes)
    this.writeByte(0x04); // Disposal method 1 (Do not dispose)
    this.writeShort(delayHundredths); // Delay Time (1/100s)
    this.writeByte(0x00); // Transparent Color Index
    this.writeByte(0x00); // Block Terminator

    // 4. Image Descriptor
    this.writeByte(0x2c); // Image Separator ','
    this.writeShort(0); // Left Position
    this.writeShort(0); // Top Position
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.writeByte(0x87); // Local Color Table Flag = 1, 256 colors

    // 5. Local Color Table (256 RGB entries = 768 bytes)
    this.writeBytes(colorMap);

    // 6. Fast LZW Compression
    const lzwMinCodeSize = 8;
    this.writeByte(lzwMinCodeSize);
    this.writeLzwData(lzwMinCodeSize, indexedPixels);
    this.writeByte(0x00); // Block Terminator
  }

  private applyFastDithering(
    rgbaData: Uint8ClampedArray | Uint8Array,
    indexedPixels: Uint8Array,
    quantizer: FastQuantizer,
    colorMap: Uint8Array
  ) {
    const w = this.width;
    const h = this.height;
    const rErrors = new Float32Array(w * 2);
    const gErrors = new Float32Array(w * 2);
    const bErrors = new Float32Array(w * 2);

    for (let y = 0; y < h; y++) {
      const curRow = (y % 2) * w;
      const nextRow = ((y + 1) % 2) * w;

      rErrors.fill(0, nextRow, nextRow + w);
      gErrors.fill(0, nextRow, nextRow + w);
      bErrors.fill(0, nextRow, nextRow + w);

      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const p = idx * 4;

        let r = rgbaData[p] + rErrors[curRow + x];
        let g = rgbaData[p + 1] + gErrors[curRow + x];
        let b = rgbaData[p + 2] + bErrors[curRow + x];

        r = r < 0 ? 0 : r > 255 ? 255 : r | 0;
        g = g < 0 ? 0 : g > 255 ? 255 : g | 0;
        b = b < 0 ? 0 : b > 255 ? 255 : b | 0;

        const colorIdx = quantizer.lookup(r, g, b);
        indexedPixels[idx] = colorIdx;

        const cPos = colorIdx * 3;
        const errR = r - colorMap[cPos];
        const errG = g - colorMap[cPos + 1];
        const errB = b - colorMap[cPos + 2];

        if (x + 1 < w) {
          rErrors[curRow + x + 1] += (errR * 7) / 16;
          gErrors[curRow + x + 1] += (errG * 7) / 16;
          bErrors[curRow + x + 1] += (errB * 7) / 16;
        }
        if (y + 1 < h) {
          if (x > 0) {
            rErrors[nextRow + x - 1] += (errR * 3) / 16;
            gErrors[nextRow + x - 1] += (errG * 3) / 16;
            bErrors[nextRow + x - 1] += (errB * 3) / 16;
          }
          rErrors[nextRow + x] += (errR * 5) / 16;
          gErrors[nextRow + x] += (errG * 5) / 16;
          bErrors[nextRow + x] += (errB * 5) / 16;
          if (x + 1 < w) {
            rErrors[nextRow + x + 1] += (errR * 1) / 16;
            gErrors[nextRow + x + 1] += (errG * 1) / 16;
            bErrors[nextRow + x + 1] += (errB * 1) / 16;
          }
        }
      }
    }
  }

  private writeLzwData(minCodeSize: number, indexedPixels: Uint8Array) {
    const clearCode = 1 << minCodeSize; // 256
    const eofCode = clearCode + 1; // 257

    let curCodeSize = minCodeSize + 1; // 9
    let maxCode = (1 << curCodeSize) - 1; // 511
    let nextCode = eofCode + 1; // 258

    // Fast integer hash table (size 5003 prime for 12-bit LZW)
    const HASH_SIZE = 5003;
    const htab = new Int32Array(HASH_SIZE);
    const codetab = new Int16Array(HASH_SIZE);
    htab.fill(-1);

    const packet = new Uint8Array(256);
    let packetLen = 0;
    let curAccum = 0;
    let curBits = 0;

    const writeBits = (code: number, nBits: number) => {
      curAccum |= code << curBits;
      curBits += nBits;

      while (curBits >= 8) {
        packet[packetLen++] = curAccum & 0xff;
        curAccum >>= 8;
        curBits -= 8;

        if (packetLen === 254) {
          this.writeByte(packetLen);
          this.writeBytes(packet.subarray(0, packetLen));
          packetLen = 0;
        }
      }
    };

    const flushPacket = () => {
      if (curBits > 0) {
        packet[packetLen++] = curAccum & 0xff;
        curAccum = 0;
        curBits = 0;
      }
      if (packetLen > 0) {
        this.writeByte(packetLen);
        this.writeBytes(packet.subarray(0, packetLen));
        packetLen = 0;
      }
    };

    // Initial Clear Code
    writeBits(clearCode, curCodeSize);

    if (indexedPixels.length === 0) {
      writeBits(eofCode, curCodeSize);
      flushPacket();
      return;
    }

    let prefix = indexedPixels[0];

    for (let i = 1; i < indexedPixels.length; i++) {
      const k = indexedPixels[i];
      const fcode = (k << 12) + prefix;
      let h = (k << 4) ^ prefix;
      if (h >= HASH_SIZE) h -= HASH_SIZE;

      let disp = 0;
      let found = false;

      if (htab[h] === fcode) {
        prefix = codetab[h];
        continue;
      } else if (htab[h] >= 0) {
        disp = HASH_SIZE - h;
        if (h === 0) disp = 1;
        do {
          h -= disp;
          if (h < 0) h += HASH_SIZE;
          if (htab[h] === fcode) {
            prefix = codetab[h];
            found = true;
            break;
          }
        } while (htab[h] >= 0);
      }

      if (found) continue;

      writeBits(prefix, curCodeSize);

      if (nextCode < 4096) {
        codetab[h] = nextCode++;
        htab[h] = fcode;

        if (nextCode > maxCode && curCodeSize < 12) {
          curCodeSize++;
          maxCode = (1 << curCodeSize) - 1;
        }
      } else {
        writeBits(clearCode, curCodeSize);
        htab.fill(-1);
        curCodeSize = minCodeSize + 1;
        maxCode = (1 << curCodeSize) - 1;
        nextCode = eofCode + 1;
      }

      prefix = k;
    }

    writeBits(prefix, curCodeSize);
    writeBits(eofCode, curCodeSize);
    flushPacket();
  }

  public finish(): Blob {
    this.writeByte(0x3b); // Trailer ';'
    return new Blob([this.buffer.subarray(0, this.length) as BlobPart], { type: "image/gif" });
  }
}

/**
 * Fast Color Quantizer with 15-bit (32x32x32) Direct Lookup Cache
 */
class FastQuantizer {
  private palette: Uint8Array = new Uint8Array(256 * 3);
  // 15-bit Direct Color Lookup Cache: 32,768 entries
  private colorCache: Int16Array = new Int16Array(32768);

  constructor(
    rgbaData: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    quality: number
  ) {
    this.colorCache.fill(-1);
    this.buildPalette(rgbaData, width, height, quality);
  }

  public getPalette(): Uint8Array {
    return this.palette;
  }

  private buildPalette(
    rgbaData: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    quality: number
  ) {
    const totalPixels = width * height;
    // Sample pixels based on quality (1 = dense, 10 = standard fast, 20 = ultra fast)
    const step = Math.max(1, Math.min(32, Math.floor(quality * (totalPixels / 20000) + 1)));

    // Histogram of 15-bit colors
    const colorCounts = new Map<number, { r: number; g: number; b: number; count: number }>();

    for (let i = 0; i < totalPixels; i += step) {
      const p = i * 4;
      const r = rgbaData[p];
      const g = rgbaData[p + 1];
      const b = rgbaData[p + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

      const entry = colorCounts.get(key);
      if (entry) {
        entry.r += r;
        entry.g += g;
        entry.b += b;
        entry.count++;
      } else {
        colorCounts.set(key, { r, g, b, count: 1 });
      }
    }

    // Sort color clusters by frequency
    const sorted = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);

    const paletteEntries = Math.min(256, sorted.length);
    for (let i = 0; i < paletteEntries; i++) {
      const item = sorted[i];
      this.palette[i * 3] = Math.round(item.r / item.count);
      this.palette[i * 3 + 1] = Math.round(item.g / item.count);
      this.palette[i * 3 + 2] = Math.round(item.b / item.count);
    }

    // Fill remaining palette slots with spread colors if input had fewer than 256 colors
    for (let i = paletteEntries; i < 256; i++) {
      const v = Math.round((i * 255) / 255);
      this.palette[i * 3] = v;
      this.palette[i * 3 + 1] = v;
      this.palette[i * 3 + 2] = v;
    }
  }

  public lookup(r: number, g: number, b: number): number {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const cached = this.colorCache[key];
    if (cached >= 0) return cached;

    // Find closest color using Euclidean squared distance
    let bestDist = 10000000;
    let bestIdx = 0;

    for (let i = 0; i < 256; i++) {
      const pr = this.palette[i * 3];
      const pg = this.palette[i * 3 + 1];
      const pb = this.palette[i * 3 + 2];

      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const dist = dr * dr + dg * dg + db * db;

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
        if (dist === 0) break;
      }
    }

    this.colorCache[key] = bestIdx;
    return bestIdx;
  }
}
