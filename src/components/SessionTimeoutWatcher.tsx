import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useAuth,
  isSessionExpired,
  recordSessionActivity
} from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const SessionTimeoutWatcher: React.FC = () => {
  const { currentUser, userAccount, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggingOutRef = useRef(false);
  const lastThrottleRef = useRef(Date.now());

  const isLoggedIn = !!(currentUser || userAccount);

  // Handle auto logout when inactivity threshold (3 mins) is reached
  const performAutoLogout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      const wasAdmin = isAdmin || userAccount?.role === 'ADMIN';
      await logout();

      toast.error(
        'सुरक्षा कारणों से 3 मिनट तक कोई गतिविधि न होने या पेज बंद रहने पर ऑटो-लॉगआउट कर दिया गया है। कृपया पुनः लॉगिन करें।',
        { id: 'session-timeout-toast', duration: 6000 }
      );

      if (wasAdmin) {
        navigate('/admin-login', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } finally {
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    }
  };

  // Activity tracking and inactivity detection when user is authenticated
  useEffect(() => {
    if (!isLoggedIn) return;

    // Check immediately on mount or navigation if session has expired
    if (isSessionExpired()) {
      performAutoLogout();
      return;
    }

    const onUserActivity = () => {
      const now = Date.now();
      // Throttle writing to localStorage to at most once every 2 seconds
      if (now - lastThrottleRef.current > 2000) {
        lastThrottleRef.current = now;
        recordSessionActivity();
      }
    };

    // User interaction events to track activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, onUserActivity, { passive: true }));

    // Periodic check every 1 second
    const intervalId = setInterval(() => {
      if (isSessionExpired()) {
        performAutoLogout();
      }
    }, 1000);

    // Check when user returns to tab / focuses window
    const onVisibilityOrFocusChange = () => {
      if (document.visibilityState === 'visible') {
        if (isSessionExpired()) {
          performAutoLogout();
        } else {
          recordSessionActivity();
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocusChange);
    window.addEventListener('focus', onVisibilityOrFocusChange);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onUserActivity));
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityOrFocusChange);
      window.removeEventListener('focus', onVisibilityOrFocusChange);
    };
  }, [isLoggedIn, location.pathname]);

  return null;
};
