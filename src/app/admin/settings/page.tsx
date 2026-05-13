"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const fields = [
  { key: "restaurantName", label: "Restaurant Name", type: "text" },
  { key: "restaurantAddress", label: "Address", type: "text" },
  { key: "restaurantPhone", label: "Phone Number", type: "text" },
  { key: "pickupInstructions", label: "Pickup Instructions", type: "textarea" },
];

const receiptFieldGroups = [
  {
    label: "Font Sizes",
    fields: [
      { key: "fontSizeRestaurantName", label: "Restaurant Name", placeholder: "22" },
      { key: "fontSizeRestaurantInfo", label: "Address / Phone", placeholder: "11" },
      { key: "fontSizeOrderNumber", label: "Order Number", placeholder: "16" },
      { key: "fontSizeTime", label: "Time", placeholder: "10" },
      { key: "fontSizeCustomerLabel", label: "Customer Name / Phone", placeholder: "11" },
      { key: "fontSizeItems", label: "Items", placeholder: "12" },
      { key: "fontSizeModifiers", label: "Modifiers", placeholder: "10" },
      { key: "fontSizeTotal", label: "Total", placeholder: "16" },
      { key: "fontSizeNotes", label: "Notes", placeholder: "11" },
    ],
  },
  {
    label: "Spacing (mm)",
    fields: [
      { key: "spacingTop", label: "Top Margin", placeholder: "1.5" },
      { key: "spacingBeforeOrder", label: "Before Order #", placeholder: "0.5" },
      { key: "spacingBeforeCustomer", label: "Before Customer Info", placeholder: "0.3" },
      { key: "spacingBetweenItems", label: "Between Items", placeholder: "0.3" },
      { key: "spacingBeforeTotal", label: "Before Total", placeholder: "0.3" },
      { key: "spacingBottom", label: "Bottom Margin", placeholder: "5" },
    ],
  },
  {
    label: "Other",
    fields: [
      { key: "lineHeight", label: "Line Height Multiplier", placeholder: "1.4" },
      { key: "charsPerLine", label: "Characters Per Line", placeholder: "42" },
    ],
  },
];

function numberedKey(prefix: string, key: string, num: number): string {
  return num === 1 ? `${prefix}${key}` : `${prefix}${num}_${key}`;
}

function PrinterSection({
  num,
  settings,
  setSettings,
  testing,
  setTesting,
  testResult,
  setTestResult,
}: {
  num: 1 | 2;
  settings: Record<string, string>;
  setSettings: (up: Record<string, string>) => void;
  testing: boolean;
  setTesting: (v: boolean) => void;
  testResult: { success: boolean; message: string } | null;
  setTestResult: (v: { success: boolean; message: string } | null) => void;
}) {
  const ipKey = numberedKey("printer", "IP", num);
  const portKey = numberedKey("printer", "Port", num);
  const enabledKey = numberedKey("printer", "Enabled", num);
  const driverKey = numberedKey("printer", "Driver", num);
  const prefix = num === 1 ? "receipt_" : "receipt2_";

  const label = `Printer ${num}`;

  const testThisPrinter = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targets: [{ ip: settings[ipKey], port: settings[portKey], driver: settings[driverKey] || "starline", configPrefix: prefix }],
          orderId: "TEST",
          customerName: "Test Print",
          customerPhone: "555-0000",
          items: [{ name: "Test Item", quantity: 1, modifiers: [] }],
          notes: `Printer ${num} test`,
          total: 0,
          time: new Date().toLocaleString(),
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.success
          ? "Print job sent successfully!"
          : `Print failed: ${data.error || "Unknown error"}`,
      });
    } catch (err: any) {
      setTestResult({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-4 max-w-lg mb-6">
      {num === 2 && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings[enabledKey] === "true"}
            onChange={(e) => setSettings({ ...settings, [enabledKey]: e.target.checked ? "true" : "false" })}
            className="accent-amber-500"
          />
          <span className="text-sm text-zinc-300">Enable Printer 2</span>
        </label>
      )}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm text-zinc-400 mb-1">IP Address</label>
          <input
            type="text"
            value={settings[ipKey] || ""}
            onChange={(e) => setSettings({ ...settings, [ipKey]: e.target.value })}
            placeholder="e.g. 192.168.1.100"
            className="w-full p-2 rounded bg-zinc-700 text-sm"
          />
        </div>
        <div className="w-24">
          <label className="block text-sm text-zinc-400 mb-1">Port</label>
          <input
            type="text"
            value={settings[portKey] || ""}
            onChange={(e) => setSettings({ ...settings, [portKey]: e.target.value })}
            placeholder="9100"
            className="w-full p-2 rounded bg-zinc-700 text-sm"
          />
        </div>
        <div className="w-28">
          <label className="block text-sm text-zinc-400 mb-1">Driver</label>
          <select
            value={settings[driverKey] || "starline"}
            onChange={(e) => setSettings({ ...settings, [driverKey]: e.target.value })}
            className="w-full p-2 rounded bg-zinc-700 text-sm"
          >
            <option value="starline">Star Line</option>
            <option value="escpos">ESC/POS</option>
          </select>
        </div>
      </div>
      <button
        onClick={testThisPrinter}
        disabled={testing || !settings[ipKey] || (num === 2 && settings[enabledKey] !== "true")}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {testing ? "Printing..." : `Test ${label}`}
      </button>
      {testResult && (
        <div
          className={`p-3 rounded-lg text-sm ${
            testResult.success ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}
        >
          {testResult.message}
        </div>
      )}

      <details className="text-xs text-zinc-400 mt-2">
        <summary className="cursor-pointer font-medium text-zinc-300 mb-2">{label} Receipt Layout</summary>
        <p className="mb-3 text-zinc-500">Leave blank to use defaults.</p>
        {receiptFieldGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="text-zinc-400 font-medium mb-2 text-xs">{group.label}</p>
            <div className="space-y-2">
              {group.fields.map((f) => {
                const fullKey = `${prefix}${f.key}`;
                return (
                  <div key={fullKey} className="flex items-center gap-3">
                    <label className="text-zinc-400 w-44 shrink-0">{f.label}</label>
                    <input
                      type="number"
                      step="any"
                      value={settings[fullKey] || ""}
                      onChange={(e) => setSettings({ ...settings, [fullKey]: e.target.value })}
                      placeholder={f.placeholder}
                      className="flex-1 p-1.5 rounded bg-zinc-700 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </details>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        data.forEach((s: any) => (map[s.key] = s.value));
        setSettings(map);
      });
  }, []);

  const [testing1, setTesting1] = useState(false);
  const [testResult1, setTestResult1] = useState<{ success: boolean; message: string } | null>(null);
  const [testing2, setTesting2] = useState(false);
  const [testResult2, setTestResult2] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = async () => {
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) toast.success("Settings saved");
      else {
        const err = await res.text();
        toast.error("Failed to save: " + err);
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--brand-primary)" }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.filter = "brightness(0.9)"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.filter = ""; }}
        >
          Save Settings
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-2 text-zinc-300">Restaurant Info</h2>
      <div className="bg-zinc-800 rounded-xl p-4 space-y-4 max-w-lg mb-6">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm text-zinc-400 mb-1">{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                value={settings[field.key] || ""}
                onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm resize-none"
                rows={2}
              />
            ) : (
              <input
                type={field.type}
                value={settings[field.key] || ""}
                onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-2 text-zinc-300">Access</h2>
      <div className="bg-zinc-800 rounded-xl p-4 space-y-4 max-w-lg mb-6">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Kitchen Password</label>
          <input
            type="text"
            value={settings.kitchenPassword || ""}
            onChange={(e) => setSettings({ ...settings, kitchenPassword: e.target.value })}
            className="w-full p-2 rounded bg-zinc-700 text-sm font-mono"
            placeholder="Leave blank for no password"
          />
          <p className="text-xs text-zinc-500 mt-1">Staff use this to access the kitchen display.</p>
        </div>
        <div className="border-t border-zinc-700 pt-4">
          <label className="block text-sm text-zinc-400 mb-1">Admin Username</label>
          <input
            type="text"
            value={settings.adminUsername || ""}
            onChange={(e) => setSettings({ ...settings, adminUsername: e.target.value })}
            className="w-full p-2 rounded bg-zinc-700 text-sm font-mono"
            placeholder="admin"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Admin Password</label>
          <input
            type="text"
            value={settings.adminPassword || ""}
            onChange={(e) => setSettings({ ...settings, adminPassword: e.target.value })}
            className="w-full p-2 rounded bg-zinc-700 text-sm font-mono"
            placeholder="Leave blank for no password"
          />
          <p className="text-xs text-zinc-500 mt-1">Both username and password must be set.</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2 text-zinc-300">Branding</h2>
      <div className="bg-zinc-800 rounded-xl p-4 space-y-5 max-w-lg mb-6">
        <ColorField label="Primary Color" settingKey="brandPrimary" settings={settings} setSettings={setSettings} defaultVal="#f59e0b" />
        <ColorField label="Secondary / Accent" settingKey="brandAccent" settings={settings} setSettings={setSettings} defaultVal="#16a34a" />
        <ColorField label="Header Background" settingKey="brandHeaderBg" settings={settings} setSettings={setSettings} defaultVal="#ffffff" />
        <ColorField label="Page Background" settingKey="brandPageBg" settings={settings} setSettings={setSettings} defaultVal="#fafafa" />
        <ColorField label="Link Color" settingKey="brandLink" settings={settings} setSettings={setSettings} defaultVal="#f59e0b" />
        <ColorField label="Button Text Color" settingKey="brandBtnText" settings={settings} setSettings={setSettings} defaultVal="#ffffff" />
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Logo</label>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="text"
              value={settings.brandLogo || ""}
              onChange={(e) => setSettings({ ...settings, brandLogo: e.target.value })}
              className="flex-1 p-2 rounded bg-zinc-700 text-sm"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <label className="block text-xs text-zinc-500 mb-2">Or upload a file:</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 500 * 1024) { toast.error("Logo must be under 500KB"); return; }
              const reader = new FileReader();
              reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                setSettings({ ...settings, brandLogo: dataUrl });
              };
              reader.readAsDataURL(file);
            }}
            className="w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600 cursor-pointer"
          />
        </div>
        {settings.brandLogo && (
          <div className="flex items-center gap-3 bg-zinc-700 rounded-lg p-3">
            <img
              src={settings.brandLogo}
              alt="Logo preview"
              className="h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-xs text-zinc-400">Logo preview</span>
            <button
              onClick={() => setSettings({ ...settings, brandLogo: "" })}
              className="ml-auto text-xs text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold mb-2 text-zinc-300">Kitchen Notifications</h2>
      <div className="bg-zinc-800 rounded-xl p-4 space-y-4 max-w-lg mb-6">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Notification Sound</label>
          <select
            value={settings.notificationSound || "beep"}
            onChange={(e) => setSettings({ ...settings, notificationSound: e.target.value })}
            className="w-full p-2 rounded bg-zinc-700 text-sm"
          >
            <option value="beep">Beep</option>
            <option value="chime">Chime</option>
            <option value="bell">Bell</option>
            <option value="alarm">Alarm</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoMoveToPreparing === "true"}
            onChange={(e) => setSettings({ ...settings, autoMoveToPreparing: e.target.checked ? "true" : "false" })}
            className="accent-amber-500"
          />
          <span className="text-sm text-zinc-300">Auto-advance to "Preparing" after accepting</span>
        </label>
      </div>

      <h2 className="text-lg font-semibold mb-2 text-zinc-300">Thermal Printers</h2>

      <details className="text-xs text-zinc-400 bg-zinc-800 rounded-xl p-4 mb-4 max-w-lg">
        <summary className="cursor-pointer font-medium text-zinc-300 mb-2">How to set up your Star printers</summary>
        <ol className="list-decimal ml-4 space-y-1.5 mt-2">
          <li>Connect each printer to WiFi (use Star's Setup Utility or the printer's web interface).</li>
          <li>Find each printer's IP (print a status page or check router DHCP list).</li>
          <li>Enter the IPs below and click Save Settings.</li>
          <li>Test each printer individually with its Test button.</li>
          <li>Enable Printer 2 if you have a second printer.</li>
        </ol>
        <p className="mt-2 text-zinc-500">All printers must be on the same WiFi network as this server.</p>
      </details>

      <h3 className="text-base font-semibold mb-2 text-zinc-300">Printer 1</h3>
      <PrinterSection
        num={1}
        settings={settings}
        setSettings={setSettings}
        testing={testing1}
        setTesting={setTesting1}
        testResult={testResult1}
        setTestResult={setTestResult1}
      />

      <h3 className="text-base font-semibold mb-2 text-zinc-300">Printer 2</h3>
      <PrinterSection
        num={2}
        settings={settings}
        setSettings={setSettings}
        testing={testing2}
        setTesting={setTesting2}
        testResult={testResult2}
        setTestResult={setTestResult2}
      />

      <h3 className="text-base font-semibold mb-2 text-zinc-300">Find Printer on Network</h3>
      <p className="text-xs text-zinc-500 mb-3 max-w-lg">
        Scan your local network for devices with port 9100 open.
      </p>
      <div className="bg-zinc-800 rounded-xl p-4 space-y-3 max-w-lg mb-6">
        <DiscoverPrinters onSelect={(ip) => {
          if (!settings.printerIP) {
            setSettings({ ...settings, printerIP: ip });
          } else if (!settings.printer2IP) {
            setSettings({ ...settings, printer2IP: ip, printer2Enabled: "true" });
          } else {
            toast("Both printers have IPs. Select one to replace.");
          }
        }} />
      </div>
    </div>
  );
}

function ColorField({ label, settingKey, settings, setSettings, defaultVal }: {
  label: string;
  settingKey: string;
  settings: Record<string, string>;
  setSettings: (up: Record<string, string>) => void;
  defaultVal: string;
}) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={settings[settingKey] || defaultVal}
          onChange={(e) => setSettings({ ...settings, [settingKey]: e.target.value })}
          className="w-10 h-10 rounded cursor-pointer border border-zinc-600"
        />
        <input
          type="text"
          value={settings[settingKey] || defaultVal}
          onChange={(e) => setSettings({ ...settings, [settingKey]: e.target.value })}
          className="flex-1 p-2 rounded bg-zinc-700 text-sm font-mono"
          placeholder={defaultVal}
        />
      </div>
    </div>
  );
}

function DiscoverPrinters({ onSelect }: { onSelect: (ip: string) => void }) {
  const [scanning, setScanning] = useState(false);
  const [subnet, setSubnet] = useState("");
  const [printers, setPrinters] = useState<{ ip: string; port: number }[]>([]);
  const [error, setError] = useState("");

  const quickScan = async () => {
    setScanning(true);
    setPrinters([]);
    setError("");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subnet: "" }),
      });
      const data = await res.json();
      setPrinters(data.printers || []);
      if (data.printers?.length === 0) setError("No printers found on common IPs. Try a full subnet scan.");
    } catch { setError("Scan failed"); }
    finally { setScanning(false); }
  };

  const fullScan = async () => {
    if (!subnet) return toast.error("Enter a subnet like 192.168.1.0");
    setScanning(true);
    setPrinters([]);
    setError("");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subnet }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setPrinters(data.printers || []);
      if (data.printers?.length === 0) setError("No printers found on that subnet.");
    } catch { setError("Scan failed"); }
    finally { setScanning(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={quickScan} disabled={scanning} className="px-3 py-2 bg-green-700 text-white rounded-lg text-xs hover:bg-green-600 disabled:opacity-50">
          {scanning ? "Scanning..." : "Quick Scan"}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          placeholder="Subnet: 192.168.1.0"
          value={subnet}
          onChange={(e) => setSubnet(e.target.value)}
          className="flex-1 p-2 rounded bg-zinc-700 text-sm"
        />
        <button onClick={fullScan} disabled={scanning} className="px-3 py-2 bg-blue-700 text-white rounded-lg text-xs hover:bg-blue-600 disabled:opacity-50">
          Scan
        </button>
      </div>
      {scanning && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
          Scanning network... this may take a moment
        </div>
      )}
      {printers.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-1">Found {printers.length} device(s):</p>
          {printers.map((p) => (
            <div key={p.ip} className="flex items-center justify-between bg-zinc-700 rounded-lg p-2 mb-1">
              <span className="text-sm text-green-300">{p.ip}:{p.port}</span>
              <button onClick={() => onSelect(p.ip)} className="px-2 py-1 bg-amber-500 text-black rounded text-xs font-medium">
                Use This IP
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-zinc-400">{error}</p>}
    </div>
  );
}
