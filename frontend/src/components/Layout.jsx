// Layout.jsx — Shared page shell rendered around all protected routes.
// Contains the Navbar at the top and an <Outlet> where the active child route renders.
// Using Layout as the parent route means the Navbar is written once, not in every page.

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();          // clears token + user from localStorage, sets user state to null
    navigate('/login'); // PrivateRoute then automatically redirects away from protected pages
  };

  // Different nav links are shown depending on the user's role
  const userLinks = [
    { to: '/upload', label: 'Upload Images' },
    { to: '/history', label: 'My Submissions' },
    { to: '/appeals', label: 'My Appeals' },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/submissions', label: 'All Submissions' },
    { to: '/admin/appeals', label: 'Appeals Queue' },
    { to: '/admin/policies', label: 'Policies' },
    { to: '/upload', label: 'Upload' },
  ];

  // Pick the correct list based on role using optional chaining (?.)
  const links = user?.role === 'admin' ? adminLinks : userLinks;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-indigo-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">ContentGuard</span>

          <div className="flex items-center gap-4">
            {/* Render each nav link from the links array */}
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                // `end` on the /admin link prevents it staying "active" on sub-routes
                // like /admin/appeals — without `end`, any /admin/* would match it
                end={link.to === '/admin'}
                className={({ isActive }) =>
                  `text-sm font-medium px-3 py-1.5 rounded transition ${
                    isActive ? 'bg-indigo-500' : 'hover:bg-indigo-600'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {/* User info section */}
            <div className="ml-4 flex items-center gap-3 border-l border-indigo-500 pl-4">
              <span className="text-sm opacity-80">{user?.name}</span>

              {/* Admin badge — only renders if role is 'admin'. && short-circuits if false. */}
              {user?.role === 'admin' && (
                <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">
                  Admin
                </span>
              )}

              <button
                onClick={handleLogout}
                className="text-sm bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content — <Outlet> renders whichever child route is currently active */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
