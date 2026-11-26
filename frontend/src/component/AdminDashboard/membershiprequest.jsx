import React, { useCallback, useEffect, useState } from "react";
import {
  membershipRequestApi,
  membershipTypeApi,
  serviceTypeApi,
} from "../Api/apilist"; // adjust the path to where this file lives

/* =========================================================
   MEMBERSHIP REQUESTS PAGE
   - Registrations submitted from the website Gym page
   - Approve  -> creates the member (or re-uses an existing one) + the membership
                 and sends the welcome SMS
   - Reject / Reopen / Delete / View details
   ========================================================= */

const STATUS_STYLE = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const TABS = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["", "All"],
];

const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const fmtDate = (v) => {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(v);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
};

const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString(undefined, {
        day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
      })
    : "—";

// "2026-01-31" + 1 month -> "2026-02-28" (clamped to the end of the month)
const addMonths = (dateStr, n) => {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1 + n, d);
  if (dt.getDate() !== d) dt.setDate(0);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
};

export default function MembershipRequests() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [params, setParams] = useState({ page: 1, limit: 10, status: "pending", search: "" });
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null); // { text, kind: "success" | "warning" }
  const [busyId, setBusyId] = useState(null);

  const [details, setDetails] = useState(null);
  const [approveFor, setApproveFor] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);

  const showNotice = (text, kind = "success") => setNotice({ text, kind });

  // ---- load list + stats ----
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = { page: params.page, limit: params.limit };
      if (params.status) query.status = params.status;
      if (params.search) query.search = params.search;
      const res = await membershipRequestApi.list(query);
      setRows(res.data || []);
      setPagination({
        page: res.pagination.page,
        totalPages: res.pagination.totalPages,
        total: res.pagination.total,
      });
    } catch (e) {
      setError(errMsg(e, "Failed to load requests"));
    } finally {
      setLoading(false);
    }
  }, [params]);

  const loadStats = useCallback(async () => {
    try {
      const res = await membershipRequestApi.stats();
      if (res.success) setStats(res.data);
    } catch {
      /* stat badges are optional */
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const refresh = () => Promise.all([load(), loadStats()]);

  // ---- search debounce ----
  const [searchDraft, setSearchDraft] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => (p.search === searchDraft.trim() ? p : { ...p, search: searchDraft.trim(), page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // ---- notice auto-hide ----
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  // ---- actions ----
  const reopen = async (r) => {
    setBusyId(r.Id);
    try {
      await membershipRequestApi.reopen(r.Id);
      showNotice("Request reopened.");
      await refresh();
    } catch (e) {
      setError(errMsg(e, "Failed to reopen"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete the request from ${r.fullName}?`)) return;
    setBusyId(r.Id);
    try {
      await membershipRequestApi.remove(r.Id);
      showNotice("Request deleted.");
      setDetails(null);
      await refresh();
    } catch (e) {
      setError(errMsg(e, "Failed to delete"));
    } finally {
      setBusyId(null);
    }
  };

  const afterReview = async (message, kind = "success") => {
    setApproveFor(null);
    setRejectFor(null);
    setDetails(null);
    showNotice(message, kind);
    await refresh();
  };

  const setStatusTab = (status) => setParams((p) => ({ ...p, status, page: 1 }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Membership Requests</h1>
          <p className="text-sm text-gray-500">
            Registrations submitted from the website. Approve a request to create the member and
            membership and send the welcome SMS.
          </p>
        </div>
        <button onClick={refresh} className="border px-3 py-2 rounded text-sm hover:bg-gray-50">
          ↻ Refresh
        </button>
      </div>

      {notice && (
        <div
          className={`mb-3 rounded border px-3 py-2 text-sm ${
            notice.kind === "warning"
              ? "border-yellow-300 bg-yellow-50 text-yellow-800"
              : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          {notice.text}
        </div>
      )}
      {error && (
        <div className="mb-3 flex items-start justify-between rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-500">✕</button>
        </div>
      )}

      {/* status tabs with counts */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {TABS.map(([value, label]) => {
          const count = value ? stats[value] : stats.total;
          const active = params.status === value;
          return (
            <button
              key={label}
              onClick={() => setStatusTab(value)}
              className={`px-4 py-2 rounded border text-sm ${
                active ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
              }`}
            >
              {label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  active ? "bg-white/20" : value === "pending" && count > 0 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {count ?? 0}
              </span>
            </button>
          );
        })}
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search name, phone, email..."
          className="border rounded px-3 py-2 w-72 ml-auto"
        />
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Applicant</th>
              <th className="text-left p-2">Contact</th>
              <th className="text-left p-2">Plan</th>
              <th className="text-left p-2">Start / Payment</th>
              <th className="text-left p-2">Received</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center p-6 text-gray-500">Loading...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="text-center p-6 text-gray-500">No requests</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.Id} className="border-t hover:bg-gray-50 align-top">
                <td className="p-2">
                  <div className="font-medium">{r.fullName}</div>
                  <div className="text-xs text-gray-500">{r.gender} · born {fmtDate(r.dateOfBirth)}</div>
                </td>
                <td className="p-2">
                  <div>{r.phone}</div>
                  <div className="text-xs text-gray-500">{r.email || "—"}</div>
                </td>
                <td className="p-2">
                  <div className="font-medium">{r.planTitle}</div>
                  <div className="text-xs text-gray-500">{r.planPrice || ""}</div>
                </td>
                <td className="p-2">
                  <div>{fmtDate(r.startDate)}</div>
                  <div className="text-xs text-gray-500">{r.paymentMethod}</div>
                </td>
                <td className="p-2 text-xs text-gray-600">{fmtDateTime(r.createdAt)}</td>
                <td className="p-2">
                  <span
                    title={r.rejectReason || ""}
                    className={`inline-block text-xs px-2 py-1 rounded capitalize ${STATUS_STYLE[r.status]}`}
                  >
                    {r.status}
                  </span>
                  {r.status === "approved" && r.memberId && (
                    <div className="mt-1 text-xs text-gray-500">Member #{r.memberId}</div>
                  )}
                </td>
                <td className="p-2 text-right whitespace-nowrap">
                  {r.status === "pending" && (
                    <>
                      <button
                        disabled={busyId === r.Id}
                        onClick={() => setApproveFor(r)}
                        className="bg-green-600 text-white px-3 py-1 rounded mr-2 hover:bg-green-700 disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                      <button
                        disabled={busyId === r.Id}
                        onClick={() => setRejectFor(r)}
                        className="text-red-600 mr-3 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === "rejected" && (
                    <button
                      disabled={busyId === r.Id}
                      onClick={() => reopen(r)}
                      className="text-indigo-600 mr-3 disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                  <button className="text-blue-600 mr-3" onClick={() => setDetails(r)}>
                    Details
                  </button>
                  {r.status !== "approved" && (
                    <button
                      disabled={busyId === r.Id}
                      className="text-gray-500 disabled:opacity-50"
                      onClick={() => remove(r)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          disabled={pagination.page <= 1}
          onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-gray-600">
          Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} total)
        </span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* ===== DETAILS MODAL ===== */}
      {details && (
        <Modal title={`Request #${details.Id} — ${details.fullName}`} onClose={() => setDetails(null)}>
          <div className="mb-3">
            <span className={`inline-block text-xs px-2 py-1 rounded capitalize ${STATUS_STYLE[details.status]}`}>
              {details.status}
            </span>
            {details.status === "approved" && details.memberId && (
              <span className="ml-2 text-sm text-gray-600">
                → Member #{details.memberId}, membership #{details.membershipId}
              </span>
            )}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Detail label="Plan">{details.planTitle} {details.planPrice ? `(${details.planPrice})` : ""}</Detail>
            <Detail label="Start date">{fmtDate(details.startDate)}</Detail>
            <Detail label="Gender">{details.gender}</Detail>
            <Detail label="Date of birth">{fmtDate(details.dateOfBirth)}</Detail>
            <Detail label="Phone">{details.phone}</Detail>
            <Detail label="Email">{details.email}</Detail>
            <Detail label="Address">{details.address}</Detail>
            <Detail label="Payment method">{details.paymentMethod}</Detail>
            <Detail label="Emergency contact">{details.emergencyName}</Detail>
            <Detail label="Emergency phone">{details.emergencyPhone}</Detail>
            <Detail label="Received">{fmtDateTime(details.createdAt)}</Detail>
            {details.status === "rejected" && <Detail label="Reject reason">{details.rejectReason}</Detail>}
          </dl>
          {details.notes && (
            <div className="mt-3 rounded bg-gray-50 p-3 text-sm">
              <div className="text-xs font-semibold uppercase text-gray-500">Notes</div>
              <p className="mt-1 whitespace-pre-wrap">{details.notes}</p>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-4">
            {details.status === "pending" && (
              <>
                <button onClick={() => { setRejectFor(details); setDetails(null); }}
                  className="border border-red-300 text-red-600 px-4 py-2 rounded">Reject</button>
                <button onClick={() => { setApproveFor(details); setDetails(null); }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">✓ Approve</button>
              </>
            )}
            <button onClick={() => setDetails(null)} className="border px-4 py-2 rounded">Close</button>
          </div>
        </Modal>
      )}

      {/* ===== APPROVE MODAL ===== */}
      {approveFor && (
        <ApproveModal request={approveFor} onClose={() => setApproveFor(null)} onDone={afterReview} />
      )}

      {/* ===== REJECT MODAL ===== */}
      {rejectFor && (
        <RejectModal request={rejectFor} onClose={() => setRejectFor(null)} onDone={afterReview} />
      )}
    </div>
  );
}

/* ---------- approve ---------- */
function ApproveModal({ request, onClose, onDone }) {
  const [types, setTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    MembershipTypeId: "",
    ServiceTypeId: "",
    MembershipNo: "",
    RegistryDate: String(request.startDate).slice(0, 10),
    ExpiryDate: addMonths(request.startDate, 1),
  });
  const [sendSms, setSendSms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, s] = await Promise.all([
        membershipTypeApi.list(true).catch(() => null),
        serviceTypeApi.list(true).catch(() => null),
      ]);
      if (cancelled) return;
      const typeList = t?.data || [];
      setTypes(typeList);
      setServices(s?.data || []);
      if (!t && !s) {
        setError("Could not load membership / service types. You can still approve without them.");
      }
      // pre-select the type whose name matches the plan the customer chose
      const match = typeList.find(
        (x) => String(x.Name || "").trim().toLowerCase() === String(request.planTitle).trim().toLowerCase()
      );
      if (match) setForm((f) => ({ ...f, MembershipTypeId: String(match.Id ?? match.id) }));
    })();
    return () => { cancelled = true; };
  }, [request.planTitle]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        RegistryDate: form.RegistryDate,
        ExpiryDate: form.ExpiryDate,
        sendSms,
      };
      if (form.MembershipTypeId) payload.MembershipTypeId = Number(form.MembershipTypeId);
      if (form.ServiceTypeId) payload.ServiceTypeId = Number(form.ServiceTypeId);
      if (form.MembershipNo.trim()) payload.MembershipNo = form.MembershipNo.trim();
      const res = await membershipRequestApi.approve(request.Id, payload);

      const base = res.message || "Request approved.";
      if (!sendSms) {
        onDone(base);
      } else if (res.sms?.sent) {
        onDone(`${base} Welcome SMS sent.`);
      } else {
        onDone(`${base} Welcome SMS not sent: ${res.sms?.reason || "unknown reason"}`, "warning");
      }
    } catch (err) {
      setError(errMsg(err, "Could not approve the request."));
      setSaving(false);
    }
  };

  return (
    <Modal title={`Approve — ${request.fullName}`} onClose={onClose}>
      <div className="mb-3 rounded bg-gray-50 p-3 text-sm">
        <div><span className="text-gray-500">Plan:</span> <b>{request.planTitle}</b> {request.planPrice && `(${request.planPrice})`}</div>
        <div><span className="text-gray-500">Phone:</span> {request.phone} · <span className="text-gray-500">Payment:</span> {request.paymentMethod}</div>
        <div><span className="text-gray-500">Emergency:</span> {request.emergencyName} · {request.emergencyPhone}</div>
        <div className="mt-1 text-xs text-gray-500">
          If a member with this phone number and name already exists, the membership is added to
          that member. Otherwise a new member is created.
        </div>
      </div>

      {error && <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="Membership type" value={form.MembershipTypeId} onChange={set("MembershipTypeId")}
            options={types.map((x) => ({ v: x.Id ?? x.id, l: x.Name }))} />
          <SelectField label="Service type" value={form.ServiceTypeId} onChange={set("ServiceTypeId")}
            options={services.map((x) => ({ v: x.Id ?? x.id, l: x.Name }))} />
        </div>
        <Field label="Membership No (optional)" value={form.MembershipNo} onChange={set("MembershipNo")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Start (registry) date *" type="date" required value={form.RegistryDate} onChange={set("RegistryDate")} />
          <Field label="Expiry date *" type="date" required value={form.ExpiryDate} onChange={set("ExpiryDate")} />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />
          Send welcome SMS to {request.phone}
        </label>

        <div className="flex gap-2 justify-end pt-3">
          <button type="button" onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
          <button disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
            {saving ? "Approving..." : "Approve & create membership"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- reject ---------- */
function RejectModal({ request, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await membershipRequestApi.reject(request.Id, reason.trim());
      onDone(`Request from ${request.fullName} rejected.`);
    } catch (err) {
      setError(errMsg(err, "Could not reject the request."));
      setSaving(false);
    }
  };

  return (
    <Modal title={`Reject — ${request.fullName}`} onClose={onClose}>
      {error && <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-700">Reason (optional)</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
          <button disabled={saving} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50">
            {saving ? "Rejecting..." : "Reject request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- small reusable UI (same look as the Members page) ---------- */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded shadow-lg w-full max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 break-words">{children || "—"}</dd>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <input type={type} required={required} value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border rounded px-3 py-2" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border rounded px-3 py-2">
        <option value="">— none —</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}