import React, { useEffect, useState } from 'react';
import { securityApi } from '../Api/apilist';

/* ---------- Reusable UI sub-components ---------- */

const COLUMNS = ['ID', 'Role Name', 'Description', 'Status', 'Users'];

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
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

const UserChip = ({ user }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
    {user.logincode || 'N/A'}
    {user.userfullname && (
      <span className="text-slate-500 font-normal">({user.userfullname})</span>
    )}
  </span>
);

/* ---------- Helpers ---------- */

const getRoleName = (role) =>
  role?.RoleName || role?.rolename || role?.name || role?.role || '—';

const getRoleDescription = (role) =>
  role?.RoleDescription || role?.roledescription || role?.description || '';

/* ---------- Main component ---------- */

const RoleReports = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const response = await securityApi.getRoleReports();
        const list = response?.data ?? response ?? [];
        if (isMounted) setRoles(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load role report:', err);
        if (isMounted) setError(err.message || 'Failed to load role report');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchRoles();
    return () => { isMounted = false; };
  }, []);

  const filteredRoles = roles.filter((r) => {
    const q = search.toLowerCase();
    return (
      String(r.id).includes(q) ||
      getRoleName(r).toLowerCase().includes(q) ||
      getRoleDescription(r).toLowerCase().includes(q) ||
      (r.users || []).some(
        (u) =>
          (u.logincode || '').toLowerCase().includes(q) ||
          (u.userfullname || '').toLowerCase().includes(q)
      )
    );
  });

  return (
    <div>
      {/* Header bar */}
      <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              Role Report
              {!loading && !error && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {roles.length}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-slate-500">All roles and their assigned users</p>
          </div>

          {!loading && !error && roles.length > 0 && (
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
                placeholder="Search roles, descriptions or users..."
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
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : !roles.length ? (
        <EmptyState title="No roles found" message="There are no roles to display in this report yet." />
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
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-indigo-50/40 transition-colors align-top">
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">#{role.id}</td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            role.isActive === false ? 'bg-slate-300' : 'bg-indigo-500'
                          }`}
                        />
                        {getRoleName(role)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600 max-w-xs">
                      {getRoleDescription(role) || (
                        <span className="text-slate-400 text-xs italic">No description</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          role.isActive === false
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {role.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {role.users?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {role.users.map((u, idx) => (
                            <UserChip key={u.id ?? u.logincode ?? idx} user={u} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No users assigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRoles.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              No roles match "<span className="font-medium text-slate-700">{search}</span>"
            </div>
          )}

          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
            Showing {filteredRoles.length} of {roles.length} roles
          </div>
        </>
      )}
    </div>
  );
};

export default RoleReports;