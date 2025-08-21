import { useEffect, useState } from 'react'

/**
 * Custom hook that debounces a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for debounced search functionality
 * @param initialValue - Initial search value
 * @param delay - Debounce delay in milliseconds (default: 200ms)
 * @returns Object with value, debouncedValue, and setValue
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 200) {
  const [value, setValue] = useState(initialValue)
  const debouncedValue = useDebouncedValue(value, delay)

  return {
    value,
    debouncedValue,
    setValue
  }
}
