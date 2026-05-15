"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Question {
  id: string;
  label: string;
  type: "rating" | "text";
}

interface CampaignConfig {
  enabled: boolean;
  targetItemId: string;
  timeframeDays: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountLabel: string;
  popupTitle: string;
  popupSubtitle: string;
  questions: Question[];
}

const defaultConfig: CampaignConfig = {
  enabled: false,
  targetItemId: "",
  timeframeDays: 180,
  discountType: "percentage",
  discountValue: 10,
  discountLabel: "10% off your order!",
  popupTitle: "We value your feedback!",
  popupSubtitle: "Tell us about your last visit & get a discount on this order.",
  questions: [
    { id: "q1", label: "How was your food?", type: "rating" },
    { id: "q2", label: "Any suggestions?", type: "text" },
  ],
};

export default function AdminFeedbackPage() {
  const [config, setConfig] = useState<CampaignConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [showResponses, setShowResponses] = useState(false);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [configRes, itemsRes] = await Promise.all([
          fetch("/api/admin/feedback"),
          fetch("/api/admin/items"),
        ]);
        if (configRes.ok) {
          const data = await configRes.json();
          if (data) setConfig(data);
        }
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setMenuItems(data);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) toast.success("Feedback campaign saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Error saving");
    }
  };

  const loadResponses = async () => {
    setResponsesLoading(true);
    try {
      const res = await fetch("/api/admin/feedback/responses");
      if (res.ok) setResponses(await res.json());
    } catch {}
    setResponsesLoading(false);
  };

  const addQuestion = () => {
    const id = `q${Date.now()}`;
    setConfig({
      ...config,
      questions: [...config.questions, { id, label: "", type: "rating" }],
    });
  };

  const removeQuestion = (id: string) => {
    setConfig({ ...config, questions: config.questions.filter((q) => q.id !== id) });
  };

  const updateQuestion = (id: string, field: string, value: string) => {
    setConfig({
      ...config,
      questions: config.questions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q
      ),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customer Feedback</h1>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          Save Campaign
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">Loading...</div>
      ) : (
        <>
          <div className="bg-zinc-800 rounded-xl p-4 space-y-5 max-w-lg mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="accent-amber-500"
              />
              <span className="text-sm text-zinc-300 font-medium">Enable Feedback Campaign</span>
            </label>

            <p className="text-xs text-zinc-500 -mt-3">
              When enabled, returning customers who have purchased the target item below will see a feedback popup before checkout.
            </p>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Target Menu Item</label>
              <select
                value={config.targetItemId}
                onChange={(e) => setConfig({ ...config, targetItemId: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
              >
                <option value="">Select an item...</option>
                {menuItems.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Customers who previously ordered this item will be targeted.
              </p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Timeframe (days)</label>
              <input
                type="number"
                min={1}
                value={config.timeframeDays}
                onChange={(e) => setConfig({ ...config, timeframeDays: parseInt(e.target.value) || 180 })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Only customers who ordered the target item within this many days will be prompted.
              </p>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Discount Offer</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-zinc-400 mb-1">Type</label>
                  <select
                    value={config.discountType}
                    onChange={(e) => setConfig({ ...config, discountType: e.target.value as any })}
                    className="w-full p-2 rounded bg-zinc-700 text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-zinc-400 mb-1">Value</label>
                  <input
                    type="number"
                    min={0}
                    step={config.discountType === "percentage" ? 1 : 0.5}
                    value={config.discountValue}
                    onChange={(e) => setConfig({ ...config, discountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded bg-zinc-700 text-sm"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm text-zinc-400 mb-1">Discount Label</label>
                <input
                  type="text"
                  value={config.discountLabel}
                  onChange={(e) => setConfig({ ...config, discountLabel: e.target.value })}
                  className="w-full p-2 rounded bg-zinc-700 text-sm"
                  placeholder="e.g. 10% off your order!"
                />
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Popup Copy</h3>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={config.popupTitle}
                  onChange={(e) => setConfig({ ...config, popupTitle: e.target.value })}
                  className="w-full p-2 rounded bg-zinc-700 text-sm"
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm text-zinc-400 mb-1">Subtitle</label>
                <textarea
                  value={config.popupSubtitle}
                  onChange={(e) => setConfig({ ...config, popupSubtitle: e.target.value })}
                  className="w-full p-2 rounded bg-zinc-700 text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-300">Questions</h3>
                <button
                  onClick={addQuestion}
                  className="px-3 py-1 bg-zinc-700 text-xs text-zinc-300 rounded-lg hover:bg-zinc-600"
                >
                  + Add Question
                </button>
              </div>
              {config.questions.length === 0 && (
                <p className="text-xs text-zinc-500">No questions added.</p>
              )}
              {config.questions.map((q, i) => (
                <div key={q.id} className="bg-zinc-900 rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">Question {i + 1}</span>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={q.label}
                    onChange={(e) => updateQuestion(q.id, "label", e.target.value)}
                    className="w-full p-2 rounded bg-zinc-700 text-sm mb-2"
                    placeholder="e.g. How was your food?"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.id, "type", e.target.value)}
                    className="w-full p-2 rounded bg-zinc-700 text-sm"
                  >
                    <option value="rating">Star Rating (1-5)</option>
                    <option value="text">Text Input</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-2 text-zinc-300 mt-8">Feedback Responses</h2>
          <button
            onClick={() => {
              setShowResponses(!showResponses);
              if (!showResponses) loadResponses();
            }}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg text-sm font-medium hover:bg-zinc-600 mb-4"
          >
            {showResponses ? "Hide Responses" : "Load Responses"}
          </button>

          {showResponses && (
            <div className="bg-zinc-800 rounded-xl p-4 max-w-2xl">
              {responsesLoading ? (
                <p className="text-sm text-zinc-400">Loading...</p>
              ) : responses.length === 0 ? (
                <p className="text-sm text-zinc-400">No feedback yet.</p>
              ) : (
                <div className="space-y-3">
                  {responses.map((r) => (
                    <div key={r.id} className="bg-zinc-900 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{r.customerName}</span>
                          <span className="text-xs text-zinc-500 ml-2">{r.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.discountUsed ? (
                            <span className="text-xs text-green-400">Discount used</span>
                          ) : (
                            <span className="text-xs text-amber-400">
                              ${r.discountAmount} discount pending
                            </span>
                          )}
                          <span className="text-xs text-zinc-500">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedResponse(expandedResponse === r.id ? null : r.id)
                        }
                        className="text-xs text-amber-400 hover:text-amber-300 mt-1"
                      >
                        {expandedResponse === r.id ? "Hide answers" : "Show answers"}
                      </button>
                      {expandedResponse === r.id && (
                        <div className="mt-2 space-y-1">
                          {(() => {
                            try {
                              const answers = JSON.parse(r.answers);
                              return Object.entries(answers).map(([qId, answer]) => {
                                const question = config.questions.find((q) => q.id === qId);
                                return (
                                  <div key={qId} className="text-xs">
                                    <span className="text-zinc-400">
                                      {question?.label || qId}:
                                    </span>{" "}
                                    <span className="text-zinc-200">
                                      {String(answer)}
                                    </span>
                                  </div>
                                );
                              });
                            } catch {
                              return <p className="text-xs text-zinc-500">{r.answers}</p>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
