import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    api.get('/policies')
      .then(({ data }) => setPolicies(data.policies))
      .catch(() => toast.error('Failed to load policies'))
      .finally(() => setLoading(false));
  }, []);

  const updateLocal = (id, field, value) => {
    setPolicies((prev) =>
      prev.map((p) => (p._id === id ? { ...p, [field]: value } : p))
    );
  };

  const savePolicy = async (policy) => {
    setSaving((prev) => ({ ...prev, [policy._id]: true }));
    try {
      await api.patch(`/policies/${policy._id}`, {
        enabled: policy.enabled,
        threshold: policy.threshold,
        action: policy.action,
      });
      toast.success(`${policy.category} policy saved`);
    } catch {
      toast.error('Failed to save policy');
    } finally {
      setSaving((prev) => ({ ...prev, [policy._id]: false }));
    }
  };

  if (loading) return <p className="text-gray-500">Loading policies...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Policy Configuration</h1>
      <p className="text-sm text-gray-500 mb-6">
        Changes apply to new submissions only and do not retroactively alter existing verdicts.
      </p>

      <div className="space-y-4">
        {policies.map((policy) => (
          <div key={policy._id} className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Category name + enable toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateLocal(policy._id, 'enabled', !policy.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    policy.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      policy.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="font-semibold text-gray-800">{policy.category}</p>
                  <p className="text-xs text-gray-400">{policy.enabled ? 'Active' : 'Disabled'}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Threshold */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    Threshold: {policy.threshold}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={policy.threshold}
                    disabled={!policy.enabled}
                    onChange={(e) => updateLocal(policy._id, 'threshold', Number(e.target.value))}
                    className="w-28 accent-indigo-600 disabled:opacity-40"
                  />
                </div>

                {/* Action */}
                <select
                  value={policy.action}
                  disabled={!policy.enabled}
                  onChange={(e) => updateLocal(policy._id, 'action', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                >
                  <option value="Flag for Review">Flag for Review</option>
                  <option value="Auto-Block">Auto-Block</option>
                </select>

                {/* Save */}
                <button
                  onClick={() => savePolicy(policy)}
                  disabled={saving[policy._id]}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition disabled:opacity-60"
                >
                  {saving[policy._id] ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
