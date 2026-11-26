import React, { useCallback, useEffect, useRef, useState } from 'react'
import { reservationApi } from '../Api/apilist' // adjust this path to where the file lives in your admin app

/* =====================================================
   Constants & helpers
===================================================== */
const PAGE_SIZES = [10, 20, 50]

const STATUS_META = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-100 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  confirmed: {
    label: 'Approved',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-sky-100 text-sky-800 ring-sky-200',
    dot: 'bg-sky-500',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-rose-100 text-rose-800 ring-rose-200',
    dot: 'bg-rose-500',
  },
}

const SOURCE_LABEL = {
  form: 'Reservation form',
  package: 'Package popup',
  service: 'Service popup',
}

const emptyStats = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, total: 0 }

const errMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback

const todayLocal = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// "2026-11-03" -> "Tue, Nov 3, 2026" (parsed by parts so the time zone never shifts the day)
const formatDate = (value) => {
  if (!value) return '—'
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return String(value)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// "14:30:00" -> "2:30 PM"
const formatTime = (value) => {
  if (!value) return ''
  const [h, m] = String(value).split(':').map(Number)
  if (Number.isNaN(h)) return String(value)
  const d = new Date()
  d.setHours(h, m || 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—'

/* =====================================================
   Small UI pieces
===================================================== */
const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

const TypeBadge = ({ type }) => (
  <span
    className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
      type === 'spa' ? 'bg-[#0B2545] text-[#A3E635]' : 'bg-[#A3E635]/30 text-[#365314]'
    }`}
  >
    {type === 'spa' ? 'Spa' : 'Beauty'}
  </span>
)

const Toast = ({ toast, onClose }) => {
  if (!toast) return null
  const isError = toast.kind === 'error'
  return (
    <div
      role="status"
      className={`fixed right-4 top-4 z-[200] flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl ${
        isError ? 'bg-rose-600 text-white' : 'bg-[#0B2545] text-white'
      }`}
    >
      <span className={isError ? '' : 'text-[#A3E635]'}>{isError ? '!' : '✓'}</span>
      <span className="flex-1">{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
        ×
      </button>
    </div>
  )
}

const Modal = ({ title, onClose, children, footer, wide = false }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-[#0B2545]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

// Status action buttons, shared by the table rows and the details modal
const ActionButtons = ({ item, busy, onApprove, onComplete, onCancel, onReopen }) => {
  const base =
    'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.status === 'pending' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onApprove(item)}
          className={`${base} bg-[#A3E635] text-[#0B2545] hover:bg-[#bef264]`}
        >
          {busy ? 'Approving…' : '✓ Approve'}
        </button>
      )}
      {item.status === 'confirmed' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onComplete(item)}
          className={`${base} bg-[#0B2545] text-white hover:bg-[#13315c]`}
        >
          Mark completed
        </button>
      )}
      {(item.status === 'pending' || item.status === 'confirmed') && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(item)}
          className={`${base} border border-rose-300 bg-white text-rose-700 hover:bg-rose-50`}
        >
          Cancel
        </button>
      )}
      {item.status === 'cancelled' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onReopen(item)}
          className={`${base} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        >
          Reopen
        </button>
      )}
    </div>
  )
}

const Detail = ({ label, children }) => (
  <div>
    <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-[#0B2545]">{children || '—'}</dd>
  </div>
)

/* =====================================================
   PAGE
===================================================== */
const Reservation = () => {
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [stats, setStats] = useState(emptyStats)

  const [filters, setFilters] = useState({ type: '', status: '', date: '', search: '' })
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const [selected, setSelected] = useState(null) // details modal
  const [confirm, setConfirm] = useState(null) // { kind: 'cancel' | 'delete', item }

  const reqId = useRef(0)

  const notify = useCallback(
    (message, kind = 'success') => setToast({ message, kind, id: Date.now() }),
    []
  )

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim() }))
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  /* ---------- data loading ---------- */
  const load = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const params = { page, limit }
      if (filters.type) params.type = filters.type
      if (filters.status) params.status = filters.status
      if (filters.date) params.date = filters.date
      if (filters.search) params.search = filters.search

      const res = await reservationApi.list(params)
      if (id !== reqId.current) return // a newer request replaced this one

      if (res?.success) {
        const data = res.data || []
        setRows(data)
        setPagination(res.pagination || { total: data.length, page, limit, pages: 1 })
        // e.g. the last item on the last page was deleted -> go back one page
        if (data.length === 0 && page > 1) setPage((p) => p - 1)
      } else {
        notify(res?.message || 'Could not load reservations.', 'error')
      }
    } catch (err) {
      if (id === reqId.current) notify(errMsg(err, 'Could not load reservations.'), 'error')
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [page, limit, filters, notify])

  const loadStats = useCallback(async () => {
    try {
      const res = await reservationApi.stats(filters.type ? { type: filters.type } : undefined)
      if (res?.success) setStats({ ...emptyStats, ...res.data })
    } catch {
      /* the stat cards are optional - ignore errors */
    }
  }, [filters.type])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const refresh = () => Promise.all([load(), loadStats()])

  /* ---------- actions ---------- */
  const changeStatus = async (item, status, successMessage) => {
    setBusyId(item.Id)
    try {
      const res = await reservationApi.updateStatus(item.Id, status)
      if (res?.success) {
        // When approving, the server also sends an SMS and reports the result
        if (status === 'confirmed' && res.sms) {
          if (res.sms.sent) {
            notify(`${successMessage} SMS sent to the customer.`)
          } else {
            notify(`${successMessage} SMS not sent: ${res.sms.reason}`, 'error')
          }
        } else {
          notify(successMessage)
        }
        setSelected((s) => (s && s.Id === item.Id ? res.data : s))
        await refresh()
      } else {
        notify(res?.message || 'Could not update the reservation.', 'error')
      }
    } catch (err) {
      notify(errMsg(err, 'Could not update the reservation.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const approve = (item) => changeStatus(item, 'confirmed', `Reservation for ${item.name} approved.`)
  const complete = (item) => changeStatus(item, 'completed', `Reservation for ${item.name} marked completed.`)
  const reopen = (item) => changeStatus(item, 'pending', `Reservation for ${item.name} reopened.`)
  const askCancel = (item) => setConfirm({ kind: 'cancel', item })
  const askDelete = (item) => setConfirm({ kind: 'delete', item })

  const runConfirm = async () => {
    if (!confirm) return
    const { kind, item } = confirm
    setConfirm(null)
    if (kind === 'cancel') {
      await changeStatus(item, 'cancelled', `Reservation for ${item.name} cancelled.`)
      return
    }
    setBusyId(item.Id)
    try {
      const res = await reservationApi.remove(item.Id)
      if (res?.success) {
        notify('Reservation deleted.')
        setSelected(null)
        await refresh()
      } else {
        notify(res?.message || 'Could not delete the reservation.', 'error')
      }
    } catch (err) {
      notify(errMsg(err, 'Could not delete the reservation.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  /* ---------- filter helpers ---------- */
  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }
  const clearFilters = () => {
    setFilters({ type: '', status: '', date: '', search: '' })
    setSearchInput('')
    setPage(1)
  }
  const hasFilters = Boolean(filters.type || filters.status || filters.date || filters.search)

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const to = Math.min(pagination.page * pagination.limit, pagination.total)

  const field =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0B2545] outline-none transition focus:border-[#0B2545] focus:ring-2 focus:ring-[#A3E635]/50'

  /* ---------- render ---------- */
  return (
    <div className="p-4 sm:p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545]">Reservations</h1>
          <p className="text-sm text-gray-500">
            Review and approve bookings from the Spa and Beauty Salon pages.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#0B2545] hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Stat cards (click to filter by status) */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const active = filters.status === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter('status', active ? '' : key)}
              className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                active ? 'border-[#0B2545] bg-[#0B2545] text-white' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <span className={active ? 'text-white/80' : 'text-gray-500'}>{meta.label}</span>
              </div>
              <div className={`mt-2 text-3xl font-bold ${active ? 'text-[#A3E635]' : 'text-[#0B2545]'}`}>
                {stats[key] ?? 0}
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
          {[
            ['', 'All'],
            ['spa', 'Spa'],
            ['beauty', 'Beauty'],
          ].map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setFilter('type', value)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                filters.type === value
                  ? 'bg-[#0B2545] text-[#A3E635]'
                  : 'bg-white text-[#0B2545] hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className={field}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilter('date', e.target.value)}
            className={field}
            aria-label="Filter by date"
          />
          <button
            type="button"
            onClick={() => setFilter('date', todayLocal())}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-[#0B2545] hover:bg-gray-50"
          >
            Today
          </button>
        </div>

        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name, email or phone…"
          className={`${field} min-w-[14rem] flex-1`}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-rose-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className={`overflow-x-auto transition-opacity ${loading && rows.length ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Specialist</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((item) => (
                <tr key={item.Id} className="align-top hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#0B2545]">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.phone}</div>
                    <div className="text-xs text-gray-500">{item.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={item.type} />
                    <div className="mt-1 text-[#0B2545]">{item.serviceName || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-[#0B2545]">
                    {item.staffName || <span className="text-gray-400">Any available</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#0B2545]">{formatDate(item.date)}</div>
                    <div className="text-xs text-gray-500">
                      {formatTime(item.time)}
                      {item.hours ? ` · ${item.hours} ${item.hours === 1 ? 'hour' : 'hours'}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <ActionButtons
                        item={item}
                        busy={busyId === item.Id}
                        onApprove={approve}
                        onComplete={complete}
                        onCancel={askCancel}
                        onReopen={reopen}
                      />
                      <div className="flex gap-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="text-[#0B2545] hover:underline"
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.Id}
                          onClick={() => askDelete(item)}
                          className="text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && rows.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545]/20 border-t-[#A3E635]" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-500">
            {hasFilters ? 'No reservations match your filters.' : 'No reservations yet.'}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
          <div>
            {pagination.total > 0 ? `Showing ${from}–${to} of ${pagination.total}` : 'No results'}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              Rows
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className={`${field} py-1`}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-[#0B2545] hover:bg-gray-50 disabled:opacity-40"
            >
              ‹ Prev
            </button>
            <span>
              Page {pagination.page} of {Math.max(pagination.pages, 1)}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.pages || loading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-[#0B2545] hover:bg-gray-50 disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <Modal
          wide
          title={`Reservation #${selected.Id}`}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ActionButtons
                item={selected}
                busy={busyId === selected.Id}
                onApprove={approve}
                onComplete={complete}
                onCancel={askCancel}
                onReopen={reopen}
              />
              <button
                type="button"
                onClick={() => askDelete(selected)}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Delete
              </button>
            </div>
          }
        >
          <div className="mb-4 flex items-center gap-2">
            <TypeBadge type={selected.type} />
            <StatusBadge status={selected.status} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Customer">{selected.name}</Detail>
            <Detail label="Phone">
              <a href={`tel:${selected.phone}`} className="underline">
                {selected.phone}
              </a>
            </Detail>
            <Detail label="Email">
              <a href={`mailto:${selected.email}`} className="underline">
                {selected.email}
              </a>
            </Detail>
            <Detail label="Service / package">{selected.serviceName}</Detail>
            <Detail label={selected.type === 'spa' ? 'Therapist' : 'Expert'}>
              {selected.staffName || 'Any available'}
            </Detail>
            <Detail label="Booked from">{SOURCE_LABEL[selected.source] || selected.source}</Detail>
            <Detail label="Date">{formatDate(selected.date)}</Detail>
            <Detail label="Time">{formatTime(selected.time)}</Detail>
            {selected.type === 'spa' && (
              <Detail label="Duration">
                {selected.hours ? `${selected.hours} ${selected.hours === 1 ? 'hour' : 'hours'}` : ''}
              </Detail>
            )}
            <Detail label="Received">{formatDateTime(selected.createdAt)}</Detail>
          </dl>
          {selected.message && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Customer note
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#0B2545]">{selected.message}</p>
            </div>
          )}
        </Modal>
      )}

      {/* Confirm cancel / delete */}
      {confirm && (
        <Modal
          title={confirm.kind === 'delete' ? 'Delete reservation?' : 'Cancel reservation?'}
          onClose={() => setConfirm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#0B2545] hover:bg-gray-50"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={runConfirm}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                {confirm.kind === 'delete' ? 'Yes, delete' : 'Yes, cancel it'}
              </button>
            </div>
          }
        >
          <p className="text-sm text-gray-700">
            {confirm.kind === 'delete'
              ? 'This removes the reservation from the list for '
              : 'This marks the reservation as cancelled for '}
            <span className="font-semibold text-[#0B2545]">{confirm.item.name}</span> (
            {formatDate(confirm.item.date)} {formatTime(confirm.item.time)}).
            {confirm.kind === 'cancel' && ' You can reopen it later.'}
          </p>
        </Modal>
      )}
    </div>
  )
}

export default Reservation