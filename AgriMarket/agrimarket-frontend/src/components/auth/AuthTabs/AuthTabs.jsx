import React from 'react'
import './AuthTabs.css'

const AuthTabs = ({ tabs = [], activeTab, onTabChange }) => {
  return (
    // PASTE AUTHTABS JSX FROM ANIMA HERE
    <div className="auth-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`auth-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default AuthTabs
