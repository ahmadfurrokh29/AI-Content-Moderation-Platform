// AdminAppeals.jsx — Admin queue for reviewing user appeals.
// Admins can filter by status, write a response, and accept or reject each appeal.
// Accepting an appeal also overrides the submission's verdict to Approved.

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import VerdictBadge from '../../components/VerdictBadge';
import toast from 'react-hot-toast';

// Maps appeal status to Tailwind color classes for the status badge
const STATUS_STYLES = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Accepted: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
};

export default function AdminAppeals() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending'); // default to showing pending appeals
  // Object keyed by appeal._id so each card tracks its own loading state independently
  const [reviewing, setReviewing] = useState({});
  // Object keyed by appeal._id — stores the admin response text for each appeal card
  const [responses, setResponses] = useState({});

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const { data } = await api.get('/appeals', { params });
      setAppeals(data.appeals);
    } catch {
      toast.error('Failed to load appeals');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever the status filter tab changes
  useEffect(() => { fetchAppeals(); }, [statusFilter]);

  // Sends the admin's decision (Accepted/Rejected) and optional response text to the backend
  const handleReview = async (appeal, status) => {
    // Extra confirmation before accepting — it's a permanent verdict override
    if (status === 'Accepted') {
      const confirmed = window.confirm(
        'Accept this appeal? The submission verdict will be permanently overridden to Approved.'
      );
      if (!confirmed) return;
    }

    // Mark only this appeal's button as loading using its ID as the object key
    setReviewing((prev) => ({ ...prev, [appeal._id]: true }));
    try {
      const { data } = await api.patch(`/appeals/${appeal._id}/review`, {
        status,
        adminResponse: responses[appeal._id] || '', // empty string if admin didn't write anything
      });

      if (status === 'Accepted') {
        toast.success('Appeal accepted — submission verdict overridden to Approved');
      } else {
        toast.success('Appeal rejected');
      }

      // Refresh the list so the reviewed appeal moves to the correct status tab
      fetchAppeals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review appeal');
    } finally {
      setReviewing((prev) => ({ ...prev, [appeal._id]: false }));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Appeals Queue</h1>

      {/* Status filter tabs — clicking a tab updates statusFilter, triggering useEffect to refetch */}
      <div className="flex gap-2 mb-6">
        {['', 'Pending', 'Accepted', 'Rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : appeals.length === 0 ? (
        <p className="text-center py-16 text-gray-400">No appeals found.</p>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => (
            <div key={appeal._id} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-start gap-4">
                {/* Optional chaining: skip image if submission was deleted */}
                {appeal.submission?.imageUrl && (
                  <img
                    src={appeal.submission.imageUrl}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg border flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  {/* Appeal header: user name, email, status badge, current submission verdict */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-800">{appeal.user?.name}</span>
                    <span className="text-xs text-gray-400">{appeal.user?.email}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[appeal.status]}`}>
                      {appeal.status}
                    </span>
                    {appeal.submission?.verdict && (
                      <VerdictBadge verdict={appeal.submission.verdict} />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Submitted {new Date(appeal.createdAt).toLocaleString()}
                  </p>

                  {/* Warning banner shown only for pending appeals so admin knows the consequence */}
                  {appeal.status === 'Pending' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700">
                      Accepting this appeal will override the submission verdict to <strong>Approved</strong>.
                    </div>
                  )}
                  {/* Confirmation banner shown after an appeal has been accepted */}
                  {appeal.status === 'Accepted' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 text-xs text-green-700">
                      Appeal accepted — submission verdict was overridden to <strong>Approved</strong>.
                    </div>
                  )}

                  {/* The reason the user wrote when submitting the appeal */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">User's reason:</p>
                    <p className="text-sm text-gray-700">{appeal.reason}</p>
                  </div>

                  {/* Detected violation tags from the original submission */}
                  {appeal.submission?.categoryResults && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {appeal.submission.categoryResults
                        .filter((c) => c.detected)
                        .map((c) => (
                          <span key={c.category} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                            {c.category} ({c.confidence}%)
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Review controls — only shown for pending appeals */}
                  {appeal.status === 'Pending' && (
                    <div className="space-y-2">
                      {/* Response textarea — stored in the `responses` object keyed by appeal ID */}
                      <textarea
                        rows={2}
                        placeholder="Optional written response to user..."
                        value={responses[appeal._id] || ''}
                        onChange={(e) =>
                          // Spread keeps other appeals' responses intact, updates only this one
                          setResponses((prev) => ({ ...prev, [appeal._id]: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(appeal, 'Accepted')}
                          disabled={reviewing[appeal._id]}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
                        >
                          {reviewing[appeal._id] ? 'Processing...' : 'Accept (Override to Approved)'}
                        </button>
                        <button
                          onClick={() => handleReview(appeal, 'Rejected')}
                          disabled={reviewing[appeal._id]}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
                        >
                          {reviewing[appeal._id] ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Admin's response — visible after the appeal has been reviewed */}
                  {appeal.adminResponse && (
                    <div className="mt-2 bg-indigo-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-indigo-700 mb-1">Admin response:</p>
                      <p className="text-sm text-indigo-800">{appeal.adminResponse}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
