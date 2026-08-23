import { Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../authentication/useAuth';
import { useEffect } from 'react';

function UserLayout() {
  const { checkTokenValidity } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const validToken = checkTokenValidity()
    if (!validToken) navigate('/users/login')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: 'var(--default-colour-light)' }}>
      <Outlet /> {/* This is where the nested routes will be rendered */}
    </div>
  );
}

export default UserLayout;
