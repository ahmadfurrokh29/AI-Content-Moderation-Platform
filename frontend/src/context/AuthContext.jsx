// AuthContext.jsx — Global authentication state using React Context API.
// Wraps the entire app so any component can access the logged-in user
// and call login / register / logout without passing props through every level.

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Create the context. null is the default value before AuthProvider mounts.
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Lazy initializer: read user from localStorage on first render so the
  // user stays logged in after a page refresh (token is already in storage).
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(false);

  // Sends credentials to the backend and stores the returned JWT + user object.
  // Returns the user so the calling page can navigate after login.
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token); // persist across page refreshes
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user); // update global state → all consumers re-render
    return data.user;
  };

  // Same flow as login but calls the register endpoint instead.
  const register = async (name, email, password, role) => {
    const { data } = await api.post('/auth/register', { name, email, password, role });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // Clears token and user from storage and resets state to null.
  // Setting user to null causes PrivateRoute to redirect to /login automatically.
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    // Expose user object and auth functions to all descendant components
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Shortcut hook — components import useAuth() instead of both useContext + AuthContext
export const useAuth = () => useContext(AuthContext);
