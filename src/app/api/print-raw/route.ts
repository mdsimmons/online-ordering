import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ip: string = body.ip || "";
  const port = parseInt(body.port || "9100", 10);

  if (!ip) {
    return NextResponse.json({ error: "Missing printer IP" }, { status: 400 });
  }

  const net = await import("net");

  try {
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Connection timed out"));
      }, 5000);

      socket.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      socket.connect(port, ip, () => {
        clearTimeout(timeout);

        const lines = [
          "",
          "",
          "  ================",
          "  PRINTER TEST",
          "  ================",
          "",
          `  Time: ${new Date().toLocaleString()}`,
          "",
          "  If you can read this,",
          "  your printer is working!",
          "",
          "",
          "",
          "",
        ];
        const text = lines.join("\n") + "\n";
        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        socket.write(data, (err) => {
          if (err) {
            socket.destroy();
            reject(err);
          } else {
            setTimeout(() => {
              socket.end();
              resolve();
            }, 500);
          }
        });
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 502 }
    );
  }
}
