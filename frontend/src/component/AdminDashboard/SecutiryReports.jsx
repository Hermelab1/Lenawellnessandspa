import React, { useState } from 'react';
import UserReport from './userreports';
import RoleReport from './rolereports';

const Reports = () => {
  const reportTypes = [
    {
      name: 'User Report',
      path: '/admin/security-user-report',
      component: UserReport,
      title: 'User Report',
      description: 'View all registered users and their assigned roles',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Role Report',
      path: '/admin/security-role-report',
      component: RoleReport,
      title: 'Role Report',
      description: 'Explore roles and the users assigned to them',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  const [activeReport, setActiveReport] = useState(reportTypes[0]);
  const ActiveComponent = activeReport.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-600 rounded-lg shadow-md shadow-indigo-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Security Reports</h1>
              <p className="text-sm text-slate-500">Analyze users and roles across your system</p>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar nav */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="px-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Report Types
              </h3>
              <nav className="space-y-1">
                {reportTypes.map((report) => {
                  const isActive = activeReport.path === report.path;
                  return (
                    <button
                      key={report.path}
                      onClick={() => setActiveReport(report)}
                      className={`group w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex-shrink-0 transition-colors ${
                          isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        {report.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-semibold ${isActive ? 'text-indigo-700' : ''}`}>
                          {report.name}
                        </span>
                        <span className="block text-xs mt-0.5 text-slate-500 leading-snug">
                          {report.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Report content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <ActiveComponent />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Reports;