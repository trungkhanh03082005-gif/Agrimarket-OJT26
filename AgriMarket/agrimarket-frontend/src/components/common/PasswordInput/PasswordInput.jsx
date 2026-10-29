// PasswordInput.js
import React, { useState } from 'react';
import './PasswordInput.css';

const PasswordInput = ({ id, name, placeholder, value, onChange, error, showStrength }) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="password-input-container">
            <div className="password-input-relative">
                <input
                    id={id}
                    name={name}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={`password-input-field ${error ? 'input-error' : ''}`}
                />
                <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={toggleVisibility}
                    tabIndex="-1"
                >
                    {showPassword ? (
                        /* Eye Open Icon */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        /* Eye Closed Icon */
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 6.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.84 16.81M14.12 14.12A3 3 0 1 1 9.88 9.88" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 1L23 23" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>
            </div>

            {showStrength && value.length > 0 && (
                <div className="password-strength">
                    <div className={`strength-bar ${value.length >= 8 ? 'strong' : 'weak'}`}></div>
                    <span className="strength-text">Độ mạnh mật khẩu: {value.length >= 8 ? 'Mạnh' : 'Yếu'}</span>
                </div>
            )}

            {error && <span className="error-text">{error}</span>}
        </div>
    );
};

export default PasswordInput;