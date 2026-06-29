// SubmissionDetailPage.jsx — Shows the full details of a single submission.
// Includes per-category confidence bars and an appeal form for flagged/blocked verdicts.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import VerdictBadge from '../../components/VerdictBadge';
import toast from 'react-hot-toast';

export default function SubmissionDetailPage() {
  // useParams reads the :id segment from the URL (e.g. /history/abc123 → id = "abc123")
  const { id } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealExists, setAppealExists] = useState(false); // true if an appeal was already submitted

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the submission details
        const { data } = await api.get(`/submissions/${id}`);
        setSubmission(data.submission);

        // Also fetch the user's appeals to check if this submission already has one.
        // This prevents showing the appeal form when it's already been submitted.
        const appeals = await api.get('/appeals/my');
        const existing = appeals.data.appeals.find(
          // submission may be populated (object with ._id) or just an ID string
          (a) => a.submission?._id === id || a.submission === id
        );
        if (existing) setAppealExists(true);
      } catch {
        toast.error('Submission not found');
        navigate('/history'); // redirect away if submission doesn't exist or access denied
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]); // re-run if the URL id changes (e.g. user navigates between detail pages)

  const handleAppeal = async (e) => {
    e.preventDefault();
    setSubmittingAppeal(true);
    try {
      await api.post('/appeals', { submissionId: id, reason: appealReason });
      toast.success('Appeal submitted successfully!');
      setAppealExists(true); // hide the form and show the "appeal submitted" message
      setAppealReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!submission) return null;

  // Appeal is only allowed for non-approved verdicts and only if no appeal exists yet
  const canAppeal = ['Flagged for Review', 'Blocked'].includes(submission.verdict) && !appealExists;

  return (
    <div className="max-w-3xl mx-auto">
      {/* navigate(-1) goes back one step in browser history — same as clicking the back button */}
      <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        ← Back to history
      </button>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        {/* Header: image thumbnail + filename + date + verdict badge */}
        <div className="flex items-start gap-5 mb-6">
          <img
            src={submission.imageUrl}
            alt=""
            className="w-36 h-36 object-cover rounded-xl border"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-800">{submission.originalFilename || 'Submission'}</h1>
            <p className="text-sm text-gray-400 mb-2">{new Date(submission.createdAt).toLocaleString()}</p>
            <VerdictBadge verdict={submission.verdict} />
            {/* Show a badge if an admin manually changed this verdict */}
            {submission.overridden && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Manually Overridden</span>
            )}
          </div>
        </div>

        {/* Category Results — one card per moderation category */}
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Category Analysis</h2>
        <div className="space-y-3">
          {submission.categoryResults.map((cat) => (
            <div key={cat.category} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${cat.detected ? 'text-red-600' : 'text-green-600'}`}>
                    {cat.detected ? 'Detected' : 'Clean'}
                  </span>
                  <span className="text-xs text-gray-400">{cat.confidence}%</span>
                </div>
              </div>
              {/* Confidence bar — inline width percentage drives the bar length */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                <div
                  className={`h-1.5 rounded-full ${cat.detected ? 'bg-red-500' : 'bg-green-400'}`}
                  style={{ width: `${cat.confidence}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{cat.reason}</p>
            </div>
          ))}
        </div>

        {/* Appeal Section — only visible if verdict is appealable OR an appeal already exists */}
        {(canAppeal || appealExists) && (
          <div className="mt-6 border-t pt-5">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Appeal</h2>

            {appealExists ? (
              // Show a status message instead of the form once an appeal has been submitted
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                An appeal has been submitted for this submission. Check the Appeals page for status updates.
              </div>
            ) : (
              <form onSubmit={handleAppeal} className="space-y-3">
                <p className="text-sm text-gray-500">
                  Explain why you believe this verdict is incorrect:
                </p>
                <textarea
                  required
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Provide your justification..."
                />
                <button
                  type="submit"
                  disabled={submittingAppeal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-60"
                >
                  {submittingAppeal ? 'Submitting...' : 'Submit Appeal'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
