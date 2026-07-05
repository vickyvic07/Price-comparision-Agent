import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Bell, MessageSquare, LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/',         label: 'Search'   },
  { to: '/wishlist', label: 'Wishlist', icon: Heart   },
  { to: '/chat',     label: 'Chat',     icon: MessageSquare },
  { to: '/alerts',   label: 'Alerts',   icon: Bell    },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base hidden sm:block">PriceAgent</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <User className="w-4 h-4" />
                {user.name?.split(' ')[0] || 'Profile'}
              </NavLink>
              <button onClick={handleLogout} className="btn-ghost text-gray-500 hidden sm:flex">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary hidden sm:inline-flex">Sign in</Link>
              <Link to="/signup" className="btn-primary hidden sm:inline-flex">Sign up</Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          {user ? (
            <>
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setOpen(false)}>
                <User className="w-4 h-4" /> Profile
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg w-full">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="btn-secondary flex-1 justify-center" onClick={() => setOpen(false)}>Sign in</Link>
              <Link to="/signup" className="btn-primary flex-1 justify-center" onClick={() => setOpen(false)}>Sign up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
