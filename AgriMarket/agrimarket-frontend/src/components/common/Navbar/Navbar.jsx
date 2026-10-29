// =============================================
// NAVBAR COMPONENT
// Top navigation bar
// =============================================

import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

// ===================================== //
// PASTE ANIMA GENERATED JSX HERE        //
// ===================================== //

/**
 * Navbar Component
 *
 * @param {node}   logo    - custom logo node
 * @param {node}   actions - right-side action nodes
 */
const Navbar = ({ logo, actions }) => {
  return (
    <header className="navbar" role="banner">
      <div className="navbar-inner">
        {/* ===================================== */}
        {/* PASTE ANIMA GENERATED JSX HERE        */}
        {/* ===================================== */}

        {/* Logo / Brand */}
        <Link to="/" className="navbar-logo" aria-label="AgriMarket home">
          {/* PASTE ANIMA LOGO JSX HERE */}
          {logo ?? <span>AgriMarket</span>}
        </Link>

        {/* Right Side Actions */}
        {actions && (
          <div className="navbar-actions">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
