// UploadPage.jsx — Lets the user select one or more images, send them for AI moderation,
// and view per-image results. Toggles between upload form and result cards.

import { useState, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import VerdictBadge from '../../components/VerdictBadge';

export default function UploadPage() {
  const [files, setFiles] = useState([]);        // File objects chosen by the user
  const [previews, setPreviews] = useState([]);  // Temporary browser URLs for thumbnail previews
  const [results, setResults] = useState(null);  // null = show upload form; array = show result cards
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // ID of the card currently being deleted

  // Ref pointing to the hidden <input type="file"> so the drop zone div can trigger it programmatically
  const inputRef = useRef();

  // Normalizes files from both click-selection and drag-and-drop into the same state
  const handleFiles = (selected) => {
    const arr = Array.from(selected); // FileList is array-like but not a real Array
    setFiles(arr);
    // createObjectURL makes a temporary local URL for each file so previews appear instantly
    // without uploading anything to the server yet
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
    setResults(null); // clear old results whenever new files are picked
  };

  const handleDrop = (e) => {
    e.preventDefault(); // prevent the browser from opening the dropped file
    handleFiles(e.dataTransfer.files);
  };

  // Packages all selected files into a FormData request and sends to the backend
  const handleSubmit = async () => {
    if (files.length === 0) return toast.error('Please select at least one image');
    setLoading(true);
    try {
      // FormData is required to send binary file data in HTTP
      const formData = new FormData();
      // Key must be 'images' to match upload.array('images') in the backend route
      files.forEach((f) => formData.append('images', f));
      const { data } = await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(data.submissions); // one submission object per image
      toast.success(`${data.count} image(s) analyzed!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Deletes one submission from the DB and removes its card from the UI without a full refetch
  const handleDelete = async (submissionId) => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setDeletingId(submissionId); // marks this card's button as "Deleting..."
    try {
      await api.delete(`/submissions/${submissionId}`);
      setResults((prev) => prev.filter((s) => s._id !== submissionId));
      toast.success('Submission deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // Clears all state — brings back the empty upload form
  const reset = () => {
    setFiles([]);
    setPreviews([]);
    setResults(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Upload Images for Moderation</h1>

      {/* Show the upload form when results is null, or the result cards when results is an array */}
      {!results ? (
        <>
          {/* Drop zone — clicking the div triggers the hidden file input via the ref */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()} // required to allow drop events to fire
            onClick={() => inputRef.current.click()}
            className="border-2 border-dashed border-indigo-300 rounded-xl p-10 text-center cursor-pointer hover:bg-indigo-50 transition"
          >
            <p className="text-gray-500 text-sm">Drag & drop images here, or click to select</p>
            <p className="text-xs text-gray-400 mt-1">
              Select multiple images — each gets its own result card
            </p>
            <p className="text-xs text-gray-400">Supports JPEG, PNG, GIF, WebP — max 10MB each</p>
            {/* Hidden — visually invisible but still functional for file selection */}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Preview grid — appears after files are selected, before the user clicks Analyze */}
          {previews.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">{files.length} image(s) selected:</p>
              <div className="grid grid-cols-3 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt="" className="w-full h-32 object-cover rounded-lg border" />
                    <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded truncate max-w-[90%]">
                      {files[i]?.name}
                    </span>
                    {/* Remove-from-selection button — only visible on hover via Tailwind group-hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // don't also trigger the drop zone's onClick
                        const newFiles = files.filter((_, idx) => idx !== i);
                        const newPreviews = previews.filter((_, idx) => idx !== i);
                        setFiles(newFiles);
                        setPreviews(newPreviews);
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-3 items-center">
            <button
              onClick={handleSubmit}
              disabled={loading || files.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {loading ? 'Analyzing...' : `Analyze ${files.length > 0 ? `(${files.length} image${files.length > 1 ? 's' : ''})` : ''}`}
            </button>
            {files.length > 0 && (
              <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-sm underline">
                Clear all
              </button>
            )}
          </div>
        </>
      ) : (
        /* Result cards — one card per submitted image */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">
              Moderation Results — {results.length} image{results.length > 1 ? 's' : ''}
            </h2>
            {/* Clicking "Upload more" calls reset(), which sets results back to null */}
            <button onClick={reset} className="text-sm text-indigo-600 hover:underline">
              Upload more
            </button>
          </div>

          {results.map((submission, i) => (
            <div key={submission._id} className="bg-white rounded-xl shadow-sm border p-5">
              {/* Card header: thumbnail + filename + verdict badge + delete button */}
              <div className="flex items-start gap-4">
                {/* Use the local preview URL (not the server URL) since we still have it */}
                <img
                  src={previews[i]}
                  alt=""
                  className="w-24 h-24 object-cover rounded-lg border flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {files[i]?.name}
                      </span>
                      <VerdictBadge verdict={submission.verdict} />
                    </div>
                    <button
                      onClick={() => handleDelete(submission._id)}
                      disabled={deletingId === submission._id}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                    >
                      {deletingId === submission._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>

                  {/* Per-category breakdown rows */}
                  <div className="space-y-2 mt-2">
                    {submission.categoryResults.map((cat) => (
                      <div key={cat.category} className="flex items-start gap-2 text-xs">
                        {/* Red dot = violation detected; green dot = clean */}
                        <span
                          className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                            cat.detected ? 'bg-red-500' : 'bg-green-400'
                          }`}
                        />
                        <div>
                          <span className="font-medium text-gray-700">{cat.category}</span>
                          <span className="text-gray-400 mx-1">—</span>
                          <span className={cat.detected ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                            {cat.detected ? 'Detected' : 'Clean'}
                          </span>
                          <span className="text-gray-400 ml-1">({cat.confidence}%)</span>
                          {/* Confidence bar: width set as an inline style percentage */}
                          <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5 mb-0.5">
                            <div
                              className={`h-1 rounded-full ${cat.detected ? 'bg-red-400' : 'bg-green-400'}`}
                              style={{ width: `${cat.confidence}%` }}
                            />
                          </div>
                          <p className="text-gray-400">{cat.reason}</p>
                        </div>
                      </div>
                    ))}
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
