import { useContext } from 'react';
import AuthContext from './AuthContext';
import type { AuthContextValue } from '../types';

/** Custom hook to use the AuthContext. */
function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}

export default useAuth;
