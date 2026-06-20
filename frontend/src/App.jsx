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

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/upload" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/upload'} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/upload'} /> : <RegisterPage />} />

      {/* User routes */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to={user?.role === 'admin' ? '/admin' : '/upload'} replace />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<SubmissionDetailPage />} />
        <Route path="appeals" element={<AppealsPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="appeals" element={<AdminAppeals />} />
        <Route path="policies" element={<AdminPolicies />} />
        <Route path="submissions" element={<AdminSubmissions />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
