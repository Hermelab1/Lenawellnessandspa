// pages/SMSTemplate.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { smsTemplateApi } from "../Api/apilist"; // adjust path

const CATEGORIES = ["general", "otp", "appointment", "marketing", "alert"];

const categoryStyle = {
  general: "bg-slate-100 text-slate-700",
  otp: "bg-amber-100 text-amber-800",
  appointment: "bg-teal-100 text-teal-800",
  marketing: "bg-violet-100 text-violet-800",
  alert: "bg-rose-100 text-rose-800",
};

const extractVariables = (body = "") => {
  const found = new Set();
  const re = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  let m;
  while ((m = re.exec(body))) found.add(m[1]);
  return [...found];
};

const render = (body = "", values = {}) =>
  body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, k) => (values[k] ? values[k] : `{{${k}}}`));

const emptyForm = { id: null, name: "", code: "", category: "general", body: "", isActive: true };

/* ------------------------------ Modal ------------------------------ */
const Modal = ({ title, onClose, children, width = "max-w-lg" }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className={`w-full ${width} rounded-lg bg-white shadow-xl`}>
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

/* ------------------------------ Page ------------------------------- */
const SMSTemplate = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState(null); // create/edit modal
  const [saving, setSaving] = useState(false);

  const [testing, setTesting] = useState(null); // template being tested
  const [testPhone, setTestPhone] = useState("");
  const [testValues, setTestValues] = useState({});
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const notify = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const { data } = await smsTemplateApi.list(params);
      setTemplates(data.data || []);
    } catch (e) {
      notify("error", e.response?.data?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  /* ---- create / edit ---- */
  const openCreate = () => setForm({ ...emptyForm });
  const openEdit = (t) =>
    setForm({ id: t.id, name: t.name, code: t.code, category: t.category, body: t.body, isActive: t.isActive });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, code: form.code, category: form.category, body: form.body, isActive: form.isActive };
      if (form.id) await smsTemplateApi.update(form.id, payload);
      else await smsTemplateApi.create(payload);
      notify("success", form.id ? "Template updated" : "Template created");
      setForm(null);
      load();
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (t) => {
    try {
      await smsTemplateApi.toggle(t.id);
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to update template");
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await smsTemplateApi.remove(t.id);
      notify("success", "Template deleted");
      load();
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to delete template");
    }
  };

  /* ---- test send ---- */
  const openTest = (t) => {
    setTesting(t);
    setTestPhone("");
    setTestValues({});
    setTestResult(null);
  };

  const sendTest = async (e) => {
    e.preventDefault();
    setSending(true);
    setTestResult(null);
    try {
      const { data } = await smsTemplateApi.sendTest(testing.id, testPhone, testValues);
      setTestResult({ ok: true, text: `Sent to ${data.data.to}` });
      setTemplates((prev) => prev.map((x) => (x.id === testing.id ? { ...x, lastTestedAt: new Date().toISOString() } : x)));
    } catch (err) {
      setTestResult({ ok: false, text: err.response?.data?.message || "Failed to send test SMS" });
    } finally {
      setSending(false);
    }
  };

  const formVars = useMemo(() => (form ? extractVariables(form.body) : []), [form]);
  const testVars = useMemo(() => (testing ? extractVariables(testing.body) : []), [testing]);
  const testPreview = testing ? render(testing.body, testValues) : "";

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">SMS templates</h1>
          <p className="text-sm text-slate-500">Write reusable messages and test them with your SMS configuration.</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
          New template
        </button>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code or text"
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* list */}
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading templates…</p>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
          <p className="text-sm text-slate-600">No templates yet.</p>
          <button onClick={openCreate} className="mt-2 text-sm font-medium text-teal-700 hover:underline">
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className={`flex flex-col rounded-lg border bg-white p-4 ${t.isActive ? "border-slate-200" : "border-slate-200 opacity-70"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-slate-900">{t.name}</h3>
                  <p className="truncate text-xs text-slate-500">{t.code}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyle[t.category] || categoryStyle.general}`}>
                  {t.category}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{t.body}</p>

              {t.variables?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.variables.map((v) => (
                    <span key={v} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={t.isActive} onChange={() => toggle(t)} className="h-4 w-4 accent-teal-700" />
                  {t.isActive ? "Active" : "Inactive"}
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => openTest(t)} className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
                    Send test
                  </button>
                  <button onClick={() => openEdit(t)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                    Edit
                  </button>
                  <button onClick={() => remove(t)} className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">
                    Delete
                  </button>
                </div>
              </div>
              {t.lastTestedAt && (
                <p className="mt-2 text-xs text-slate-400">Last tested {new Date(t.lastTestedAt).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* create / edit modal */}
      {form && (
        <Modal title={form.id ? "Edit template" : "New template"} onClose={() => setForm(null)} width="max-w-xl">
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                  placeholder="appointment_reminder"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
              <textarea
                required
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Hi {{name}}, your appointment is on {{date}} at {{time}}."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>Use {"{{variable}}"} for values filled in at send time.</span>
                <span>
                  {form.body.length} characters · {Math.ceil(form.body.length / 160) || 1} SMS
                </span>
              </div>
              {formVars.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {formVars.map((v) => (
                    <span key={v} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-teal-700"
              />
              Active
            </label>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setForm(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={saving} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60">
                {saving ? "Saving…" : form.id ? "Save changes" : "Create template"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* test send modal */}
      {testing && (
        <Modal title={`Send test: ${testing.name}`} onClose={() => setTesting(null)}>
          <form onSubmit={sendTest} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone number</label>
              <input
                required
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="0912345678"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            {testVars.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {testVars.map((v) => (
                  <div key={v}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{v}</label>
                    <input
                      required
                      value={testValues[v] || ""}
                      onChange={(e) => setTestValues({ ...testValues, [v]: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Message preview</p>
              <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{testPreview}</p>
            </div>

            {testResult && (
              <p className={`rounded-md px-3 py-2 text-sm ${testResult.ok ? "bg-teal-50 text-teal-800" : "bg-rose-50 text-rose-800"}`}>
                {testResult.text}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setTesting(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Close
              </button>
              <button disabled={sending} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60">
                {sending ? "Sending…" : "Send test SMS"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] rounded-md px-4 py-2 text-sm text-white shadow-lg ${
            toast.type === "error" ? "bg-rose-700" : "bg-teal-700"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default SMSTemplate;