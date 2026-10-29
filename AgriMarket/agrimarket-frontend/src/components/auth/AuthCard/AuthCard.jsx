import React from 'react'
import './AuthCard.css'

const AuthCard = ({ children, ...props }) => {
  return (
    // PASTE AUTHCARD JSX FROM ANIMA HERE
    <div className="auth-card" {...props}>
      {children}
    </div>
  )
}

export default AuthCard
