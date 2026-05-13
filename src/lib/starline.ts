const PRINTER_WIDTH_PX = 576;
const PRINTER_WIDTH_MM = 72;
const DPI = 203;

interface ReceiptOpts {
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number; modifiers: { name: string }[] }[];
  notes?: string;
  total: number;
  time: string;
  config?: ReceiptConfig;
}

interface ReceiptConfig {
  fontSizeRestaurantName?: number;
  fontSizeRestaurantInfo?: number;
  fontSizeOrderNumber?: number;
  fontSizeTime?: number;
  fontSizeCustomerLabel?: number;
  fontSizeItems?: number;
  fontSizeModifiers?: number;
  fontSizeTotal?: number;
  fontSizeNotes?: number;
  lineHeight?: number;
  charsPerLine?: number;
  spacingTop?: number;
  spacingBeforeOrder?: number;
  spacingBeforeCustomer?: number;
  spacingBetweenItems?: number;
  spacingBeforeTotal?: number;
  spacingBottom?: number;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pick<T>(val: T | undefined, def: T): T {
  return val !== undefined ? val : def;
}

function buildReceiptSvg(opts: ReceiptOpts): string {
  const cfg = opts.config || {};
  const lines: string[] = [];
  const px = (mm: number) => Math.round((mm / 25.4) * DPI);
  const half = Math.round(px(PRINTER_WIDTH_MM / 2));
  const lh = pick(cfg.lineHeight, 1.4);
  const cpl = pick(cfg.charsPerLine, 42);

  let y = 0;

  function txt(text: string, size: number, bold: boolean, center: boolean) {
    const x = center ? half : 8;
    const anchor = center ? "middle" : "start";
    const fw = bold ? "bold" : "normal";
    lines.push(`<text x="${x}" y="${y}" font-family="Courier,monospace" font-size="${size}" font-weight="${fw}" text-anchor="${anchor}" fill="black">${escapeXml(text)}</text>`);
    y += Math.round(size * lh);
  }

  function hr() {
    y += Math.round(px(0.5));
    txt("\u2500".repeat(cpl), pick(cfg.fontSizeRestaurantInfo, 11), false, false);
    y += Math.round(px(0.5));
  }

  function empty(mm: number) {
    y += px(mm);
  }

  y = px(pick(cfg.spacingTop, 1.5));
  txt(opts.restaurantName, pick(cfg.fontSizeRestaurantName, 22), true, true);
  if (opts.restaurantAddress) txt(opts.restaurantAddress, pick(cfg.fontSizeRestaurantInfo, 11), false, true);
  if (opts.restaurantPhone) txt(opts.restaurantPhone, pick(cfg.fontSizeRestaurantInfo, 11), false, true);

  empty(pick(cfg.spacingBeforeOrder, 0.5));
  hr();
  txt(`ORDER #${opts.orderNumber}`, pick(cfg.fontSizeOrderNumber, 16), true, true);
  txt(opts.time, pick(cfg.fontSizeTime, 10), false, true);

  empty(pick(cfg.spacingBeforeCustomer, 0.3));
  hr();
  txt(`Customer: ${opts.customerName}`, pick(cfg.fontSizeCustomerLabel, 11), false, false);
  txt(`Phone: ${opts.customerPhone}`, pick(cfg.fontSizeCustomerLabel, 11), false, false);

  empty(pick(cfg.spacingBeforeTotal, 0.3));
  hr();

  for (const item of opts.items) {
    txt(`${item.quantity}x ${item.name}`, pick(cfg.fontSizeItems, 12), true, false);
    for (const m of item.modifiers) {
      txt(`  + ${m.name}`, pick(cfg.fontSizeModifiers, 10), false, false);
    }
    empty(pick(cfg.spacingBetweenItems, 0.3));
  }

  empty(pick(cfg.spacingBeforeTotal, 0.3));
  hr();
  txt(`TOTAL: $${opts.total.toFixed(2)}`, pick(cfg.fontSizeTotal, 16), true, true);

  if (opts.notes) {
    empty(1);
    txt(`Notes: ${opts.notes}`, pick(cfg.fontSizeNotes, 11), false, false);
  }

  empty(pick(cfg.spacingBottom, 5));

  const svgHeight = y + px(5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINTER_WIDTH_PX}" height="${svgHeight}">
    <rect width="100%" height="100%" fill="white"/>
    ${lines.join("\n    ")}
  </svg>`;
}

async function svgToRasterData(svg: string): Promise<Uint8Array> {
  const sharpMod = await import("sharp");
  const sharp = sharpMod.default;

  const buf = Buffer.from(svg);
  const img = sharp(buf).png();

  const metadata = await img.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const raw = await img.raw().toBuffer();

  const bytesPerRow = Math.ceil(width / 8);
  const raster = new Uint8Array(height * bytesPerRow);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const r = raw[srcIdx];
      const g = raw[srcIdx + 1];
      const b = raw[srcIdx + 2];
      const isBlack = r < 200 || g < 200 || b < 200;
      if (isBlack) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        raster[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return raster;
}

export type { ReceiptConfig, ReceiptOpts };

export class StarLineBuilder {
  async buildKitchenReceipt(opts: ReceiptOpts): Promise<Uint8Array> {
    const svg = buildReceiptSvg(opts);
    const rasterData = await svgToRasterData(svg);

    const sharpMod = await import("sharp");
    const sharp = sharpMod.default;
    const svgBuf = Buffer.from(svg);
    const meta = await sharp(svgBuf).metadata();
    const height = meta.height!;
    const bytesPerRow = Math.ceil(PRINTER_WIDTH_PX / 8);

    const cmd: number[] = [];

    cmd.push(0x1b, 0x2a, 0x72, 0x41);

    cmd.push(0x1b, 0x2a, 0x72, 0x50);
    cmd.push(0x30);
    cmd.push(0x00);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * bytesPerRow;
      const row = rasterData.slice(rowOffset, rowOffset + bytesPerRow);
      const n = row.length;
      cmd.push(0x62);
      cmd.push(n & 0xff);
      cmd.push((n >> 8) & 0xff);
      for (const byte of row) {
        cmd.push(byte);
      }
    }

    cmd.push(0x1b, 0x2a, 0x72, 0x42);

    return new Uint8Array(cmd);
  }
}

export async function printToNetworkPrinter(
  data: Uint8Array,
  ip: string,
  port: number = 9100,
  timeout: number = 10000
): Promise<{ success: boolean; error?: string }> {
  const net = await import("net");
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ success: false, error: "Connection timed out" });
    }, timeout);

    socket.connect(port, ip, () => {
      clearTimeout(timer);
      socket.write(data, (err) => {
        if (err) {
          socket.destroy();
          resolve({ success: false, error: err.message });
        } else {
          setTimeout(() => {
            socket.end();
            resolve({ success: true });
          }, 500);
        }
      });
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: false, error: err.message });
    });
  });
}
