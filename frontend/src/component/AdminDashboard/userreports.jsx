import React, { useEffect, useState } from 'react';
import { securityApi } from '../Api/apilist';

/* ---------- Reusable UI sub-components ---------- */

const COLUMNS = ['ID', 'Login Code', 'Full Name', 'Email', 'Status', 'Roles'];

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: COLUMNS.length }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

const EmptyState = ({ title, message }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500 max-w-sm">{message}</p>
  </div>
);

const ErrorState = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-base font-semibold text-slate-900">Something went wrong</h3>
    <p className="mt-1 text-sm text-red-600 max-w-sm">{message}</p>
  </div>
);

const RoleBadge = ({ label, description, inactive }) => (
  <span
    title={description || undefined}
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
      inactive
        ? 'bg-slate-100 text-slate-500 ring-slate-200'
        : 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    }`}
  >
    {label}
  </span>
);

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
      active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

/* ---------- Helpers ---------- */

const getRoleName = (role) =>
  role?.RoleName || role?.rolename || role?.name || role?.role || '—';

const getRoleDescription = (role) =>
  role?.RoleDescription || role?.roledescription || role?.description || '';

/* ---------- Main component ---------- */

const UserReports = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await securityApi.getUserReport();
        const list = response?.data ?? response ?? [];
        if (isMounted) setUsers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load user report:', err);
        if (isMounted) setError(err.message || 'Failed to load user report');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUsers();
    return () => { isMounted = false; };
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      String(u.id).includes(q) ||
      (u.logincode || '').toLowerCase().includes(q) ||
      (u.userfullname || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.roles || []).some((r) => getRoleName(r).toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Header bar */}
      <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              User Report
              {!loading && !error && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {users.length}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-slate-500">All users currently registered in the system</p>
          </div>

          {!loading && !error && users.length > 0 && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users, emails or roles..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {COLUMNS.map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : !users.length ? (
        <EmptyState title="No users found" message="There are no users to display in this report yet." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  {COLUMNS.map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">#{u.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{u.logincode || '—'}</td>
                    <td className="px-6 py-4 text-slate-700">{u.userfullname || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {u.email ? (
                        <a
                          href={`mailto:${u.email}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {u.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge active={u.isActive !== false} />
                    </td>
                    <td className="px-6 py-4">
                      {u.roles?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {u.roles.map((r, idx) => (
                            <RoleBadge
                              key={r.id ?? idx}
                              label={getRoleName(r)}
                              description={getRoleDescription(r)}
                              inactive={r.isActive === false}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No roles assigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              No users match "<span className="font-medium text-slate-700">{search}</span>"
            </div>
          )}

          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </>
      )}
    </div>
  );
};

export default UserReports;