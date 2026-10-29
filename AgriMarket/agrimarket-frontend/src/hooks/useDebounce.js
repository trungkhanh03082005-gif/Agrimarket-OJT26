import { useState, useEffect } from 'react';

/**
 * Custom hook hoãn cập nhật giá trị trong một khoảng thời gian (default: 300ms)
 * @param {any} value - Giá trị đầu vào
 * @param {number} delay - Thời gian chờ (ms)
 * @returns {any} Giá trị sau khi debounce
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
