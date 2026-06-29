// AdminDashboard.jsx — Analytics overview for admins.
// Fetches aggregated stats from the backend and renders summary cards and Recharts charts.

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

// Colors used for category bar chart slices
const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'];

// Maps verdict strings to specific hex colors for the pie chart
const VERDICT_COLORS = { Approved: '#10b981', 'Flagged for Review': '#f59e0b', Blocked: '#ef4444' };

// Small reusable card component for the four summary numbers at the top
const StatCard = ({ label, value, sub }) => (
  <div className="bg-white rounded-xl border shadow-sm p-5">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    {/* `sub` is optional — only rendered when provided (e.g. "3 pending") */}
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Using .then() chain instead of async/await — both are equivalent
    api.get('/analytics')
      .then(({ data }) => setAnalytics(data.analytics))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []); // empty array = fetch once on mount

  if (loading) return <p className="text-gray-500">Loading analytics...</p>;
  if (!analytics) return null;

  // Transform the verdict distribution array into the shape Recharts expects: { name, value }
  const verdictPieData = analytics.verdictDistribution.map((v) => ({
    name: v._id,   // MongoDB groups by _id (the verdict string)
    value: v.count,
  }));

  // Find the pending count from the appeals.byStatus array, default to 0 if not found
  const pendingAppeals = analytics.appeals.byStatus.find((s) => s._id === 'Pending')?.count || 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>

      {/* Four summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Submissions" value={analytics.totalSubmissions} />
        <StatCard label="Total Users" value={analytics.totalUsers} />
        <StatCard label="Total Appeals" value={analytics.appeals.total} sub={`${pendingAppeals} pending`} />
        <StatCard label="Resolution Rate" value={`${analytics.appeals.resolutionRate}%`} />
      </div>

      {/* Line chart: submission volume over the last 30 days */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-600 mb-4">Submissions (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={analytics.submissionsOverTime}>
            <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie chart: proportion of Approved / Flagged / Blocked verdicts */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">Verdict Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={verdictPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {/* Each slice gets a color from VERDICT_COLORS, falling back to indigo */}
                {verdictPieData.map((entry) => (
                  <Cell key={entry.name} fill={VERDICT_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal bar chart: how many violations each category triggered */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">Violations by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.categoryDistribution} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="_id" type="category" tick={{ fontSize: 10 }} width={130} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two side-by-side tables: top users by submission count and by violation count */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">Top Users by Submissions</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left pb-2">User</th><th className="text-right pb-2">Submissions</th></tr></thead>
            <tbody>
              {analytics.topUsersBySubmissions.map((u) => (
                <tr key={u._id} className="border-b last:border-0">
                  <td className="py-2">
                    <p className="font-medium text-gray-700">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-2 text-right font-semibold text-gray-700">{u.submissionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">Top Users by Violations</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left pb-2">User</th><th className="text-right pb-2">Violations</th></tr></thead>
            <tbody>
              {analytics.topUsersByViolations.map((u) => (
                <tr key={u._id} className="border-b last:border-0">
                  <td className="py-2">
                    <p className="font-medium text-gray-700">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-2 text-right font-semibold text-red-600">{u.violationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
