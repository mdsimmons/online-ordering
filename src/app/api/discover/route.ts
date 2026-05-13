import { NextRequest, NextResponse } from "next/server";

async function checkPort(ip: string, port: number, timeout: number): Promise<boolean> {
  const net = await import("net");
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);

    socket.on("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });

    socket.connect(port, ip);
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const subnet = body.subnet || "";
  const port = body.port || 9100;
  const results: { ip: string; port: number }[] = [];

  if (!subnet) {
    const commonIPs = [
      "192.168.1.100", "192.168.1.101", "192.168.1.102",
      "192.168.1.110", "192.168.1.120", "192.168.1.150",
      "192.168.0.100", "192.168.0.101", "192.168.0.102",
      "192.168.0.110", "192.168.0.192",
      "192.168.1.192", "10.0.0.100", "10.0.0.101",
    ];
    const checks = commonIPs.map(async (ip) => {
      if (await checkPort(ip, port, 1000)) results.push({ ip, port });
    });
    await Promise.allSettled(checks);
    return NextResponse.json({ printers: results });
  }

  const parts = subnet.split(".");
  if (parts.length !== 4 || isNaN(Number(parts[3]))) {
    return NextResponse.json({ error: 'Enter a full subnet like 192.168.1.0', statusText: "Bad Request" }, { status: 400 });
  }

  const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const promises = [];
  for (let i = 1; i <= 254; i++) {
    const ip = `${base}.${i}`;
    promises.push(
      checkPort(ip, port, 500).then((open) => {
        if (open) results.push({ ip, port });
      })
    );
  }
  await Promise.allSettled(promises);
  return NextResponse.json({ printers: results });
}
