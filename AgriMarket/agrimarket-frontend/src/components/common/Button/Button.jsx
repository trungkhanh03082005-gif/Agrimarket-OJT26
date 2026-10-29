import React from 'react'
import './Button.css'

const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, ...props }) => {
  return (
    // PASTE BUTTON JSX FROM ANIMA HERE
    <button
      type={type}
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
