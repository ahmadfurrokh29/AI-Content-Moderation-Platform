// AdminSubmissions.jsx — Admin view of all submissions across all users.
// Admins can filter by verdict, override a verdict, or permanently delete a submission.

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import VerdictBadge from '../../components/VerdictBadge';
import toast from 'react-hot-toast';

// Empty string '' = "All" filter (no restriction). Other values filter by that verdict.
const VERDICTS = ['', 'Approved', 'Flagged for Review', 'Blocked'];

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);   // ID of submission being deleted
  const [overridingId, setOverridingId] = useState(null); // ID of submission being overridden

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (verdictFilter) params.verdict = verdictFilter; // omit param if filter is "All"
      // Admin endpoint (/submissions) returns ALL users' submissions, unlike /submissions/my
      const { data } = await api.get('/submissions', { params });
      setSubmissions(data.submissions);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch automatically whenever the verdict filter changes
  useEffect(() => { fetchSubmissions(); }, [verdictFilter]);

  // Permanently deletes the submission, its image file on disk, and any linked appeal
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this submission permanently? The image file and any related appeal will also be removed.')) return;
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

  // Sends a PATCH request to change a submission's verdict to the given value
  const handleOverride = async (id, verdict) => {
    setOverridingId(id);
    try {
      const { data } = await api.patch(`/submissions/${id}/override`, { verdict });
      // Update only the changed submission in state — no full refetch needed
      // Spread keeps all existing fields, then overrides verdict and sets overridden flag
      setSubmissions((prev) =>
        prev.map((s) => (s._id === id ? { ...s, verdict: data.submission.verdict, overridden: true } : s))
      );
      toast.success(`Verdict overridden to ${verdict}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Override failed');
    } finally {
      setOverridingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">All Submissions</h1>

      {/* Verdict filter — clicking a pill sets verdictFilter, which triggers useEffect to refetch */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex gap-3 flex-wrap">
        {VERDICTS.map((v) => (
          <button
            key={v}
            onClick={() => setVerdictFilter(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              verdictFilter === v
                ? 'bg-indigo-600 text-white'   // active filter
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {v || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : submissions.length === 0 ? (
        <p className="text-center py-16 text-gray-400">No submissions found.</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub._id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-start gap-4">
                <img
                  src={sub.imageUrl}
                  alt=""
                  className="w-20 h-20 object-cover rounded-lg border flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  {/* User info + verdict + override badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-700">
                        {sub.user?.name}
                        <span className="text-gray-400 ml-1 text-xs">({sub.user?.email})</span>
                      </span>
                      <VerdictBadge verdict={sub.verdict} />
                      {/* "Overridden" badge appears if an admin previously changed this verdict */}
                      {sub.overridden && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Overridden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleString()}</p>
                  </div>

                  <p className="text-xs text-gray-500 truncate mb-2">{sub.originalFilename}</p>

                  {/* Show detected category tags — or "No violations" if all clean */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {sub.categoryResults?.filter(c => c.detected).map(c => (
                      <span key={c.category} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        {c.category} ({c.confidence}%)
                      </span>
                    ))}
                    {sub.categoryResults?.filter(c => c.detected).length === 0 && (
                      <span className="text-xs text-green-600">No violations detected</span>
                    )}
                  </div>

                  {/* Action buttons — override options change based on current verdict */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Only show "Override → Approved" if it's not already Approved */}
                    {sub.verdict !== 'Approved' && (
                      <button
                        onClick={() => handleOverride(sub._id, 'Approved')}
                        disabled={overridingId === sub._id}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        Override → Approved
                      </button>
                    )}
                    {/* Only show "Override → Blocked" if it's not already Blocked */}
                    {sub.verdict !== 'Blocked' && (
                      <button
                        onClick={() => handleOverride(sub._id, 'Blocked')}
                        disabled={overridingId === sub._id}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        Override → Blocked
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(sub._id)}
                      disabled={deletingId === sub._id}
                      className="text-xs border border-red-200 text-red-500 hover:text-red-700 hover:border-red-400 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {deletingId === sub._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
