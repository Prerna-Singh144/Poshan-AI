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
import CalorieTracker from './pages/CalorieTracker.jsx';
import NotFound from './pages/NotFound.jsx';


export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing/>} />
        </Route>
        {/* <Route path="/landing" element={<Landing />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calorie-tracker" element={<CalorieTracker />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/upload" element={<UploadReport />} />
            <Route path="/meal-plan/:id" element={<MealPlanView />} />
          </Route>
        </Route>
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  );
}
