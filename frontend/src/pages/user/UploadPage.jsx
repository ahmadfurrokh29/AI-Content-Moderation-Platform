import { useState, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import VerdictBadge from '../../components/VerdictBadge';

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const inputRef = useRef();

  const handleFiles = (selected) => {
    const arr = Array.from(selected);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
    setResults(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (files.length === 0) return toast.error('Please select at least one image');
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      const { data } = await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(data.submissions);
      toast.success(`${data.count} image(s) analyzed!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setDeletingId(submissionId);
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

  const reset = () => {
    setFiles([]);
    setPreviews([]);
    setResults(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Upload Images for Moderation</h1>

      {!results ? (
        <>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current.click()}
            className="border-2 border-dashed border-indigo-300 rounded-xl p-10 text-center cursor-pointer hover:bg-indigo-50 transition"
          >
            <p className="text-gray-500 text-sm">Drag & drop images here, or click to select</p>
            <p className="text-xs text-gray-400 mt-1">
              Select multiple images — each gets its own result card
            </p>
            <p className="text-xs text-gray-400">Supports JPEG, PNG, GIF, WebP — max 10MB each</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Previews grid */}
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
                    {/* Remove from selection */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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
        /* Results — one card per image */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">
              Moderation Results — {results.length} image{results.length > 1 ? 's' : ''}
            </h2>
            <button onClick={reset} className="text-sm text-indigo-600 hover:underline">
              Upload more
            </button>
          </div>

          {results.map((submission, i) => (
            <div key={submission._id} className="bg-white rounded-xl shadow-sm border p-5">
              {/* Card header */}
              <div className="flex items-start gap-4">
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

                  {/* Per-category results */}
                  <div className="space-y-2 mt-2">
                    {submission.categoryResults.map((cat) => (
                      <div key={cat.category} className="flex items-start gap-2 text-xs">
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
                          {/* Confidence bar */}
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
