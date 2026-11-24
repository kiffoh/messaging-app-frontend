import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../authentication/useAuth';

function UserLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/users/login" replace />;

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: 'var(--default-colour-light)' }}>
      <Outlet />
    </div>
  );
}

export default UserLayout;
