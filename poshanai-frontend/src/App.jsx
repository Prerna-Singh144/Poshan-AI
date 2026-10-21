import { lazy, Suspense } from 'react';
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
import DietPlanWizard from './pages/DietPlanWizard.jsx';
import DietPlanResult from './pages/DietPlanResult.jsx';
import NotFound from './pages/NotFound.jsx';

// Merged Imports (from both branches)
import Experts from './pages/Experts.jsx';
import CalorieTracker from './pages/CalorieTracker.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Recommendations from './pages/Recommendations.jsx';
const MealPlanView = lazy(() => import('./pages/MealPlanView.jsx'));
const FoodLibrary = lazy(() => import('./pages/FoodLibrary.jsx'));

function RouteLoading() {
  return <div className="mx-auto max-w-5xl p-8 text-center text-slate-600">Loading page…</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/food-library" element={<Suspense fallback={<RouteLoading />}><FoodLibrary /></Suspense>} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/experts" element={<Experts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/upload" element={<UploadReport />} />
            <Route path="/meal-plan/:id" element={<Suspense fallback={<RouteLoading />}><MealPlanView /></Suspense>} />
            <Route path="/meal-plan" element={<Suspense fallback={<RouteLoading />}><MealPlanView /></Suspense>} />
            <Route path="/diet-plan" element={<DietPlanWizard />} />
            <Route path="/diet-plan/view" element={<DietPlanResult />} />
            
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
