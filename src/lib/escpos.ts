export class EscPosBuilder {
  private buffer: number[] = [];

  init() {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
    return this;
  }

  textLine(str: string) {
    this.text(str);
    this.newline();
    return this;
  }

  newline() {
    this.buffer.push(0x0a);
    return this;
  }

  feed(lines: number = 1) {
    this.buffer.push(0x1b, 0x64, lines);
    return this;
  }

  align(align: "left" | "center" | "right") {
    const map = { left: 0x00, center: 0x01, right: 0x02 };
    this.buffer.push(0x1b, 0x61, map[align]);
    return this;
  }

  bold(on: boolean) {
    this.buffer.push(0x1b, 0x45, on ? 1 : 0);
    return this;
  }

  size(width: number, height: number) {
    const n = ((width - 1) << 4) | (height - 1);
    this.buffer.push(0x1d, 0x21, n);
    return this;
  }

  doubleWidth(on: boolean) {
    this.buffer.push(0x1b, 0x57, on ? 1 : 0);
    return this;
  }

  underline(on: boolean) {
    this.buffer.push(0x1b, 0x2d, on ? 1 : 0);
    return this;
  }

  cut() {
    this.buffer.push(0x1d, 0x56, 0x00);
    return this;
  }

  partialCut() {
    this.buffer.push(0x1d, 0x56, 0x01);
    return this;
  }

  openDrawer() {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  separator(char: string = "-", length: number = 32) {
    this.textLine(char.repeat(length));
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  buildKitchenReceipt(opts: {
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
  }) {
    this.init();
    this.align("center");
    this.size(2, 2);
    this.bold(true);
    this.textLine(opts.restaurantName);
    this.size(1, 1);
    this.bold(false);
    if (opts.restaurantAddress) this.textLine(opts.restaurantAddress);
    if (opts.restaurantPhone) this.textLine(opts.restaurantPhone);
    this.separator();
    this.bold(true);
    this.size(2, 1);
    this.textLine(`ORDER #${opts.orderNumber}`);
    this.size(1, 1);
    this.bold(false);
    this.textLine(opts.time);
    this.separator();
    this.textLine(`Customer: ${opts.customerName}`);
    this.textLine(`Phone: ${opts.customerPhone}`);
    this.separator();
    this.align("left");
    for (const item of opts.items) {
      this.bold(true);
      this.textLine(`${item.quantity}x ${item.name}`);
      this.bold(false);
      if (item.modifiers.length > 0) {
        for (const m of item.modifiers) {
          this.textLine(`  + ${m.name}`);
        }
      }
      this.newline();
    }
    this.separator();
    this.align("right");
    this.bold(true);
    this.size(2, 1);
    this.textLine(`TOTAL: $${opts.total.toFixed(2)}`);
    this.size(1, 1);
    this.bold(false);
    if (opts.notes) {
      this.newline();
      this.align("left");
      this.textLine(`Notes: ${opts.notes}`);
    }
    this.feed(3);
    this.partialCut();
    return this.build();
  }
}

export async function printToNetworkPrinter(
  data: Uint8Array,
  ip: string,
  port: number = 9100,
  timeout: number = 5000
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
          // Wait for printer to process data before closing
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
