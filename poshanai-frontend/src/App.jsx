import { Navigate, Route, Routes } from 'react-router-dom';
import Layout, { PublicLayout } from './components/layout/Layout.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import UploadReport from './pages/UploadReport.jsx';
import MealPlanView from './pages/MealPlanView.jsx';
import NotFound from './pages/NotFound.jsx';

// Merged Imports (from both branches)
import CalorieTracker from './pages/CalorieTracker.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Recommendations from './pages/Recommendations.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/upload" element={<UploadReport />} />
            <Route path="/meal-plan/:id" element={<MealPlanView />} />
            
            {/* Merged New Routes */}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/calorie-tracker" element={<CalorieTracker />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Routes>
    </AuthProvider>
  );
}