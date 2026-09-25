'use client'

import React, { forwardRef, useEffect, useId, useRef } from 'react'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  checked?: boolean
  indeterminate?: boolean
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void
  label?: React.ReactNode
  description?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  boxClassName?: string
  containerClassName?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onChange,
      disabled = false,
      label,
      description,
      size = 'md',
      className = '',
      boxClassName = '',
      containerClassName = '',
      id,
      ...restProps
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null)
    const generatedId = useId()
    const inputId = id || generatedId

    // Sync ref
    const setRefs = (node: HTMLInputElement | null) => {
      internalRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node
      }
    }

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = Boolean(indeterminate)
      }
    }, [indeterminate])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      onChange?.(e.target.checked, e)
    }

    // Size variants
    const sizeConfig = {
      sm: {
        box: 'h-3.5 w-3.5 rounded-[4px]',
        icon: 'h-2.5 w-2.5',
        dashWidth: 'w-2 h-0.5',
        text: 'text-xs',
        desc: 'text-[10px]',
        gap: 'gap-2',
      },
      md: {
        box: 'h-4 w-4 rounded-[5px]',
        icon: 'h-3 w-3',
        dashWidth: 'w-2.5 h-0.5',
        text: 'text-xs',
        desc: 'text-[11px]',
        gap: 'gap-2.5',
      },
      lg: {
        box: 'h-5 w-5 rounded-md',
        icon: 'h-3.5 w-3.5',
        dashWidth: 'w-3 h-0.5',
        text: 'text-sm',
        desc: 'text-xs',
        gap: 'gap-3',
      },
    }[size]

    const isActive = checked || indeterminate

    return (
      <label
        htmlFor={inputId}
        className={`group relative inline-flex items-start select-none ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${sizeConfig.gap} ${containerClassName} ${className}`}
      >
        {/* Hidden accessible native input */}
        <input
          {...restProps}
          ref={setRefs}
          type="checkbox"
          id={inputId}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          aria-checked={indeterminate ? 'mixed' : checked}
          className="sr-only peer"
        />

        {/* Custom tactile indicator */}
        <div
          className={`relative shrink-0 flex items-center justify-center border transition-all duration-150 ease-out mt-0.5 ${
            sizeConfig.box
          } ${
            isActive
              ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-950/40'
              : 'bg-zinc-900/60 border-zinc-700/80 group-hover:border-zinc-500 group-hover:bg-zinc-900'
          } peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950 ${boxClassName}`}
          aria-hidden="true"
        >
          {/* Indeterminate state: Crisp horizontal bar */}
          {indeterminate ? (
            <div
              className={`rounded-full bg-white transition-transform duration-150 ${sizeConfig.dashWidth} scale-100 opacity-100`}
            />
          ) : (
            /* Checked state: Crisp SVG checkmark */
            <svg
              className={`${sizeConfig.icon} transition-all duration-150 ${
                checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
              }`}
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 7.2L5.8 10L11 4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Optional Label and Description block */}
        {(label || description) && (
          <div className="flex flex-col leading-tight">
            {label && (
              <span
                className={`font-medium text-zinc-200 transition-colors duration-150 group-hover:text-white ${sizeConfig.text}`}
              >
                {label}
              </span>
            )}
            {description && (
              <span className={`mt-0.5 text-zinc-500 font-normal ${sizeConfig.desc}`}>
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'