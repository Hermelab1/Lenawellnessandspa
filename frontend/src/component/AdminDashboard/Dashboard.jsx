import React, { useState, useEffect } from 'react';
// import { getDashboardStats, getAlerts, getRecentOrders } from '../Api/apilist';

const Dashboard = ({ username }) => {
  const [stats, setStats] = useState([]);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        /* 
        // Fetch all data in parallel
        const [statsRes, ordersRes, alertsRes] = await Promise.all([
          getDashboardStats(dateRange.start, dateRange.end),
          getRecentOrders(),
          getAlerts()
        ]);
        
        // FIXED: Handle stats response - API returns { stats: [...] }
        let statsData = [];
        if (statsRes.stats) {
          statsData = statsRes.stats;
        } else if (statsRes.data && statsRes.data.stats) {
          statsData = statsRes.data.stats;
        } else if (Array.isArray(statsRes)) {
          statsData = statsRes;
        } else if (statsRes.data && Array.isArray(statsRes.data)) {
          statsData = statsRes.data;
        }
        
        setStats(statsData);

        // Handle orders - API returns array directly or nested
        const ordersData = ordersRes.orders || ordersRes.data?.orders || ordersRes.data || ordersRes || [];
        setOrders(ordersData);
        
        // Handle alerts - API returns array directly or nested
        const alertsData = alertsRes.alerts || alertsRes.data?.alerts || alertsRes.data || alertsRes || [];
        setAlerts(alertsData);
        */

        setLoading(false);
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
       <div className="text-slate-500 animate-pulse font-medium">Syncing Dashboard Data...</div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          <p className="text-slate-500">Welcome back, {username || 'Admin'}!</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase ml-2">From</label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="text-sm border-none focus:ring-0 text-slate-600 cursor-pointer bg-transparent"
            />
          </div>
          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase">To</label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="text-sm border-none focus:ring-0 text-slate-600 cursor-pointer bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {stat.title === 'Total Users' ? 
                    `👥 ${stat.value}` : 
                    stat.title === 'Total Revenue' ? 
                    `$${stat.value}` : 
                    stat.value}
                </h3>
              </div>
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center text-xl`}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-semibold mr-2">
                <i className="fa-solid fa-arrow-up mr-1"></i> Live
              </span>
              <span className="text-slate-400 text-xs">Updated just now</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Recent Transactions</h3>
            <button className="text-blue-600 text-sm bg-transparent font-medium hover:underline">View Table</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Customer/Product</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {orders.length > 0 ? (
                  orders.map((order, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium">{order.id || order.orderId || i+1}</td>
                      <td className="px-6 py-4">{order.customer || order.product || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          order.status === 'DELIVERED' || order.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">${order.amount || order.total || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                      No recent orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Alerts Section */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Inquiries</h3>
          <div className="space-y-4">
            {alerts.length > 0 ? alerts.map((alert, idx) => (
              <div key={idx} className={`flex items-start space-x-3 p-3 bg-${alert.color || 'blue'}-50 rounded-lg border border-${alert.color || 'blue'}-100`}>
                <i className={`fa-solid ${alert.type === 'stock' ? 'fa-circle-exclamation' : 'fa-circle-info'} text-${alert.color || 'blue'}-500 mt-1`}></i>
                <div>
                  <p className={`text-sm font-semibold text-${alert.color || 'blue'}-800`}>{alert.title}</p>
                  <p className={`text-xs text-${alert.color || 'blue'}-600`}>{alert.message}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400 italic">No new notifications.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;