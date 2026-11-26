import React, { useEffect, useMemo, useState, useCallback } from "react";
import { smsApi } from "../Api/apilist";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 25;

const STATUS_STYLES = {
  sent:     "bg-green-100 text-green-700 border-green-200",
  delivered:"bg-green-100 text-green-700 border-green-200",
  failed:   "bg-red-100 text-red-700 border-red-200",
  invalid:  "bg-amber-100 text-amber-700 border-amber-200",
  disabled: "bg-gray-100 text-gray-600 border-gray-200",
  unknown:  "bg-slate-100 text-slate-600 border-slate-200",
};

const badge = (status) => {
  const cls = STATUS_STYLES[String(status || "").toLowerCase()] || STATUS_STYLES.unknown;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status || "unknown"}
    </span>
  );
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
};

const safeJson = (v) => {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Row detail modal                                                   */
/* ------------------------------------------------------------------ */
function DetailModal({ row, onClose }) {
  if (!row) return null;

  const provider = safeJson(row.providerResponse);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            SMS Log #{row.id}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type" value={row.Type} />
          <Field label="Status" value={badge(row.status)} />
          <Field label="Phone" value={row.Phone} />
          <Field label="Provider Log ID" value={row.providerLogId || "—"} />
          <Field label="Last Synced" value={fmtDate(row.lastSyncedAt)} />
          <Field label="Created" value={fmtDate(row.createdAt)} />
        </dl>

        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Message</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {row.Message || "—"}
          </pre>
        </div>

        {row.errorDetail && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase text-red-500">Error</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-red-50 p-3 text-sm text-red-700">
              {String(row.errorDetail)}
            </pre>
          </div>
        )}

        {provider && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Provider Response</p>
            <pre className="max-h-60 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(provider, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
const SmsSyncLog = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);           // 0-based
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // NOTE: your backend currently accepts only limit & offset.
      // If you later add `search` & `status` query params on the server,
      // pass them here and the UI will just work.
      const res = await smsApi.synclog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      // Backend returns: { success, total, limit, offset, data: [...] }
      setRows(res?.data || []);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error("[SMS SyncLog] fetch failed", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load sync logs."
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* Client-side filtering (works with current backend that returns a page) */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus =
        statusFilter === "all" ||
        String(r.status || "").toLowerCase() === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        String(r.Phone || "").toLowerCase().includes(q) ||
        String(r.Message || "").toLowerCase().includes(q) ||
        String(r.Type || "").toLowerCase().includes(q) ||
        String(r.providerLogId || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = useMemo(() => {
    const c = { sent: 0, failed: 0, invalid: 0, other: 0 };
    rows.forEach((r) => {
      const s = String(r.status || "").toLowerCase();
      if (s === "sent" || s === "delivered") c.sent++;
      else if (s === "failed") c.failed++;
      else if (s === "invalid") c.invalid++;
      else c.other++;
    });
    return c;
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">SMS Sync Log</h1>
            <p className="text-sm text-slate-500">
              History of every SMS the system has attempted.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={total} tone="slate" />
          <StatCard label="Sent (this page)" value={stats.sent} tone="green" />
          <StatCard label="Failed (this page)" value={stats.failed} tone="red" />
          <StatCard label="Invalid (this page)" value={stats.invalid} tone="amber" />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search phone, message, type, log id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="invalid">Invalid</option>
            <option value="disabled">Disabled</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Message</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Provider Log</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      No SMS logs found.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-3 py-2 text-slate-500">{r.id}</td>
                    <td className="px-3 py-2 text-slate-700">{r.Type || "—"}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{r.Phone || "—"}</td>
                    <td
                      className="max-w-xs truncate px-3 py-2 text-slate-600"
                      title={r.Message || ""}
                    >
                      {r.Message || "—"}
                    </td>
                    <td className="px-3 py-2">{badge(r.status)}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">
                      {r.providerLogId || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(r);
                        }}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span>
              Showing{" "}
              <b>{total === 0 ? 0 : page * PAGE_SIZE + 1}</b>–
              <b>{Math.min((page + 1) * PAGE_SIZE, total)}</b> of <b>{total}</b>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-xs">
                Page {page + 1} / {totalPages}
              </span>
              <button
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <DetailModal row={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
function StatCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-800",
    green: "border-green-200 bg-green-50 text-green-800",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default SmsSyncLog;