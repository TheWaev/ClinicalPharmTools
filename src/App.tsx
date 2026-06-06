import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import { availableTools } from './tools/registry';

/** Everything except /login and /signup lives behind the auth gate + shell. */
function ProtectedLayout() {
  return (
    <RequireAuth>
      <Layout>
        <Outlet />
      </Layout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Home />} />
          {availableTools.map((tool) => {
            const Tool = tool.component;
            return <Route key={tool.slug} path={`/tools/${tool.slug}`} element={<Tool />} />;
          })}
          <Route path="/tools" element={<Navigate to="/" replace />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
