import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import VerdictBadge from '../../components/VerdictBadge';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Accepted: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
};

export default function AppealsPage() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appeals/my')
      .then(({ data }) => setAppeals(data.appeals))
      .catch(() => toast.error('Failed to load appeals'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Appeals</h1>

      {appeals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No appeals submitted yet.</p>
          <Link to="/history" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
            View submissions to appeal
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => (
            <div key={appeal._id} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-start gap-4">
                {appeal.submission?.imageUrl && (
                  <img
                    src={appeal.submission.imageUrl}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[appeal.status]}`}
                    >
                      {appeal.status}
                    </span>
                    {appeal.submission?.verdict && (
                      <VerdictBadge verdict={appeal.submission.verdict} />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Submitted {new Date(appeal.createdAt).toLocaleString()}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Your reason:</p>
                    <p className="text-sm text-gray-700">{appeal.reason}</p>
                  </div>
                  {appeal.adminResponse && (
                    <div className="bg-indigo-50 rounded-lg p-3">
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
