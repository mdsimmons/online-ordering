import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ip = body.ip || "";
  const port = parseInt(body.port || "9100", 10);

  if (!ip) {
    return NextResponse.json({ error: "Missing printer IP" }, { status: 400 });
  }

  const net = await import("net");
  const start = Date.now();

  try {
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Connection timed out after 3000ms"));
      }, 3000);

      socket.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      socket.connect(port, ip, () => {
        clearTimeout(timeout);
        socket.end();
        resolve();
      });
    });

    const elapsed = Date.now() - start;
    return NextResponse.json({
      reachable: true,
      ip,
      port,
      ms: elapsed,
      message: `Connected to ${ip}:${port} in ${elapsed}ms`,
    });
  } catch (err: any) {
    return NextResponse.json({
      reachable: false,
      ip,
      port,
      error: err.message,
      message: `Could not connect to ${ip}:${port} — ${err.message}`,
    });
  }
}
