import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout, { PublicLayout } from './components/layout/Layout.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const OtpLogin = lazy(() => import('./pages/OtpLogin.jsx'));
const TwoFactorVerify = lazy(() => import('./pages/TwoFactorVerify.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const UploadReport = lazy(() => import('./pages/UploadReport.jsx'));
const DietPlanWizard = lazy(() => import('./pages/DietPlanWizard.jsx'));
const DietPlanResult = lazy(() => import('./pages/DietPlanResult.jsx'));
const Experts = lazy(() => import('./pages/Experts.jsx'));
const CalorieTracker = lazy(() => import('./pages/CalorieTracker.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Recommendations = lazy(() => import('./pages/Recommendations.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const MealPlanView = lazy(() => import('./pages/MealPlanView.jsx'));
const FoodLibrary = lazy(() => import('./pages/FoodLibrary.jsx'));

function RouteLoading() {
  return (
    <div className="mx-auto my-12 w-fit border-4 border-black bg-white p-6 font-minecraft text-[#1E5631] shadow-[4px_4px_0px_#000]">
      Loading page…
    </div>
  );
}

function LazyPage({ component: Page }) {
  return <Suspense fallback={<RouteLoading />}><Page /></Suspense>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LazyPage component={Landing} />} />
            <Route path="/login" element={<LazyPage component={Login} />} />
            <Route path="/login-otp" element={<LazyPage component={OtpLogin} />} />
            <Route path="/two-factor-verify" element={<LazyPage component={TwoFactorVerify} />} />
            <Route path="/register" element={<LazyPage component={Register} />} />
            <Route path="/food-library" element={<LazyPage component={FoodLibrary} />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<LazyPage component={Dashboard} />} />
              <Route path="/experts" element={<LazyPage component={Experts} />} />
              <Route path="/profile" element={<LazyPage component={Profile} />} />
              <Route path="/upload" element={<LazyPage component={UploadReport} />} />
              <Route path="/meal-plan/:id" element={<LazyPage component={MealPlanView} />} />
              <Route path="/meal-plan" element={<LazyPage component={MealPlanView} />} />
              <Route path="/diet-plan" element={<LazyPage component={DietPlanWizard} />} />
              <Route path="/diet-plan/view" element={<LazyPage component={DietPlanResult} />} />

              {/* Merged New Routes */}
              <Route path="/onboarding" element={<LazyPage component={Onboarding} />} />
              <Route path="/recommendations" element={<LazyPage component={Recommendations} />} />
              <Route path="/calorie-tracker" element={<LazyPage component={CalorieTracker} />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/not-found" element={<LazyPage component={NotFound} />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
