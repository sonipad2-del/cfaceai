import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import PendingEmployees from './pages/PendingEmployees';
import EmployeeRegister from './pages/EmployeeRegister';
import Settings from './pages/Settings';
import Ads from './pages/Ads';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Companies from './pages/Companies';
import Users from './pages/Users';
import Broadcast from './pages/Broadcast';
import Announcements from './pages/Announcements';
import System from './pages/System';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (localStorage.getItem('role') !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

const OwnerRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (localStorage.getItem('role') === 'superadmin') return <Navigate to="/dashboard" replace />;
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/terms"    element={<Terms />} />
        <Route path="/privacy"  element={<Privacy />} />
        <Route path="/register/employee" element={<EmployeeRegister />} />

        {/* Shared */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Owner-only routes */}
        <Route path="/employees"         element={<OwnerRoute><Employees /></OwnerRoute>} />
        <Route path="/pending-employees" element={<OwnerRoute><PendingEmployees /></OwnerRoute>} />
        <Route path="/leaves"            element={<OwnerRoute><Leaves /></OwnerRoute>} />
        <Route path="/payroll"           element={<OwnerRoute><Payroll /></OwnerRoute>} />
        <Route path="/announcements"     element={<OwnerRoute><Announcements /></OwnerRoute>} />
        <Route path="/settings"          element={<OwnerRoute><Settings /></OwnerRoute>} />

        {/* Superadmin-only routes */}
        <Route path="/companies" element={<SuperAdminRoute><Companies /></SuperAdminRoute>} />
        <Route path="/users"     element={<SuperAdminRoute><Users /></SuperAdminRoute>} />
        <Route path="/ads"       element={<SuperAdminRoute><Ads /></SuperAdminRoute>} />
        <Route path="/broadcast" element={<SuperAdminRoute><Broadcast /></SuperAdminRoute>} />
        <Route path="/system"    element={<SuperAdminRoute><System /></SuperAdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
