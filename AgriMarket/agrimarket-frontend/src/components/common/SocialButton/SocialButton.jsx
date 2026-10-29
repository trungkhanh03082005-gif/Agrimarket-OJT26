import React from 'react'
import './SocialButton.css'

const SocialButton = ({ onClick, provider = 'google', label, ...props }) => {
  return (
    // PASTE SOCIALBUTTON JSX FROM ANIMA HERE
    <button type="button" className={`btn-social btn-${provider}`} onClick={onClick} {...props}>
      {/* IMAGE PLACEHOLDER: */}
      {/* src/assets/icons/google.svg */}
      <span className="social-icon-placeholder">G</span>
      <span className="social-label">{label || `Sign in with ${provider}`}</span>
    </button>
  )
}

export default SocialButton
