import React from 'react'
import './AuthBanner.css'

const AuthBanner = ({ title, subtitle, testimonial, bgType = 'login' }) => {
  return (
    // PASTE AUTHBANNER JSX FROM ANIMA HERE
    <div className={`auth-banner bg-${bgType}`}>
      {/* IMAGE PLACEHOLDER: */}
      {/* bgType === 'login' ? 'src/assets/images/login-farm.jpg' : 'src/assets/images/register-field.jpg' */}
      
      <div className="banner-overlay"></div>
      
      <div className="banner-content">
        {title && <h2 className="banner-title">{title}</h2>}
        {subtitle && <p className="banner-subtitle">{subtitle}</p>}
        
        {testimonial && (
          <div className="banner-testimonial">
            <p className="testimonial-text">"{testimonial.quote}"</p>
            {testimonial.author && <p className="testimonial-author">- {testimonial.author}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthBanner
