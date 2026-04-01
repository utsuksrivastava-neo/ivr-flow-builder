/**
 * @file AdminLayout.jsx — shell for admin routes (users, all configurations).
 */
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import ExotelLogo from './ExotelLogo';
import { ArrowLeft, Users, SlidersHorizontal } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-header-left">
          <button type="button" className="toolbar-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <span className="dash-divider">|</span>
          <ExotelLogo height={22} light={themeMode === 'dark'} />
          <span className="dash-divider">|</span>
          <h1>Administration</h1>
        </div>
        <nav className="admin-subnav" aria-label="Admin sections">
          <NavLink
            to="/admin/users"
            className={({ isActive }) => `toolbar-btn admin-nav-link ${isActive ? 'primary' : ''}`}
            end={false}
          >
            <Users size={14} /> Users
          </NavLink>
          <NavLink
            to="/admin/config"
            className={({ isActive }) => `toolbar-btn admin-nav-link ${isActive ? 'primary' : ''}`}
          >
            <SlidersHorizontal size={14} /> All configurations
          </NavLink>
        </nav>
      </header>
      <main className="dash-body">
        <Outlet />
      </main>
    </div>
  );
}
