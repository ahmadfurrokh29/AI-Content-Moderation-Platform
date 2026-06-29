// Reusable badge component that displays a colored pill based on the verdict string.
// Used in: HistoryPage, SubmissionDetailPage, AdminSubmissions, AdminAppeals.

export default function VerdictBadge({ verdict }) {
  // Map each verdict string to its Tailwind color classes
  const styles = {
    Approved: 'bg-green-100 text-green-800',
    'Flagged for Review': 'bg-yellow-100 text-yellow-800',
    Blocked: 'bg-red-100 text-red-800',
  };

  // Use verdict as a key to look up the class string.
  // Falls back to gray if an unexpected verdict value is received.
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[verdict] || 'bg-gray-100 text-gray-700'}`}>
      {verdict}
    </span>
  );
}
