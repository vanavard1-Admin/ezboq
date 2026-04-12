import React from 'react';
import type { AuthUser } from '../types/index';

interface NavigationProps {
  user?: AuthUser;
  currentPath: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  user,
  currentPath,
  onNavigate,
  onSignOut,
}) => {
  const navItems = [
    { label: 'BOQ', path: '/', icon: '📋', description: 'ใบเสนอราคา' },
    { label: 'Documents', path: '/docs', icon: '📄', description: 'จัดการเอกสาร' },
    { label: 'Shop', path: '/shop', icon: '🛒', description: 'จัดซื้อวัสดุ' },
  ];

  const pipelinePath = '/workspace#pipeline';

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => onNavigate('/')}
          >
            <h1 className="text-xl font-bold text-slate-900">
              EzBOQ
            </h1>
            <span className="ml-2 text-xs text-slate-500 hidden sm:inline">
              Easy Business Online & Quality
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}

              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => onNavigate(pipelinePath)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span className="text-base">+</span>
              <span>สร้างโปรเจค</span>
            </button>
          </div>

          {/* User Profile & Actions */}
          {user && (
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-slate-900">
                  {user.name}
                </span>
                <span className="text-xs text-slate-500">
                  {user.company || user.workspaceName}
                </span>
              </div>

              {/* User Avatar & Menu */}
              <div className="relative">
                <button
                  onClick={onSignOut}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="ออกจากระบบ"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`flex flex-col items-center px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-600'
                }`}

              >
                <span className="text-base mb-1">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => onNavigate(pipelinePath)}
              className="flex flex-col items-center px-3 py-2 rounded-md text-xs font-medium bg-blue-600 text-white"
            >
              <span className="text-base mb-1">+</span>
              <span>สร้างโปรเจค</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
