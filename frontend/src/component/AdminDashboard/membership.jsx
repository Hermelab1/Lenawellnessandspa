import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  membershipApi,
  membershipTypeApi,
  serviceTypeApi,
  smsTemplateApi,
  smsApi
} from "../Api/apilist"; // adjust path to where your api file lives
import {
  btn,
  inputCls,
  Badge,
  Spinner,
  Field,
  Modal,
  ConfirmDialog,
  Toasts,
  useToasts,
  errMsg,
  toList,
  useDebounce,
} from "./UI/UI";

/* ==========================================================================
   Constants & helpers
   ========================================================================== */
const PAGE_SIZE = 20;

// Must match LINK_BY_EXTERNAL_ID in membershipController.js.
// false: memberships link to the member's Id. true: they need an external_id (synced members only).
const LINK_BY_EXTERNAL_ID = false;

// SMS reminder settings
const REMINDER_CODE = "membership_expiry"; // template `code` from /api/sms/templates
const REMINDER_WINDOW_DAYS = 7; // "expiring soon" = ends within this many days

const EMPTY_MEMBER = { firstName: "", lastName: "", phone: "", email: "" };
const EMPTY_MS = {
  membershipTypeId: "",
  serviceTypeId: "",
  startDate: "",
  endDate: "",
};

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
const toInputDate = (v) => (v ? String(v).slice(0, 10) : "");
const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + Number(days));
  return toISO(d);
};
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
  `${m.firstName} ${m.lastName}`.trim() || m.memberName || "Unnamed";
const initials = (m) =>
  `${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`.toUpperCase() || "?";
const prettyKey = (k) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

// Whole days from today until the given date (negative = already past)
const daysUntil = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d - new Date(`${todayISO()}T00:00:00`)) / 86400000);
};

// Members who should get an expiry reminder: expired, or ending soon
const needsReminder = (m) => {
  if (!m.phone || !m.membershipId || !m.isActive) return false;
  if (m.status === "Expired") return true;
  const left = daysUntil(m.endDate);
  return m.status === "Active" && left !== null && left <= REMINDER_WINDOW_DAYS;
};

// Values for the {{name}}, {{plan}}, {{date}} placeholders
const reminderVars = (m) => ({
  name: m.firstName || fullName(m),
  plan: m.membershipTypeName || "membership",
  date: fmtDate(m.endDate),
});

// The SMS templates endpoint returns { success, data: [...] }; depending on how
// apilist wraps it, we may receive the axios response, that body, or the array.
const extractList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const renderTemplate = (body, vars) =>
  String(body || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

/* ==========================================================================
   Avatar
   ========================================================================== */
const Avatar = ({ member, size = "h-9 w-9" }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [member.id]);
  if (failed) {
    return (
      <span
        className={`${size} inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900`}
        aria-hidden="true"
      >
        {initials(member)}
      </span>
    );
  }
  return (
    <img
      src={membershipApi.imageUrl(member.id)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${size} shrink-0 rounded-full bg-stone-100 object-cover`}
    />
  );
};

/* ==========================================================================
   Member create / edit form
   Creating a member also registers their first membership (header + detail).
   ========================================================================== */
const MemberFormModal = ({ member, types, services, onClose, onSaved, notify }) => {
  const editing = Boolean(member);
  const [form, setForm] = useState(
    member
      ? {
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          email: member.email,
        }
      : EMPTY_MEMBER,
  );
  const [ms, setMs] = useState({ ...EMPTY_MS, startDate: todayISO() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const endTouched = useRef(false);

  const typeById = useMemo(
    () => new Map(types.map((t) => [String(t.id), t])),
    [types],
  );
  const typeOptions = types.filter((t) => t.isActive);
  const serviceOptions = services.filter((s) => s.isActive);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onMsChange = (e) => {
    const { name, value } = e.target;
    if (name === "endDate") endTouched.current = true;
    setMs((prev) => {
      const next = { ...prev, [name]: value };
      if (!endTouched.current) {
        const t = typeById.get(String(next.membershipTypeId));
        if (t?.durationDays > 0 && next.startDate) {
          next.endDate = addDays(next.startDate, t.durationDays);
        }
      }
      return next;
    });
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.firstName.trim()) er.firstName = "First name is required.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      er.email = "Enter a valid email address.";
    if (!editing) {
      if (!ms.membershipTypeId) er.membershipTypeId = "Choose a membership type.";
      if (!ms.startDate) er.startDate = "Choose a start date.";
      if (ms.startDate && ms.endDate && ms.endDate < ms.startDate)
        er.endDate = "End date can't be before the start date.";
    }
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };
    try {
      if (editing) {
        await membershipApi.update(member.id, payload);
      } else {
        await membershipApi.create({
          ...payload,
          membership: {
            membershipTypeId: Number(ms.membershipTypeId),
            serviceTypeId: ms.serviceTypeId ? Number(ms.serviceTypeId) : null,
            startDate: ms.startDate,
            endDate: ms.endDate || ms.startDate,
          },
        });
      }
      notify(editing ? "Member updated." : "Member and membership added.");
      onSaved();
    } catch (err) {
      notify(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Edit member" : "Add member"}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button
            type="button"
            className={btn.secondary}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="member-form"
            className={btn.primary}
            disabled={saving}
          >
            {saving && <Spinner />}
            {editing ? "Save changes" : "Add member"}
          </button>
        </>
      }
    >
      <form id="member-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" error={errors.firstName}>
            <input
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              className={inputCls}
              autoFocus
            />
          </Field>
          <Field label="Last name">
            <input
              name="lastName"
              value={form.lastName}
              onChange={onChange}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Phone">
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={onChange}
            className={inputCls}
            placeholder="+251 9…"
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            className={inputCls}
          />
        </Field>

        {!editing && (
          <fieldset className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <legend className="px-1 text-sm font-semibold text-stone-800">
              Membership
            </legend>
            <Field label="Membership type" error={errors.membershipTypeId}>
              <select
                name="membershipTypeId"
                value={ms.membershipTypeId}
                onChange={onMsChange}
                className={inputCls}
              >
                <option value="">Select a type</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service type (optional)">
              <select
                name="serviceTypeId"
                value={ms.serviceTypeId}
                onChange={onMsChange}
                className={inputCls}
              >
                <option value="">None</option>
                {serviceOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" error={errors.startDate}>
                <input
                  type="date"
                  name="startDate"
                  value={ms.startDate}
                  onChange={onMsChange}
                  className={inputCls}
                />
              </Field>
              <Field
                label="End date"
                error={errors.endDate}
                hint="Filled in from the type's duration when set."
              >
                <input
                  type="date"
                  name="endDate"
                  value={ms.endDate}
                  min={ms.startDate || undefined}
                  onChange={onMsChange}
                  className={inputCls}
                />
              </Field>
            </div>
          </fieldset>
        )}
      </form>
    </Modal>
  );
};

/* ==========================================================================
   Memberships drawer (full history + add/edit + freeze/unfreeze for one member)
   ========================================================================== */
const MembershipsDrawer = ({ member, types, services, onClose, onChanged, notify }) => {
  const synced = !LINK_BY_EXTERNAL_ID || member.externalId != null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(synced);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_MS);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const endTouched = useRef(false);

  const [confirm, setConfirm] = useState(null); // { row, action }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!synced) return;
    setLoading(true);
    setError("");
    try {
      setRows(toList(await membershipApi.getMemberships(member.id)));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [member.id, synced]);

  useEffect(() => {
    load();
  }, [load]);

  const typeById = useMemo(
    () => new Map(types.map((t) => [String(t.id), t])),
    [types],
  );

  // Active options, plus the currently selected one if it has since been deactivated
  const typeOptions = types.filter(
    (t) => t.isActive || String(t.id) === String(form.membershipTypeId),
  );
  const serviceOptions = services.filter(
    (s) => s.isActive || String(s.id) === String(form.serviceTypeId),
  );

  const applyForm = (patch) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!endTouched.current) {
        const t = typeById.get(String(next.membershipTypeId));
        if (t?.durationDays > 0 && next.startDate) {
          next.endDate = addDays(next.startDate, t.durationDays);
        }
      }
      return next;
    });
  };

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    if (name === "endDate") endTouched.current = true;
    applyForm({ [name]: value });
    setFormErrors((er) => ({ ...er, [name]: undefined }));
  };

  const openCreate = () => {
    endTouched.current = false;
    setEditingId(null);
    setForm({ ...EMPTY_MS, startDate: todayISO() });
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (row) => {
    endTouched.current = true;
    setEditingId(row.id);
    setForm({
      membershipTypeId: row.membershipTypeId ?? "",
      serviceTypeId: row.serviceTypeId ?? "",
      startDate: toInputDate(row.startDate),
      endDate: toInputDate(row.endDate),
    });
    setFormErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const validate = () => {
    const er = {};
    if (!form.membershipTypeId) er.membershipTypeId = "Choose a membership type.";
    if (!form.startDate) er.startDate = "Choose a start date.";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      er.endDate = "End date can't be before the start date.";
    setFormErrors(er);
    return Object.keys(er).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      membershipTypeId: Number(form.membershipTypeId),
      serviceTypeId: form.serviceTypeId ? Number(form.serviceTypeId) : null,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
    };
    try {
      if (editingId) await membershipApi.updateMembership(editingId, payload);
      else await membershipApi.createMembership(member.id, payload);
      notify(editingId ? "Membership updated." : "Membership added.");
      closeForm();
      load();
      onChanged?.();
    } catch (err) {
      notify(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.action === "freeze")
        await membershipApi.freezeMembership(confirm.row.id);
      else await membershipApi.unfreezeMembership(confirm.row.id);
      notify(
        confirm.action === "freeze"
          ? "Membership frozen."
          : "Membership unfrozen. Expiry extended by the days it was frozen.",
      );
      setConfirm(null);
      load();
      onChanged?.();
    } catch (err) {
      notify(errMsg(err), "error");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        drawer
        escape={!confirm}
        title={fullName(member)}
        subtitle={[member.phone, member.email].filter(Boolean).join(" · ")}
        onClose={onClose}
      >
        {!synced ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This member hasn't been synced yet, so memberships can't be linked.
            Run a sync from the members page, then try again.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">
                Membership history
              </h3>
              {!showForm && (
                <button type="button" className={btn.primary} onClick={openCreate}>
                  Add membership
                </button>
              )}
            </div>

            {showForm && (
              <form
                onSubmit={onSubmit}
                noValidate
                className="mb-5 space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4"
              >
                <p className="text-sm font-medium text-stone-900">
                  {editingId ? "Edit membership" : "New membership"}
                </p>
                <Field label="Membership type" error={formErrors.membershipTypeId}>
                  <select
                    name="membershipTypeId"
                    value={form.membershipTypeId}
                    onChange={onFieldChange}
                    className={inputCls}
                  >
                    <option value="">Select a type</option>
                    {typeOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {!t.isActive ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Service type (optional)">
                  <select
                    name="serviceTypeId"
                    value={form.serviceTypeId}
                    onChange={onFieldChange}
                    className={inputCls}
                  >
                    <option value="">None</option>
                    {serviceOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {!s.isActive ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start date" error={formErrors.startDate}>
                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={onFieldChange}
                      className={inputCls}
                    />
                  </Field>
                  <Field
                    label="End date"
                    error={formErrors.endDate}
                    hint="Filled in from the type's duration when set."
                  >
                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={onFieldChange}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={btn.secondary}
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={btn.primary} disabled={saving}>
                    {saving && <Spinner />}
                    {editingId ? "Save changes" : "Add membership"}
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-stone-500">
                <Spinner /> Loading memberships…
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}{" "}
                <button type="button" className={btn.link} onClick={load}>
                  Try again
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-300 px-4 py-10 text-center">
                <p className="text-sm font-medium text-stone-800">
                  No memberships yet
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Add the first membership for {member.firstName || "this member"}.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-stone-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {r.membershipTypeName || "Membership"}
                          {r.serviceTypeName && (
                            <span className="font-normal text-stone-500">
                              {" "}
                              · {r.serviceTypeName}
                            </span>
                          )}
                        </p>
                        {r.membershipNo && (
                          <p className="text-xs text-stone-500">
                            No. {r.membershipNo}
                          </p>
                        )}
                      </div>
                      <Badge label={r.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-stone-500">Starts</dt>
                        <dd className="text-stone-800">{fmtDate(r.startDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-stone-500">Expires</dt>
                        <dd className="text-stone-800">{fmtDate(r.endDate)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex items-center gap-4 border-t border-stone-100 pt-3">
                      <button
                        type="button"
                        className={btn.link}
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </button>
                      {r.isFrozen ? (
                        <button
                          type="button"
                          className={btn.link}
                          onClick={() => setConfirm({ row: r, action: "unfreeze" })}
                        >
                          Unfreeze
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={btn.link}
                          onClick={() => setConfirm({ row: r, action: "freeze" })}
                        >
                          Freeze
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>

      {confirm && (
        <ConfirmDialog
          title={
            confirm.action === "freeze" ? "Freeze membership?" : "Unfreeze membership?"
          }
          message={
            confirm.action === "freeze"
              ? "The membership will be paused from today. You can unfreeze it at any time."
              : "The membership will resume today and its expiry date will be extended by the number of days it was frozen."
          }
          confirmLabel={confirm.action === "freeze" ? "Freeze" : "Unfreeze"}
          busy={busy}
          onConfirm={runConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
};

/* ==========================================================================
   Sync panel
   ========================================================================== */
const SyncPanel = ({ status, syncing, onSync, onReset, onClose }) => {
  const entries = Object.entries(status || {}).filter(
    ([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v),
  );
  return (
    <Modal
      title="Member sync"
      subtitle="Pull members from the external system."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={btn.secondary}
            onClick={onReset}
            disabled={syncing}
          >
            Reset sync
          </button>
          <button
            type="button"
            className={btn.primary}
            onClick={onSync}
            disabled={syncing}
          >
            {syncing && <Spinner />}
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </>
      }
    >
      {entries.length === 0 ? (
        <p className="text-sm text-stone-500">No sync status available yet.</p>
      ) : (
        <dl className="divide-y divide-stone-100 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-stone-500">{prettyKey(k)}</dt>
              <dd className="text-right font-medium text-stone-900">
                {typeof v === "boolean"
                  ? v
                    ? "Yes"
                    : "No"
                  : /^\d{4}-\d{2}-\d{2}T/.test(String(v))
                    ? new Date(v).toLocaleString()
                    : String(v ?? "—")}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
};

/* ==========================================================================
   Page
   ========================================================================== */
const Membership = () => {
  const { toasts, push, dismiss } = useToasts();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all"); // member active / inactive
  const [msFilter, setMsFilter] = useState("all"); // latest membership status

  const [types, setTypes] = useState([]);
  const [services, setServices] = useState([]);

  const [memberModal, setMemberModal] = useState(null); // { member|null }
  const [drawerMember, setDrawerMember] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // SMS reminders
  const [smsTemplate, setSmsTemplate] = useState(null);
  const [reminderTargets, setReminderTargets] = useState(null); // member[] | null
  const [reminderBusy, setReminderBusy] = useState(false);

  const reqId = useRef(0);

  const loadMembers = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    try {
      const data = await membershipApi.list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
      });
      if (id === reqId.current) setMembers(toList(data));
    } catch (e) {
      if (id === reqId.current) setError(errMsg(e));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const loadLookups = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        membershipTypeApi.list(false),
        serviceTypeApi.list(false),
      ]);
      setTypes(toList(t));
      setServices(toList(s));
    } catch (e) {
      push(`Couldn't load membership or service types: ${errMsg(e)}`, "error");
    }
  }, [push]);

  const loadSyncStatus = useCallback(async () => {
    try {
      setSyncStatus(await membershipApi.status());
    } catch {
      setSyncStatus(null);
    }
  }, []);

  const loadSmsTemplate = useCallback(async () => {
    try {
      const list = extractList(await smsTemplateApi.list());
      setSmsTemplate(
        list.find((t) => t.code === REMINDER_CODE && t.isActive) || null,
      );
    } catch (e) {
      setSmsTemplate(null);
      push(`Couldn't load SMS template: ${errMsg(e)}`, "error");
    }
  }, [push]);

  useEffect(() => {
    loadLookups();
    loadSyncStatus();
    loadSmsTemplate();
  }, [loadLookups, loadSyncStatus, loadSmsTemplate]);

  const visible = useMemo(
    () =>
      members.filter((m) => {
        if (statusFilter === "active" && !m.isActive) return false;
        if (statusFilter === "inactive" && m.isActive) return false;
        if (msFilter !== "all" && m.status !== msFilter) return false;
        return true;
      }),
    [members, statusFilter, msFilter],
  );

  // Members on screen who are expired or expiring soon (and have a phone)
  const remindable = useMemo(() => visible.filter(needsReminder), [visible]);

  const onSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await membershipApi.syncNow();
      push("Sync finished.");
      await Promise.all([loadMembers(), loadSyncStatus()]);
    } catch (e) {
      push(errMsg(e), "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleResetSync = async () => {
    setSyncing(true);
    try {
      await membershipApi.reset();
      push("Sync reset.");
      setResetConfirm(false);
      await loadSyncStatus();
    } catch (e) {
      push(errMsg(e), "error");
      setResetConfirm(false);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivating) return;
    setDeactivateBusy(true);
    try {
      await membershipApi.deactivate(deactivating.id);
      push(`${fullName(deactivating)} deactivated.`);
      setDeactivating(null);
      loadMembers();
    } catch (e) {
      push(errMsg(e), "error");
      setDeactivating(null);
    } finally {
      setDeactivateBusy(false);
    }
  };

  const handleSendReminders = async () => {
    if (!reminderTargets?.length || !smsTemplate) return;
    setReminderBusy(true);
    // Render the template per member, then send via POST /sms/send
    const results = await Promise.allSettled(
      reminderTargets.map((m) =>
        smsApi.send({
          phone: m.phone,
          message: renderTemplate(smsTemplate.body, reminderVars(m)),
        }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    if (failed === 0) {
      push(`Reminder sent to ${ok} member${ok === 1 ? "" : "s"}.`);
    } else {
      const firstErr = results.find((r) => r.status === "rejected");
      push(
        `Sent ${ok}, failed ${failed}. ${errMsg(firstErr?.reason)}`,
        "error",
      );
    }
    setReminderBusy(false);
    setReminderTargets(null);
  };

  const hasNext = members.length === PAGE_SIZE;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Members</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage members and their latest membership.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={btn.secondary}
            onClick={() => {
              loadSyncStatus();
              setSyncOpen(true);
            }}
          >
            {syncing && <Spinner />}
            Sync
          </button>
          <button
            type="button"
            className={btn.primary}
            onClick={() => setMemberModal({ member: null })}
          >
            Add member
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.48l4.31 4.3a1 1 0 01-1.4 1.42l-4.32-4.31A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={onSearchChange}
            placeholder="Search by name, phone or email"
            aria-label="Search members"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by member status"
          className={`${inputCls} w-auto`}
        >
          <option value="all">All members</option>
          <option value="active">Active members</option>
          <option value="inactive">Inactive members</option>
        </select>
        <select
          value={msFilter}
          onChange={(e) => setMsFilter(e.target.value)}
          aria-label="Filter by membership status"
          className={`${inputCls} w-auto`}
        >
          <option value="all">Any membership</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Frozen">Frozen</option>
          <option value="None">No membership</option>
        </select>
        <button
          type="button"
          className={`${btn.secondary} ml-auto whitespace-nowrap`}
          disabled={!smsTemplate || remindable.length === 0 || loading}
          title={
            !smsTemplate
              ? "Membership expiry SMS template not found or inactive"
              : remindable.length === 0
                ? "No expired or soon-to-expire members with a phone number on this page"
                : `Text ${remindable.length} member${remindable.length === 1 ? "" : "s"} on this page`
          }
          onClick={() => setReminderTargets(remindable)}
        >
          Send reminders ({remindable.length})
        </button>
      </div>

      {error && (
        <div
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}{" "}
          <button type="button" className={btn.link} onClick={loadMembers}>
            Try again
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Phone</th>
                <th className="hidden px-4 py-3 lg:table-cell">Email</th>
                <th className="px-4 py-3">Membership</th>
                <th className="hidden px-4 py-3 md:table-cell">Starts</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading && members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-500">
                    <span className="inline-flex items-center gap-2">
                      <Spinner /> Loading members…
                    </span>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="font-medium text-stone-800">No members found</p>
                    <p className="mt-1 text-stone-500">
                      {debouncedSearch
                        ? "Try a different search."
                        : "Add a member or run a sync to bring members in."}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((m) => (
                  <tr
                    key={m.id}
                    className={`hover:bg-stone-50 ${loading ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar member={m} />
                        <button
                          type="button"
                          onClick={() => setDrawerMember(m)}
                          className="truncate rounded text-left font-medium text-stone-900 hover:text-emerald-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
                        >
                          {fullName(m)}
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                      {m.phone || "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-stone-700 lg:table-cell">
                      {m.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {m.membershipId ? (
                        <div className="min-w-0">
                          <p className="truncate font-medium text-stone-900">
                            {m.membershipTypeName || "Membership"}
                            {m.serviceTypeName && (
                              <span className="font-normal text-stone-500">
                                {" "}
                                · {m.serviceTypeName}
                              </span>
                            )}
                          </p>
                          {m.membershipNo && (
                            <p className="text-xs text-stone-500">
                              No. {m.membershipNo}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-stone-700 md:table-cell">
                      {fmtDate(m.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                      {fmtDate(m.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge label={m.status} />
                        {!m.isActive && <Badge label="Inactive" />}
                        {LINK_BY_EXTERNAL_ID && m.externalId == null && (
                          <Badge label="Not synced" />
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-4">
                        {smsTemplate && needsReminder(m) && (
                          <button
                            type="button"
                            className={btn.link}
                            onClick={() => setReminderTargets([m])}
                          >
                            Remind
                          </button>
                        )}
                        <button
                          type="button"
                          className={btn.link}
                          onClick={() => setDrawerMember(m)}
                        >
                          History
                        </button>
                        <button
                          type="button"
                          className={btn.link}
                          onClick={() => setMemberModal({ member: m })}
                        >
                          Edit
                        </button>
                        {m.isActive && (
                          <button
                            type="button"
                            className="rounded text-sm font-medium text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/40"
                            onClick={() => setDeactivating(m)}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
          <span>
            Page {page}
            {visible.length > 0 && ` · ${visible.length} shown`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn.secondary}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </button>
            <button
              type="button"
              className={btn.secondary}
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || loading}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {memberModal && (
        <MemberFormModal
          member={memberModal.member}
          types={types}
          services={services}
          notify={push}
          onClose={() => setMemberModal(null)}
          onSaved={() => {
            setMemberModal(null);
            loadMembers();
          }}
        />
      )}

      {drawerMember && (
        <MembershipsDrawer
          member={drawerMember}
          types={types}
          services={services}
          notify={push}
          onChanged={loadMembers}
          onClose={() => setDrawerMember(null)}
        />
      )}

      {syncOpen && (
        <SyncPanel
          status={syncStatus}
          syncing={syncing}
          onSync={handleSync}
          onReset={() => setResetConfirm(true)}
          onClose={() => setSyncOpen(false)}
        />
      )}

      {resetConfirm && (
        <ConfirmDialog
          danger
          title="Reset sync?"
          message="This clears the sync state, so the next sync starts from scratch. Existing members are not deleted."
          confirmLabel="Reset sync"
          busy={syncing}
          onConfirm={handleResetSync}
          onCancel={() => setResetConfirm(false)}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          danger
          title="Deactivate member?"
          message={`${fullName(deactivating)} will be marked inactive. Their membership history is kept.`}
          confirmLabel="Deactivate"
          busy={deactivateBusy}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivating(null)}
        />
      )}

      {reminderTargets && smsTemplate && (
        <ConfirmDialog
          title={
            reminderTargets.length === 1
              ? `Send reminder to ${fullName(reminderTargets[0])}?`
              : `Send reminders to ${reminderTargets.length} members?`
          }
          message={`Message preview: "${renderTemplate(
            smsTemplate.body,
            reminderVars(reminderTargets[0]),
          )}"`}
          confirmLabel="Send SMS"
          busy={reminderBusy}
          onConfirm={handleSendReminders}
          onCancel={() => setReminderTargets(null)}
        />
      )}

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default Membership;