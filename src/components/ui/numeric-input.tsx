import * as React from "react"
import { cn } from "@/lib/utils"

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  allowDecimals?: boolean
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value = 0, onChange, min = 0, max, step = 1, allowDecimals = false, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(String(value))
    const [isFocused, setIsFocused] = React.useState(false)

    // Update display value when prop value changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(String(value))
      }
    }, [value, isFocused])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      // Select all text when focused for easy replacement
      e.target.select()
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      
      // Parse and validate the final value
      let numValue = allowDecimals ? parseFloat(displayValue) : parseInt(displayValue)
      
      if (isNaN(numValue)) {
        numValue = 0
      }
      
      // Apply min/max constraints
      if (min !== undefined && numValue < min) {
        numValue = min
      }
      if (max !== undefined && numValue > max) {
        numValue = max
      }
      
      // Update display and notify parent
      setDisplayValue(String(numValue))
      onChange?.(numValue)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      
      // Allow empty string while typing
      if (newValue === '') {
        setDisplayValue('')
        onChange?.(0)
        return
      }
      
      // Validate input based on decimal allowance
      const regex = allowDecimals ? /^\d*\.?\d*$/ : /^\d*$/
      
      if (regex.test(newValue)) {
        setDisplayValue(newValue)
        
        // Parse and send numeric value to parent
        let numValue = allowDecimals ? parseFloat(newValue) : parseInt(newValue)
        if (!isNaN(numValue)) {
          onChange?.(numValue)
        }
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter, and arrow keys
      if ([8, 9, 27, 13, 37, 38, 39, 40, 46].includes(e.keyCode) ||
          // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.ctrlKey === true && [65, 67, 86, 88].includes(e.keyCode))) {
        return
      }
      
      // Allow decimal point if decimals are allowed and not already present
      if (allowDecimals && e.key === '.' && !displayValue.includes('.')) {
        return
      }
      
      // Ensure that it's a number
      if (e.key < '0' || e.key > '9') {
        e.preventDefault()
      }
      
      props.onKeyDown?.(e)
    }

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Highlight when focused for better UX
          isFocused && "ring-2 ring-ring ring-offset-2",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
NumericInput.displayName = "NumericInput"

export { NumericInput }