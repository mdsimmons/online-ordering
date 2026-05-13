import { EscPosBuilder } from "./escpos";

export async function printViaBackend(
  order: any,
  printerIp: string,
  printerPort: string = "9100"
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      printerIp,
      printerPort,
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.phone,
      items: order.items.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        modifiers: i.modifiers.map((m: any) => ({ name: m.name })),
      })),
      notes: order.notes || undefined,
      total: order.total,
      time: new Date(order.createdAt).toLocaleString(),
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Print failed");
  return data;
}

export function buildTestPage(printerIp: string, printerPort: string = "9100") {
  return `
<html>
<body>
<h3>Printer Diagnostic: ${printerIp}:${printerPort}</h3>
<p>If you see this page, the server is running.</p>
<p>To test TCP printing, click the "Test Printer" button in Admin > Settings.</p>
<p>To test WebPRNT, your printer must support it. Try accessing:</p>
<p><a href="http://${printerIp}/StarWebPRNT/Status" target="_blank">http://${printerIp}/StarWebPRNT/Status</a></p>
</body>
</html>`;
}
