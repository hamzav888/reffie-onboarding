import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Toast, { useToast } from '@/components/layout/Toast';
import TopBar from '@/components/layout/TopBar';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import AccountDetail from '@/pages/AccountDetail';
import MyTasks from '@/pages/MyTasks';
import Login from '@/pages/Login';
import useAuthStore from '@/store/useAuthStore';
import useAccountStore from '@/store/useAccountStore';

// Surfaces store errors as toasts without duplicating useEffect in every page.
function ErrorHandler() {
  const error = useAccountStore((s) => s.error);
  const clearError = useAccountStore((s) => s.clearError);
  const { showToast } = useToast();

  useEffect(() => {
    if (error) {
      showToast(error);
      clearError();
    }
  }, [error, clearError, showToast]);

  return null;
}

// Layout wrapper: TopBar + route outlet. Bootstraps account data after login.
function AppLayout() {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);

  // Gate on both user AND token — Zustand persist rehydrates asynchronously, so
  // user can become truthy one tick before token arrives. Firing fetchAccounts
  // before the token is present would produce a 'Not authenticated' error.
  useEffect(() => {
    if (user && token) {
      fetchAccounts();
    }
  }, [user, token]);

  return (
    <div className="min-h-screen bg-page">
      <TopBar />
      <ErrorHandler />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <Toast>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* App shell — TopBar visible on all routes below */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/accounts/:id"
            element={<ProtectedRoute><AccountDetail /></ProtectedRoute>}
          />
          <Route
            path="/tasks"
            element={<ProtectedRoute><MyTasks /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Toast>
  );
}
