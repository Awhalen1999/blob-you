/**
 * Custom Button Component
 *
 * Retro Nintendo-style button with thick borders and press effect.
 * Inspired by old-school web gaming aesthetic.
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Icon to display before text */
  icon?: ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  children: ReactNode;
}

const VARIANT_STYLES = {
  primary: {
    base: 'bg-blue-500 border-blue-700 text-white hover:bg-blue-600 active:bg-blue-700',
  },
  secondary: {
    base: 'bg-gray-500 border-gray-700 text-white hover:bg-gray-600 active:bg-gray-700',
  },
  danger: {
    base: 'bg-red-500 border-red-700 text-white hover:bg-red-600 active:bg-red-700',
  },
  success: {
    base: 'bg-green-500 border-green-700 text-white hover:bg-green-600 active:bg-green-700',
  },
} as const;

const SIZE_STYLES = {
  sm: 'px-3 text-xs h-[28px]',
  md: 'px-4 text-sm h-[36px]',
  lg: 'px-6 text-base h-[44px]',
} as const;

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        ${sizeStyle}
        ${variantStyle.base}
        border-2 border-b-[3.5px]
        rounded
        font-bold uppercase tracking-wide
        transition-all duration-100
        ${!isDisabled ? 'hover:border-b-2' : ''}
        ${!isDisabled ? 'active:border-b-2' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      <span className="leading-none">{children}</span>
    </button>
  );
}

