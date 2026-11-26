import React, { useCallback, useEffect, useMemo, useState } from "react";
import { membershipApi, smsApi } from "../Api/apilist";
import {
  btn,
  inputCls,
  Spinner,
  Field,
  ConfirmDialog,
  Toasts,
  useToasts,
  errMsg,
  toList,
} from "./UI/UI";

/* ==========================================================================
   Constants
   ========================================================================== */
const MAX_MSG = 335;
const MAX_BULK = 1000;
const EXPIRING_WINDOW_DAYS = 7;

/* ==========================================================================
   Template packs — each carries an `audience` hint so picking a template
   auto-sets the right filters on the member list.
   audience:
     "active"   → active members (default gym audience)
     "expiring" → active memberships ending within EXPIRING_WINDOW_DAYS
     "expired"  → members whose latest membership has expired
     "all"      → leave current filters alone
   ========================================================================== */
const TEMPLATES = [
  /* ---------- Wellness / daily nudges (active) ---------- */
  {
    id: "water",
    label: "💧 Drink water",
    audience: "active",
    body: "Hi {{name}}, just a friendly reminder to drink water 💧 Stay hydrated and keep crushing your goals!",
  },
  {
    id: "motivation",
    label: "💪 Motivation",
    audience: "active",
    body: "Hi {{name}}, keep pushing — every rep counts. We believe in you! 💪",
  },
  {
    id: "restday",
    label: "😴 Rest day",
    audience: "active",
    body: "Hi {{name}}, rest is part of the plan. Take today to recover — your muscles will thank you tomorrow.",
  },
  {
    id: "hydration-boost",
    label: "🥤 Hydrate + protein",
    audience: "active",
    body: "Hi {{name}}, remember to hydrate and get your protein in today. Small habits, big results!",
  },

  /* ---------- Seasonal greetings (active) ---------- */
  {
    id: "newyear",
    label: "🎉 Happy New Year",
    audience: "active",
    body: "Hi {{name}}, Happy New Year from all of us! Wishing you health, strength and success in the year ahead. 🎉",
  },
  {
    id: "holiday",
    label: "🌿 Holiday greeting",
    audience: "active",
    body: "Hi {{name}}, wishing you a peaceful holiday filled with joy and rest. See you at the gym!",
  },
  {
    id: "eid",
    label: "🌙 Eid Mubarak",
    audience: "active",
    body: "Hi {{name}}, Eid Mubarak from all of us! Wishing you and your family health, happiness and peace.",
  },
  {
    id: "christmas",
    label: "🎄 Merry Christmas",
    audience: "active",
    body: "Hi {{name}}, Merry Christmas! Wishing you a joyful season and a strong, healthy year ahead. 🎄",
  },

  /* ---------- Renewal reminders (expiring soon) ---------- */
  {
    id: "expiring",
    label: "⏳ Expiring soon",
    audience: "expiring",
    body: "Hi {{name}}, your membership expires on {{date}}. Renew today to keep your streak going!",
  },
  {
    id: "expiring-discount",
    label: "🔥 Expiring — renew with discount",
    audience: "expiring",
    body: "Hi {{name}}, your membership expires on {{date}}. Renew now and get 10% off your next month! Reply RENEW to claim.",
  },

  /* ---------- Win-back (expired) ---------- */
  {
    id: "winback",
    label: "💌 We miss you",
    audience: "expired",
    body: "Hi {{name}}, we miss you at the gym! Come back this week — we saved your spot. 💪",
  },
  {
    id: "winback-discount",
    label: "🎁 Expired — discount offer",
    audience: "expired",
    body: "Hi {{name}}, it's been a while! Come back and enjoy 20% off your first month back. Offer valid this week only.",
  },
  {
    id: "winback-offer",
    label: "🏷️ Expired — come back + free gift",
    audience: "expired",
    body: "Hi {{name}}, ready to get back on track? Rejoin this month and get a free 1-hour personal training session. Reply YES to start.",
  },

  /* ---------- Blank ---------- */
  {
    id: "blank",
    label: "✏️ Blank",
    audience: "all",
    body: "",
  },
];

/* ==========================================================================
   Helpers
   ========================================================================== */
const renderTemplate = (body, vars) =>
  String(body || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const fullName = (m) =>
  `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.memberName || "Member";

const normalizePhone = (raw) => {
  let p = String(raw || "").replace(/[\s+\-()]/g, "");
  if (/^0[79]\d{8}$/.test(p)) p = "251" + p.slice(1);
  else if (/^[79]\d{8}$/.test(p)) p = "251" + p;
  return p;
};
const isValidPhone = (p) => /^2519\d{8}$/.test(p);

const daysUntil = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
};

const isExpiringSoon = (m) => {
  if (!m.isActive || m.status !== "Active") return false;
  const d = daysUntil(m.endDate);
  return d !== null && d >= 0 && d <= EXPIRING_WINDOW_DAYS;
};

const matchesAudience = (m, { msFilter, activeOnly }) => {
  if (activeOnly && !m.isActive) return false;
  if (msFilter === "all") return true;
  if (msFilter === "None") return !m.membershipId;
  return m.status === msFilter;
};

/* ==========================================================================
   Page
   ========================================================================== */
const SendSms = () => {
  const { toasts, push, dismiss } = useToasts();

  /* ---------- members ---------- */
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /* ---------- audience filters ---------- */
  const [search, setSearch] = useState("");
  const [msFilter, setMsFilter] = useState("Active");
  const [activeOnly, setActiveOnly] = useState(true);

  /* ---------- selection ---------- */
  const [selected, setSelected] = useState(new Set());

  /* ---------- composer ---------- */
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [personalise, setPersonalise] = useState(true);

  /* ---------- sending ---------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  /* ---------------- load members ---------------- */
  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await membershipApi.list({ page: 1, pageSize: MAX_BULK });
      setMembers(toList(data));
    } catch (e) {
      setLoadError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  /* ---------------- derived lists ---------------- */
  const audience = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (!matchesAudience(m, { msFilter, activeOnly })) return false;
      if (!q) return true;
      return (
        fullName(m).toLowerCase().includes(q) ||
        String(m.phone || "").toLowerCase().includes(q) ||
        String(m.email || "").toLowerCase().includes(q)
      );
    });
  }, [members, msFilter, activeOnly, search]);

  const audienceWithPhone = useMemo(
    () =>
      audience.filter((m) => isValidPhone(normalizePhone(m.phone))),
    [audience],
  );

  const selectedMembers = useMemo(
    () => audienceWithPhone.filter((m) => selected.has(m.id)),
    [audienceWithPhone, selected],
  );

  // Also allow already-selected members who fell out of the current filter
  // to stay counted. Practically: keep selection intersection with audience,
  // so toggling filters doesn't silently send to hidden people.
  const allVisibleSelected =
    audienceWithPhone.length > 0 &&
    audienceWithPhone.every((m) => selected.has(m.id));

  /* ---------------- selection helpers ---------------- */
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        audienceWithPhone.forEach((m) => next.delete(m.id));
      } else {
        audienceWithPhone.forEach((m) => next.add(m.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());
  const pickOnly = (ids) => setSelected(new Set(ids));

  const selectAllActiveWithPhone = () =>
    pickOnly(
      members
        .filter((m) => m.isActive && isValidPhone(normalizePhone(m.phone)))
        .map((m) => m.id),
    );

  const selectExpiringSoon = () =>
    pickOnly(
      members
        .filter(
          (m) => isExpiringSoon(m) && isValidPhone(normalizePhone(m.phone)),
        )
        .map((m) => m.id),
    );

  const selectExpired = () =>
    pickOnly(
      members
        .filter(
          (m) =>
            m.status === "Expired" &&
            isValidPhone(normalizePhone(m.phone)),
        )
        .map((m) => m.id),
    );

  /* ---------------- composer ---------------- */
  const applyTemplate = (t) => {
    setTemplateId(t.id);
    setBody(t.body);

    switch (t.audience) {
      case "active":
        setActiveOnly(true);
        setMsFilter("Active");
        break;
      case "expiring":
        setActiveOnly(true);
        setMsFilter("Active");
        break;
      case "expired":
        setActiveOnly(true);
        setMsFilter("Expired");
        break;
      case "all":
      default:
        break;
    }

    setSelected(new Set());
  };

  const charCount = body.length;
  const tooLong = charCount > MAX_MSG;

  const previewMember = selectedMembers[0] || audienceWithPhone[0] || null;
  const previewVars = previewMember
    ? {
        name: previewMember.firstName || fullName(previewMember),
        date: fmtDate(previewMember.endDate),
      }
    : { name: "Abebe", date: "Dec 31, 2026" };

  const previewText = personalise
    ? renderTemplate(body, previewVars)
    : body;

  /* ---------------- send ---------------- */
  const doSend = async () => {
    setSending(true);
    setResult(null);
    try {
      if (personalise) {
        const outcomes = await Promise.allSettled(
          selectedMembers.map((m) =>
            smsApi.send({
              phone: normalizePhone(m.phone),
              message: renderTemplate(body, {
                name: m.firstName || fullName(m),
                date: fmtDate(m.endDate),
              }),
              type: "Campaign",
            }),
          ),
        );
        const errors = [];
        let sent = 0;
        outcomes.forEach((o, i) => {
          if (o.status === "fulfilled") sent++;
          else
            errors.push({
              member: selectedMembers[i],
              error: errMsg(o.reason),
            });
        });
        setResult({ sent, failed: errors.length, errors });
        if (errors.length === 0) push(`Sent ${sent} SMS.`);
        else push(`Sent ${sent}, failed ${errors.length}.`, "error");
      } else {
        const contacts = selectedMembers.map((m) => ({
          phone: normalizePhone(m.phone),
        }));
        const data = await smsApi.sendBulk({ contacts, message: body });
        setResult({
          sent: data?.sent ?? contacts.length,
          failed: (data?.skippedInvalid || []).length,
          errors: (data?.skippedInvalid || []).map((p) => ({
            member: { phone: p },
            error: "Invalid phone number",
          })),
        });
        push(`Bulk SMS sent to ${data?.sent ?? contacts.length} members.`);
      }
      setConfirmOpen(false);
      setSelected(new Set());
    } catch (e) {
      push(errMsg(e), "error");
      setResult({
        sent: 0,
        failed: selectedMembers.length,
        errors: [{ error: errMsg(e) }],
      });
    } finally {
      setSending(false);
    }
  };

  const canSend =
    selectedMembers.length > 0 &&
    body.trim().length > 0 &&
    !tooLong &&
    !sending;

  /* ================================================================
     UI
     ================================================================ */
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Send SMS</h1>
          <p className="mt-1 text-sm text-stone-500">
            Send a message to your members — wellness nudges, greetings,
            renewal reminders, or win-back offers.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={btn.secondary}
            onClick={loadMembers}
            disabled={loading}
          >
            {loading && <Spinner />} Refresh
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {loadError}{" "}
          <button type="button" className={btn.link} onClick={loadMembers}>
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* ============ Audience picker ============ */}
        <div className="rounded-xl border border-stone-200 bg-white lg:col-span-3">
          <div className="border-b border-stone-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, email"
                className={`${inputCls} max-w-xs`}
              />
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                Active members only
              </label>
              <select
                value={msFilter}
                onChange={(e) => setMsFilter(e.target.value)}
                className={`${inputCls} w-auto`}
              >
                <option value="all">Any membership</option>
                <option value="Active">Active membership</option>
                <option value="Expired">Expired membership</option>
                <option value="Frozen">Frozen membership</option>
                <option value="None">No membership</option>
              </select>
            </div>

            {/* Quick-select shortcuts */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                className={btn.link}
                onClick={() => {
                  setActiveOnly(true);
                  setMsFilter("Active");
                  // Wait a tick so filtered list updates, then select
                  setTimeout(selectAllActiveWithPhone, 0);
                }}
              >
                Select all active
              </button>
              <span className="text-stone-300">·</span>
              <button
                type="button"
                className={btn.link}
                onClick={() => {
                  setActiveOnly(true);
                  setMsFilter("Active");
                  setTimeout(selectExpiringSoon, 0);
                }}
              >
                Select expiring soon
              </button>
              <span className="text-stone-300">·</span>
              <button
                type="button"
                className={btn.link}
                onClick={() => {
                  setActiveOnly(true);
                  setMsFilter("Expired");
                  setTimeout(selectExpired, 0);
                }}
              >
                Select expired
              </button>
              <span className="text-stone-300">·</span>
              <button
                type="button"
                className={btn.link}
                onClick={toggleVisible}
              >
                {allVisibleSelected
                  ? "Unselect visible"
                  : `Select visible (${audienceWithPhone.length})`}
              </button>
              {selected.size > 0 && (
                <>
                  <span className="text-stone-300">·</span>
                  <button
                    type="button"
                    className={btn.link}
                    onClick={clearSelection}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[520px] overflow-auto">
            {loading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-stone-500">
                <Spinner /> Loading members…
              </div>
            ) : audienceWithPhone.length === 0 ? (
              <div className="p-10 text-center text-sm text-stone-500">
                No matching members with a valid phone number.
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {audienceWithPhone.map((m) => {
                  const checked = selected.has(m.id);
                  const expiring = isExpiringSoon(m);
                  return (
                    <li
                      key={m.id}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-stone-50 ${
                        checked ? "bg-emerald-50/40" : ""
                      }`}
                      onClick={() => toggleOne(m.id)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-stone-900">
                          {fullName(m)}
                        </p>
                        <p className="truncate text-xs text-stone-500">
                          {m.phone}
                          {m.membershipTypeName
                            ? ` · ${m.membershipTypeName}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {expiring && (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {daysUntil(m.endDate)}d left
                          </span>
                        )}
                        {m.status && (
                          <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600">
                            {m.status}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600">
            <span>
              {audienceWithPhone.length} eligible ·{" "}
              <b>{selectedMembers.length}</b> selected
            </span>
            {audience.length !== audienceWithPhone.length && (
              <span className="text-xs text-stone-500">
                {audience.length - audienceWithPhone.length} hidden — no valid
                phone
              </span>
            )}
          </div>
        </div>

        {/* ============ Composer ============ */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-stone-900">
              Message
            </h2>

            {/* Templates */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    templateId === t.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Field label="Body">
              <textarea
                rows={6}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setTemplateId("blank");
                }}
                placeholder="Type your message… Use {{name}} and {{date}} to personalise."
                className={`${inputCls} resize-y font-mono text-sm`}
              />
            </Field>

            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={tooLong ? "text-red-600" : "text-stone-500"}>
                {charCount}/{MAX_MSG}
              </span>
              <label className="flex items-center gap-1.5 text-stone-600">
                <input
                  type="checkbox"
                  checked={personalise}
                  onChange={(e) => setPersonalise(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Personalise{" "}
                <code className="rounded bg-stone-100 px-1">{"{{name}}"}</code>
                <code className="rounded bg-stone-100 px-1">{"{{date}}"}</code>
              </label>
            </div>

            {personalise && selectedMembers.length > 1 && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                Personalisation sends one SMS per recipient, not a single bulk
                call.
              </p>
            )}

            {/* Preview */}
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold uppercase text-stone-500">
                Preview
              </p>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-800">
                {previewText || (
                  <span className="text-stone-400">(empty message)</span>
                )}
              </div>
              {previewMember && personalise && (
                <p className="mt-1 text-xs text-stone-500">
                  as seen by {fullName(previewMember)}
                </p>
              )}
            </div>
          </div>

          {/* Send box */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-stone-600">Recipients</span>
              <b className="text-stone-900">{selectedMembers.length}</b>
            </div>
            <button
              type="button"
              disabled={!canSend}
              onClick={() => setConfirmOpen(true)}
              className={`${btn.primary} w-full`}
            >
              {sending && <Spinner />}
              Send SMS
            </button>
            {selectedMembers.length === 0 && (
              <p className="mt-2 text-center text-xs text-stone-500">
                Pick at least one member.
              </p>
            )}
            {tooLong && (
              <p className="mt-2 text-center text-xs text-red-600">
                Message is too long ({charCount}/{MAX_MSG}).
              </p>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
              <p className="font-medium text-stone-900">Last result</p>
              <p className="mt-1 text-stone-600">
                ✅ Sent: <b>{result.sent}</b>
                {result.failed > 0 && (
                  <>
                    {" "}
                    · ❌ Failed: <b>{result.failed}</b>
                  </>
                )}
              </p>
              {result.errors?.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-red-700">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      {e.member?.phone || fullName(e.member || {})} — {e.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <ConfirmDialog
          title={`Send SMS to ${selectedMembers.length} member${
            selectedMembers.length === 1 ? "" : "s"
          }?`}
          message={
            <div className="space-y-2 text-sm">
              <div className="whitespace-pre-wrap rounded-md bg-stone-50 p-3 font-mono text-xs text-stone-800">
                {previewText || "(empty message)"}
              </div>
              <p className="text-stone-600">
                {personalise
                  ? "Each recipient gets a personalised copy."
                  : "The same message is sent to everyone."}
              </p>
            </div>
          }
          confirmLabel="Send now"
          busy={sending}
          onConfirm={doSend}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default SendSms;