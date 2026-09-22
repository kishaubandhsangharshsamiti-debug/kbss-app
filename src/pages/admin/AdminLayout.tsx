import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Award,
  CreditCard,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RegistrationService, SettingsService } from '../../services/db';
import { CommitteeSettings } from '../../types';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [settings, setSettings] = useState<CommitteeSettings>({
    committeeName: 'Kishau Bandh Sangharsh Samiti',
    logoUrl: '',
    presidentName: '',
    presidentSignatureUrl: '',
    adminName: '',
    adminSignatureUrl: '',
    updatedAt: ''
  });

  useEffect(() => {
    const unsubReg = RegistrationService.subscribe((reqs) => {
      const pending = reqs.filter(r => r.status === 'PENDING').length;
      setPendingCount(pending);
    });

    const unsubSettings = SettingsService.subscribe((s) => {
      setSettings(s);
    });

    return () => {
      unsubReg();
      unsubSettings();
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    {
      name: 'Registration Requests',
      path: '/admin/registrations',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : undefined
    },
    { name: 'Member Registry', path: '/admin/members', icon: Users },
    { name: 'Office Bearers', path: '/admin/office-bearers', icon: Award },
    { name: 'ID Cards Preview', path: '/admin/idcards', icon: CreditCard },
    { name: 'Assemblies & Meetings', path: '/admin/meetings', icon: Calendar },
    { name: 'Circulars & Updates', path: '/admin/updates', icon: Bell },
    { name: 'Committee Settings', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/dashboard')) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
              className="w-8 h-8 rounded-lg object-cover bg-white"
            />
          ) : (
            <Shield className="w-6 h-6 text-amber-400" />
          )}
          <span className="font-extrabold text-xs tracking-tight text-amber-400">KBSS Executive Console</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-200"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800 flex flex-col justify-between`}
      >
        <div className="p-5 space-y-6">
          {/* Header Branding */}
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                className="w-11 h-11 rounded-xl object-cover border border-amber-400 bg-white"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold border border-amber-400">
                <Shield className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
                Executive Admin
              </span>
              <h2 className="text-xs font-black text-white truncate leading-tight">
                {settings.committeeName || 'Kishau Bandh Samiti'}
              </h2>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 pt-2 border-t border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'bg-emerald-800 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Member Portal View</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};
