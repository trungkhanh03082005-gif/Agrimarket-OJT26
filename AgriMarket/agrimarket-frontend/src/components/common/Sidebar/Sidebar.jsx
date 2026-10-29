// src/components/Sidebar.jsx (Hoặc đường dẫn tương ứng của file Sidebar)

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const NAV_ITEMS = [
    {
        id: 'profile',
        label: 'Hồ sơ',
        path: '/profile',
        icon: null,
    },
    {
        id: 'security',
        label: 'Bảo mật',
        path: '/security',
        icon: null,
    },
    {
        id: 'history',
        label: 'Lịch sử',
        path: '/history',
        icon: null,
    },
];

const Sidebar = ({
                     activeItem = 'profile',
                     user = { name: 'Trần Minh Đức', email: 'farmer@gmail.com', avatar: null },
                     onSignOut,
                 }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavClick = (path) => {
        navigate(path);
    };

    const handleSignOut = () => {
        if (onSignOut) onSignOut();
        navigate('/login');
    };

    return (
        <aside className="sidebar" aria-label="Dashboard sidebar navigation">
            <div className="sidebar-header">
                {/* Logo */}
            </div>

            <div className="sidebar-avatar-section">
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt={`${user.name} avatar`}
                        className="sidebar-avatar"
                    />
                ) : (
                    <div className="sidebar-avatar" aria-hidden="true" />
                )}
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-email">{user.email}</span>
            </div>

            <nav className="sidebar-nav" aria-label="Main navigation">
                <ul className="sidebar-nav-list" role="list">
                    {NAV_ITEMS.map((item) => {
                        const isActive =
                            activeItem === item.id || location.pathname === item.path;
                        return (
                            <li key={item.id} className="sidebar-nav-item">
                                <button
                                    type="button"
                                    className={`sidebar-nav-link ${isActive ? 'sidebar-nav-link--active' : ''}`}
                                    onClick={() => handleNavClick(item.path)}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {item.icon && (
                                        <span className="sidebar-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                                    )}
                                    {item.label}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <button
                    type="button"
                    className="sidebar-nav-link"
                    onClick={handleSignOut}
                    aria-label="Sign out"
                >
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;