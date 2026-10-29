import React from 'react'
import './Input.css'

const Input = ({ label, type = 'text', value, onChange, placeholder, name, required = false, ...props }) => {
  return (
    // PASTE INPUT JSX FROM ANIMA HERE
    <div className="input-group">
      {label && <label className="input-label" htmlFor={name}>{label}</label>}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="input-field"
        {...props}
      />
    </div>
  )
}

export default Input
