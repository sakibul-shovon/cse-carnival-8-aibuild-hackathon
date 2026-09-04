import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import Schedules from './pages/Schedules';
import Rooms from './pages/Rooms';
import Events from './pages/Events';
import Announcements from './pages/Announcements';
import Assignments from './pages/Assignments';
import Assistant from './pages/Assistant';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="events" element={<Events />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
