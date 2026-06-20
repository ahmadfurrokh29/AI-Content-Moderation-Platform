import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import VerdictBadge from '../../components/VerdictBadge';
import toast from 'react-hot-toast';

const VERDICTS = ['', 'Approved', 'Flagged for Review', 'Blocked'];
const CATEGORIES = [
  '',
  'Graphic Violence',
  'Hate Symbols',
  'Self-Harm',
  'Extremist Propaganda',
  'Weapons & Contraband',
  'Harassment & Humiliation',
];

export default function HistoryPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ verdict: '', category: '', startDate: '', endDate: '' });
  const [deletingId, setDeletingId] = useState(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.verdict) params.verdict = filters.verdict;
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await api.get('/submissions/my', { params });
      setSubmissions(data.submissions);
    } catch (err) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const handleDelete = async (e, id) => {
    e.preventDefault(); // prevent Link navigation
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/submissions/${id}`);
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
      toast.success('Submission deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Submissions</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap gap-3">
        <select
          value={filters.verdict}
          onChange={(e) => setFilters({ ...filters, verdict: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {VERDICTS.map((v) => <option key={v} value={v}>{v || 'All Verdicts'}</option>)}
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={fetchSubmissions}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No submissions found.</p>
          <Link to="/upload" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
            Upload your first image
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {submissions.map((sub) => (
            <div key={sub._id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition">
              <Link to={`/history/${sub._id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <img
                  src={sub.imageUrl}
                  alt=""
                  className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {sub.originalFilename || 'Image'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(sub.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {sub.categoryResults.filter(c => c.detected).map(c => (
                      <span key={c.category} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        {c.category}
                      </span>
                    ))}
                  </div>
                </div>
                <VerdictBadge verdict={sub.verdict} />
              </Link>

              {/* Delete button — outside the Link */}
              <button
                onClick={(e) => handleDelete(e, sub._id)}
                disabled={deletingId === sub._id}
                className="ml-2 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 flex-shrink-0"
              >
                {deletingId === sub._id ? '...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
