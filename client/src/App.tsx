import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/routing/PrivateRoute';
import PublicRoute from './components/routing/PublicRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';
import { AccountsPage, AccountForm } from './pages/accounts';
import { ActivityPage } from './pages/activity';
import { ContentPage } from './pages/content';
import { FriendMonitoringPage } from './pages/friends';
import NotFound from './pages/NotFound';
import { AdminDashboard } from './pages/admin';

function App() {
  return (
    <NotificationProvider>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<PublicRoute component={Login} />} />
            <Route path="/register" element={<PublicRoute component={Register} />} />
            <Route path="/forgot-password" element={<PublicRoute component={ForgotPassword} />} />
            <Route path="/reset-password" element={<PublicRoute component={ResetPassword} />} />

            {/* Dashboard Routes */}
            <Route
              path="/dashboard"
              element={<PrivateRoute component={Dashboard} withLayout={true} />}
            />

            {/* Account Routes */}
            <Route
              path="/accounts"
              element={<PrivateRoute component={AccountsPage} withLayout={true} />}
            />
            <Route
              path="/accounts/new"
              element={
                <PrivateRoute component={() => <AccountForm mode="create" />} withLayout={true} />
              }
            />
            <Route
              path="/accounts/:id/edit"
              element={
                <PrivateRoute component={() => <AccountForm mode="edit" />} withLayout={true} />
              }
            />

            {/* Activity Routes */}
            <Route
              path="/activity"
              element={<PrivateRoute component={ActivityPage} withLayout={true} />}
            />

            {/* Content Routes */}
            <Route
              path="/content"
              element={<PrivateRoute component={ContentPage} withLayout={true} />}
            />

            {/* Friends Routes */}
            <Route
              path="/friends"
              element={<PrivateRoute component={FriendMonitoringPage} withLayout={true} />}
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <PrivateRoute component={AdminDashboard} withLayout={true} adminRequired={true} />
              }
            />

            {/* Redirect root to dashboard or login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </NotificationProvider>
  );
}

export default App;
