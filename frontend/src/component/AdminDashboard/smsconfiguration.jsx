import React, { useState, useEffect, useCallback, useRef } from "react";
import { smsApi } from "../Api/apilist";

/* ---------- helpers ---------- */
const errMsg = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

// 0912345678 / +251912345678 / 912345678 -> 251912345678
const normalizePhone = (raw) => {
  let p = String(raw || "").replace(/[\s+\-()]/g, "");
  if (/^0[79]\d{8}$/.test(p)) p = "251" + p.slice(1);
  else if (/^[79]\d{8}$/.test(p)) p = "251" + p;
  return p;
};
const isValidPhone = (p) => /^2519\d{8}$/.test(p);

const inputCls =
  "w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all";

const Toggle = ({ checked, onClick, title, desc }) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
      checked ? "bg-blue-50 border-blue-600" : "bg-white border-slate-100"
    }`}
  >
    <div>
      <h4 className="font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
    <div
      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
        checked ? "bg-blue-600 border-blue-600" : "border-slate-300"
      }`}
    >
      {checked && <div className="w-2 h-2 bg-white rounded-full" />}
    </div>
  </div>
);

const TABS = [
  { id: "credentials", label: "Credentials" },
  { id: "configuration", label: "Webhooks" },
  { id: "otp", label: "OTP & Test" },
  { id: "behavior", label: "Behavior" },
];

/* Pull balance info out of the various possible response shapes */
/* Pull balance info out of the API response */
const extractBalance = (res) => {
  const data = res?.data ?? {};
  return {
    balance: data.balance ?? null,
    currency: data.currency || "ETB",
    totalSms: data.total_sms ?? null,
    totalAmount: data.total_amount ?? null,
    warning: res?.warning || null,
  };
};
const SMSConfiguration = () => {
  const [activeTab, setActiveTab] = useState("credentials");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const noticeTimer = useRef(null);

  const [formData, setFormData] = useState({
    status: "enabled",
    environment: "sandbox",
    apiToken: "", // only filled when the user types a NEW token
    shortcodeId: "",
    senderId: "",
    defaultMessage: "",
    callbackUrl: "",
    notifyUrl: "",
    otpEnabled: true,
    otpLength: 6,
    otpExpiry: 5,
    retryOnFailure: true,
    maxRetries: 3,
    balance: null,
    currency: "ETB",
    totalSms: null,
    totalAmount: null,
  });

  const notify = useCallback((type, text) => {
    setNotice({ type, text });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6000);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  /* ---------- server config -> form state ---------- */
  const applyServerConfig = useCallback((cfg = {}) => {
    setTokenSaved(Boolean(cfg.hasToken));
    setFormData((prev) => ({
      ...prev,
      status: cfg.status ?? prev.status,
      environment: cfg.environment ?? prev.environment,
      shortcodeId: cfg.shortcodeId ?? "",
      senderId: cfg.senderId ?? "",
      defaultMessage: cfg.defaultMessage ?? "",
      callbackUrl: cfg.callbackUrl ?? "",
      notifyUrl: cfg.notifyUrl ?? "",
      otpEnabled: cfg.otpEnabled ?? prev.otpEnabled,
      otpLength: cfg.otpLength ?? prev.otpLength,
      otpExpiry: cfg.otpExpiry ?? prev.otpExpiry,
      retryOnFailure: cfg.retryOnFailure ?? prev.retryOnFailure,
      maxRetries: cfg.maxRetries ?? prev.maxRetries,
      balance: cfg.balance ?? prev.balance,
      currency: cfg.balanceCurrency || prev.currency,
      totalSms: cfg.totalSms ?? prev.totalSms,
      totalAmount: cfg.totalAmount ?? prev.totalAmount,
      apiToken: "", // never keep the token in state after load/save
    }));
  }, []);

  /* ---------- balance ---------- */
  const refreshBalance = useCallback(
    async (silent = false) => {
      setIsRefreshingBalance(true);
      try {
        const res = await smsApi.getBalance();
        const { balance, currency, totalSms, totalAmount, warning } =
          extractBalance(res);
        setFormData((p) => ({
          ...p,
          balance,
          currency: currency || p.currency,
          totalSms,
          totalAmount,
        }));
        if (warning && !silent) notify("error", warning);
      } catch (err) {
        if (!silent) notify("error", errMsg(err, "Could not fetch balance."));
      } finally {
        setIsRefreshingBalance(false);
      }
    },
    [notify]
  );

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await smsApi.getConfig();
        applyServerConfig(res?.data);
        if (res?.data?.hasToken) refreshBalance(true);
      } catch (err) {
        notify("error", errMsg(err, "Failed to load configuration."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [applyServerConfig, refreshBalance, notify]);

  /* ---------- handlers ---------- */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = value;
    if (type === "checkbox") v = checked;
    else if (type === "number") v = value === "" ? "" : Number(value);
    setFormData((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tokenSaved && !formData.apiToken.trim()) {
      setActiveTab("credentials");
      return notify("error", "API token is required.");
    }
    if (!(formData.otpLength >= 4 && formData.otpLength <= 8)) {
      setActiveTab("otp");
      return notify("error", "OTP length must be between 4 and 8.");
    }
    if (!(formData.otpExpiry >= 1 && formData.otpExpiry <= 30)) {
      setActiveTab("otp");
      return notify("error", "OTP expiry must be between 1 and 30 minutes.");
    }
    if (!(formData.maxRetries >= 1 && formData.maxRetries <= 10)) {
      setActiveTab("behavior");
      return notify("error", "Max retries must be between 1 and 10.");
    }

    const payload = {
      status: formData.status,
      environment: formData.environment,
      shortcodeId: formData.shortcodeId,
      senderId: formData.senderId,
      defaultMessage: formData.defaultMessage,
      callbackUrl: formData.callbackUrl,
      notifyUrl: formData.notifyUrl,
      otpEnabled: formData.otpEnabled,
      otpLength: Number(formData.otpLength),
      otpExpiry: Number(formData.otpExpiry),
      retryOnFailure: formData.retryOnFailure,
      maxRetries: Number(formData.maxRetries),
    };
    const newToken = formData.apiToken.trim();
    if (newToken) payload.apiToken = newToken; // blank = keep the saved token

    setIsSaving(true);
    try {
      const res = await smsApi.updateConfig(payload);
      applyServerConfig(res?.data);
      if (newToken) refreshBalance(true);
      notify("success", res?.message || "Configuration saved.");
    } catch (err) {
      notify("error", errMsg(err, "Save failed."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    const phone = normalizePhone(testPhone);
    if (!isValidPhone(phone))
      return notify("error", "Enter a valid number, e.g. 0912345678 or 251912345678.");
    if (formData.apiToken.trim())
      return notify("error", "You entered a new token. Click “Update Integration” first, then test.");
    if (!tokenSaved)
      return notify("error", "Add and save your API token first.");

    setIsTesting(true);
    try {
      const res = await smsApi.sendTest({
        phone,
        message: testMessage.trim() || undefined,
      });
      notify("success", res?.message || "Test SMS sent.");
      refreshBalance(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const detailText =
        typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : "";
      notify(
        "error",
        errMsg(err, "Failed to send test SMS.") + (detailText ? ` (${detailText})` : "")
      );
    } finally {
      setIsTesting(false);
    }
  };

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="mt-4 font-bold text-slate-600">Loading Configuration...</p>
      </div>
    );
  }

  const hasBalance =
    formData.totalSms != null ||
    formData.totalAmount != null ||
    formData.balance != null;

  return (
    <div className="px-4 antialiased text-gray-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GeezSMS Integration</h1>
          <p className="text-slate-500 mt-1">
            Manage your GeezSMS API token, sender settings and OTP configuration.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              formData.environment === "sandbox"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {formData.environment === "sandbox" ? "● Sandbox Mode" : "● Production Live"}
          </div>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-xl text-sm font-medium border flex justify-between items-start ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="ml-4 font-bold">
            ×
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Quick grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-100">
            <div className="p-6 border-r border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full bg-transparent font-medium focus:outline-none text-slate-700 cursor-pointer"
              >
                <option value="enabled">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="p-6 border-r border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Environment</label>
              <select
                name="environment"
                value={formData.environment}
                onChange={handleInputChange}
                className="w-full bg-transparent font-medium focus:outline-none text-slate-700 cursor-pointer"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div className="p-6 border-r border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Balance</label>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-700 text-sm">
                  {hasBalance ? (
                    <>
                      {formData.totalSms != null && <span>{formData.totalSms} SMS</span>}
                      {formData.totalSms != null && formData.totalAmount != null && (
                        <span className="text-slate-300"> · </span>
                      )}
                      {formData.totalAmount != null && <span>{formData.totalAmount}</span>}
                      {formData.totalSms == null && formData.totalAmount == null && formData.balance != null && (
                        <span>
                          {formData.balance} {formData.currency}
                        </span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => refreshBalance(false)}
                  disabled={!tokenSaved || isRefreshingBalance}
                  className="text-xs font-bold text-blue-600 disabled:text-slate-300"
                >
                  {isRefreshingBalance ? "..." : "REFRESH"}
                </button>
              </div>
            </div>
            <div className="p-6 bg-slate-50">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Provider</label>
              <span className="text-sm font-bold text-blue-600">geezsms_api_v1</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 border-b border-slate-100 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 text-sm font-semibold bg-transparent hover:bg-transparent whitespace-nowrap transition-all relative ${
                  activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          <div className="p-8 min-h-[350px]">
            {/* Credentials */}
            {activeTab === "credentials" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      API Token {!tokenSaved && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        name="apiToken"
                        value={formData.apiToken}
                        onChange={handleInputChange}
                        autoComplete="off"
                        placeholder={
                          tokenSaved ? "•••••••• saved. Type to replace" : "Your GeezSMS API token"
                        }
                        className={`${inputCls} pr-24`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        {showToken ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Get your token from{" "}
                      <a
                        href="https://geezsms.com/#/api"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        geezsms.com/#/api
                      </a>
                      . Leave blank to keep the current token.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Shortcode ID</label>
                    <input
                      type="text"
                      name="shortcodeId"
                      value={formData.shortcodeId}
                      onChange={handleInputChange}
                      placeholder="Optional. Leave blank to use Geez's shortcode"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sender ID</label>
                    <input
                      type="text"
                      name="senderId"
                      value={formData.senderId}
                      onChange={handleInputChange}
                      placeholder="Used in bulk SMS requests (optional)"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Default Message</label>
                    <textarea
                      name="defaultMessage"
                      value={formData.defaultMessage}
                      onChange={handleInputChange}
                      rows={3}
                      maxLength={335}
                      placeholder="Message content (max 335 characters, supports Unicode)"
                      className={`${inputCls} resize-none`}
                    />
                    <p className="text-xs text-slate-500 mt-1 text-right">
                      {formData.defaultMessage.length}/335
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Webhooks */}
            {activeTab === "configuration" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Callback URL <span className="text-slate-400 font-normal">(single SMS)</span>
                  </label>
                  <input
                    type="url"
                    name="callbackUrl"
                    value={formData.callbackUrl}
                    onChange={handleInputChange}
                    className={inputCls}
                    placeholder="https://yourdomain.com/api/sms/webhook/callback"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Sent as <code>callback</code> to <code>/sms/send</code>. Must be a public URL.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Notification URL <span className="text-slate-400 font-normal">(bulk SMS)</span>
                  </label>
                  <input
                    type="url"
                    name="notifyUrl"
                    value={formData.notifyUrl}
                    onChange={handleInputChange}
                    className={inputCls}
                    placeholder="https://yourdomain.com/api/sms/webhook/notify"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Sent as <code>notify_url</code> to <code>/sms/send/bulk</code>.
                  </p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  <strong>Tip:</strong> GeezSMS can't reach <code>localhost</code>. While developing, use a
                  tunnel (ngrok / cloudflared) for these URLs. The callback includes{" "}
                  <code>api_log_id</code> so you can reconcile with your local records.
                </div>
              </div>
            )}

            {/* OTP & Test */}
            {activeTab === "otp" && (
              <div className="space-y-8 max-w-2xl">
                <Toggle
                  checked={formData.otpEnabled}
                  onClick={() => setFormData((p) => ({ ...p, otpEnabled: !p.otpEnabled }))}
                  title="Enable OTP Sending"
                  desc="Allows POST /api/sms/otp to deliver one-time passwords."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">OTP Length</label>
                    <input
                      type="number"
                      name="otpLength"
                      min={4}
                      max={8}
                      value={formData.otpLength}
                      onChange={handleInputChange}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      OTP Expiry (minutes)
                    </label>
                    <input
                      type="number"
                      name="otpExpiry"
                      min={1}
                      max={30}
                      value={formData.otpExpiry}
                      onChange={handleInputChange}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                  <h4 className="font-bold text-slate-800">Send a test SMS</h4>
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="0912345678 or 251912345678"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    maxLength={335}
                    placeholder="Message (optional, uses default message)"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isTesting}
                    className="px-6 py-2.5 rounded-xl font-bold text-blue-600 border border-blue-600 bg-white hover:bg-blue-50 transition-all disabled:opacity-50"
                  >
                    {isTesting ? "Sending..." : "Send Test SMS"}
                  </button>
                  <p className="text-xs text-slate-500">
                    The test uses the <strong>saved</strong> configuration. Save changes first.
                  </p>
                </div>
              </div>
            )}

            {/* Behavior */}
            {activeTab === "behavior" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Toggle
                  checked={formData.retryOnFailure}
                  onClick={() => setFormData((p) => ({ ...p, retryOnFailure: !p.retryOnFailure }))}
                  title="Retry on Failure"
                  desc="Re-attempt sending if the GeezSMS API request fails (network / server errors)."
                />
                <div className="p-6 rounded-2xl border-2 border-slate-100 bg-white">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Max Retries</label>
                  <input
                    type="number"
                    name="maxRetries"
                    min={1}
                    max={10}
                    value={formData.maxRetries}
                    onChange={handleInputChange}
                    disabled={!formData.retryOnFailure}
                    className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-400">
              🔒 API tokens are encrypted before storage and never sent back to the browser.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className={`w-full md:w-auto px-10 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
                isSaving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSaving ? "Saving Changes..." : "Update Integration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SMSConfiguration;