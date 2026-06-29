// App.jsx — Defines all routes and navigation guards for the application.
// Decides which component to render based on the current URL and the logged-in user's role.

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// User pages
import UploadPage from './pages/user/UploadPage';
import HistoryPage from './pages/user/HistoryPage';
import SubmissionDetailPage from './pages/user/SubmissionDetailPage';
import AppealsPage from './pages/user/AppealsPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAppeals from './pages/admin/AdminAppeals';
import AdminPolicies from './pages/admin/AdminPolicies';
import AdminSubmissions from './pages/admin/AdminSubmissions';

// Layout
import Layout from './components/Layout';

// PrivateRoute — protects routes that require login.
// If user is null (not logged in), redirect to /login instead of rendering children.
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

// AdminRoute — protects routes that require admin role.
// Not logged in → /login. Logged in as regular user → /upload. Admin → render children.
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/upload" replace />;
  return children;
};

// AppRoutes is a separate component so it can call useAuth() —
// hooks must run inside a child of their Provider (AuthProvider wraps this).
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes — if already logged in, skip login/register and go home */}
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/upload'} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/upload'} /> : <RegisterPage />} />

      {/* User routes — Layout renders the shared Navbar; child routes appear inside <Outlet> */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        {/* "/" redirects to the correct home based on role */}
        <Route index element={<Navigate to={user?.role === 'admin' ? '/admin' : '/upload'} replace />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="history" element={<HistoryPage />} />
        {/* :id is a URL parameter — read with useParams() in SubmissionDetailPage */}
        <Route path="history/:id" element={<SubmissionDetailPage />} />
        <Route path="appeals" element={<AppealsPage />} />
      </Route>

      {/* Admin routes — same Layout wrapper, but guarded by AdminRoute */}
      <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="appeals" element={<AdminAppeals />} />
        <Route path="policies" element={<AdminPolicies />} />
        <Route path="submissions" element={<AdminSubmissions />} />
      </Route>

      {/* Catch-all — any unknown URL goes back to "/" which redirects by role */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// AuthProvider wraps AppRoutes so every component in the tree can call useAuth()
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
