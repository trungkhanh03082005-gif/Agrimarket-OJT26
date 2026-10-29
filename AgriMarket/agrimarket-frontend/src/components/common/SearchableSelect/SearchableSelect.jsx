import React, { useState, useEffect, useRef } from 'react';
import './SearchableSelect.css';

export default function SearchableSelect({
    options = [],
    value = "",
    onChange,
    placeholder = "Chọn...",
    disabled = false,
    className = "",
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);

    // Find current selected option to show its name in the input
    const selectedOption = options.find(opt => String(opt.code) === String(value));

    // Update search term when value or options change
    useEffect(() => {
        if (selectedOption) {
            setSearchTerm(selectedOption.name);
        } else {
            setSearchTerm("");
        }
    }, [value, selectedOption]);

    // Handle clicking outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                // Revert search term to selected value name if not matched
                if (selectedOption) {
                    setSearchTerm(selectedOption.name);
                } else {
                    setSearchTerm("");
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedOption]);

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        if (!isOpen) setIsOpen(true);
    };

    const handleSelectOption = (opt) => {
        onChange({ target: { value: String(opt.code) } });
        setSearchTerm(opt.name);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange({ target: { value: "" } });
        setSearchTerm("");
        setIsOpen(false);
    };

    // Filter options based on search term
    const filteredOptions = options.filter(opt => {
        const name = opt.name || "";
        const search = searchTerm || "";
        // If the search term matches the selected option exactly, don't filter out other options
        if (selectedOption && selectedOption.name === search) {
            return true;
        }
        return name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div 
            className={`searchable-select-container ${disabled ? 'disabled' : ''} ${className}`} 
            ref={containerRef}
        >
            <div className="searchable-select-input-wrapper">
                <input
                    type="text"
                    className="searchable-select-input"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (!disabled) setIsOpen(true);
                    }}
                    disabled={disabled}
                />
                <span className="searchable-select-arrow" onClick={() => !disabled && setIsOpen(!isOpen)}>
                    {isOpen ? '▴' : '▾'}
                </span>
                {searchTerm && !disabled && (
                    <button 
                        type="button" 
                        className="searchable-select-clear-btn" 
                        onClick={handleClear}
                    >
                        ×
                    </button>
                )}
            </div>

            {isOpen && !disabled && (
                <div className="searchable-select-dropdown">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.code}
                                className={`searchable-select-option ${String(opt.code) === String(value) ? 'selected' : ''}`}
                                onClick={() => handleSelectOption(opt)}
                            >
                                {opt.name}
                            </div>
                        ))
                    ) : (
                        <div className="searchable-select-no-results">
                            Không tìm thấy dữ liệu
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
