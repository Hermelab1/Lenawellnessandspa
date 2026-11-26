import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  btn,
  inputCls,
  Badge,
  Spinner,
  Switch,
  Field,
  Modal,
  ConfirmDialog,
  Toasts,
  useToasts,
  errMsg,
  toList,
} from "./UI";

const EMPTY = {
  name: "",
  description: "",
  price: "",
  durationDays: "",
  isActive: true,
};

const fmtPrice = (v) =>
  Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* --------------------------------------------------------------------------
   Icons
   -------------------------------------------------------------------------- */
const PencilIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";
const iconBtnCls = {
  edit: `${iconBtn} text-stone-600 hover:bg-stone-100 hover:text-emerald-800 focus-visible:ring-emerald-700/40`,
  danger: `${iconBtn} text-stone-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-700/40`,
};

/* --------------------------------------------------------------------------
   Create / edit form
   -------------------------------------------------------------------------- */
const LookupForm = ({ item, singular, withPricing, api, onClose, onSaved, notify }) => {
  const editing = Boolean(item);
  const [form, setForm] = useState(
    item
      ? {
          name: item.name ?? "",
          description: item.description ?? "",
          price: item.price ?? "",
          durationDays: item.durationDays ?? "",
          isActive: item.isActive ?? true,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = "Name is required.";
    if (withPricing) {
      if (form.price !== "" && Number(form.price) < 0)
        er.price = "Price can't be negative.";
      if (
        form.durationDays !== "" &&
        (!Number.isInteger(Number(form.durationDays)) ||
          Number(form.durationDays) < 0)
      )
        er.durationDays = "Enter a whole number of days.";
    }
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
      ...(withPricing && {
        price: form.price === "" ? 0 : Number(form.price),
        durationDays: form.durationDays === "" ? 0 : Number(form.durationDays),
      }),
    };
    try {
      if (editing) await api.update(item.id, payload);
      else await api.create(payload);
      notify(editing ? `${singular} updated.` : `${singular} added.`);
      onSaved();
    } catch (err) {
      notify(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="lookup-form" className={btn.primary} disabled={saving}>
            {saving && <Spinner />}
            {editing ? "Save changes" : `Add ${singular.toLowerCase()}`}
          </button>
        </>
      }
    >
      <form id="lookup-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Name" error={errors.name}>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className={inputCls}
            autoFocus
          />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            rows={3}
            value={form.description}
            onChange={onChange}
            className={inputCls}
          />
        </Field>
        {withPricing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" error={errors.price}>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={onChange}
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field
              label="Duration (days)"
              error={errors.durationDays}
              hint="Used to fill the end date of new memberships."
            >
              <input
                name="durationDays"
                type="number"
                min="0"
                step="1"
                value={form.durationDays}
                onChange={onChange}
                className={inputCls}
                placeholder="30"
              />
            </Field>
          </div>
        )}
        <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-stone-800">Active</p>
            <p className="text-xs text-stone-500">
              Inactive entries can't be chosen for new memberships.
            </p>
          </div>
          <Switch
            checked={form.isActive}
            onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            label="Active"
          />
        </div>
      </form>
    </Modal>
  );
};

/* --------------------------------------------------------------------------
   Page
   -------------------------------------------------------------------------- */
const LookupManager = ({
  title,
  singular,
  subtitle,
  api,
  withPricing = false,
}) => {
  const { toasts, push, dismiss } = useToasts();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null); // { item|null }
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(toList(await api.list(activeOnly)));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [api, activeOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const activeCount = items.filter((i) => i.isActive).length;
  const colSpan = withPricing ? 5 : 3;

  const toggleActive = async (item) => {
    setTogglingId(item.id);
    try {
      // The update route replaces every field, so send the full record back.
      await api.update(item.id, {
        name: item.name,
        description: item.description || "",
        isActive: !item.isActive,
        ...(withPricing && {
          price: item.price,
          durationDays: item.durationDays,
        }),
      });
      push(`${item.name} ${item.isActive ? "deactivated" : "activated"}.`);
      await load();
    } catch (e) {
      push(errMsg(e), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.remove(deleting.id);
      push(`${deleting.name} deleted.`);
      setDeleting(null);
      load();
    } catch (e) {
      push(errMsg(e), "error");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        </div>
        <button
          type="button"
          className={btn.primary}
          onClick={() => setModal({ item: null })}
        >
          Add {singular.toLowerCase()}
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}`}
          aria-label={`Search ${title.toLowerCase()}`}
          className={`${inputCls} sm:max-w-xs`}
        />
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <Switch
            checked={activeOnly}
            onChange={setActiveOnly}
            label="Show active only"
          />
          Active only
        </label>
        {!loading && !error && (
          <span className="ml-auto text-sm text-stone-500">
            {items.length} total · {activeCount} active
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}{" "}
          <button type="button" className={btn.link} onClick={load}>
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
                <th className="px-4 py-3">Name</th>
                {withPricing && <th className="px-4 py-3 text-right">Price</th>}
                {withPricing && <th className="px-4 py-3">Duration</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center text-stone-500">
                    <span className="inline-flex items-center gap-2">
                      <Spinner /> Loading…
                    </span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center">
                    <p className="font-medium text-stone-800">
                      No {title.toLowerCase()} found
                    </p>
                    <p className="mt-1 text-stone-500">
                      {search
                        ? "Try a different search."
                        : `Add your first ${singular.toLowerCase()} to get started.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr
                    key={i.id}
                    className={`hover:bg-stone-50 ${loading ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{i.name}</p>
                      {i.description && (
                        <p className="mt-0.5 max-w-md truncate text-stone-500">
                          {i.description}
                        </p>
                      )}
                    </td>
                    {withPricing && (
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-stone-800">
                        {fmtPrice(i.price)}
                      </td>
                    )}
                    {withPricing && (
                      <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                        {i.durationDays > 0 ? `${i.durationDays} days` : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={i.isActive}
                          disabled={togglingId === i.id}
                          onChange={() => toggleActive(i)}
                          label={`${i.isActive ? "Deactivate" : "Activate"} ${i.name}`}
                        />
                        <Badge label={i.isActive ? "Active" : "Inactive"} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className={iconBtnCls.edit}
                          onClick={() => setModal({ item: i })}
                          aria-label={`Edit ${i.name}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className={iconBtnCls.danger}
                          onClick={() => setDeleting(i)}
                          aria-label={`Delete ${i.name}`}
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <LookupForm
          item={modal.item}
          singular={singular}
          withPricing={withPricing}
          api={api}
          notify={push}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          danger
          title={`Delete ${singular.toLowerCase()}?`}
          message={`"${deleting.name}" will be removed. If it's used by existing memberships, deactivate it instead.`}
          confirmLabel="Delete"
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default LookupManager;