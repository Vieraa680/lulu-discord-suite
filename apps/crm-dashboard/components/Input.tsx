'use client'

import React, { forwardRef, useId, useRef } from 'react'
import { Icon } from './Icon'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode
  description?: React.ReactNode
  error?: string
  leftIcon?: string
  rightIcon?: string
  suffix?: string
  size?: 'sm' | 'md'
  showSteppers?: boolean
  containerClassName?: string
}

function setNativeInputValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set
  const prototype = Object.getPrototypeOf(element)
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value)
  } else if (valueSetter) {
    valueSetter.call(element, value)
  } else {
    element.value = value
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      description,
      error,
      leftIcon,
      rightIcon,
      suffix,
      size = 'md',
      showSteppers = true,
      type = 'text',
      className = '',
      containerClassName = '',
      id,
      disabled,
      min,
      max,
      step,
      value,
      ...restProps
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null)
    const generatedId = useId()
    const inputId = id || generatedId

    const setRefs = (node: HTMLInputElement | null) => {
      internalRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node
      }
    }

    const isNumberType = type === 'number'

    const handleStep = (direction: 'up' | 'down', e: React.MouseEvent) => {
      e.preventDefault()
      if (disabled || !internalRef.current) return

      const input = internalRef.current
      const currentVal = parseFloat(input.value) || 0
      const baseStep = step ? parseFloat(step.toString()) : 1
      const multiplier = e.shiftKey ? 10 : 1
      const delta = (direction === 'up' ? 1 : -1) * baseStep * multiplier

      let nextVal = currentVal + delta

      if (min !== undefined && min !== '') {
        const minVal = parseFloat(min.toString())
        if (!isNaN(minVal) && nextVal < minVal) nextVal = minVal
      }
      if (max !== undefined && max !== '') {
        const maxVal = parseFloat(max.toString())
        if (!isNaN(maxVal) && nextVal > maxVal) nextVal = maxVal
      }

      const decimals = Math.max(
        (baseStep.toString().split('.')[1] || '').length,
        (currentVal.toString().split('.')[1] || '').length
      )
      const formattedVal = decimals > 0 ? nextVal.toFixed(decimals) : nextVal.toString()

      setNativeInputValue(input, formattedVal)
      input.focus()
    }

    const sizeClasses = {
      sm: {
        container: 'h-8 text-xs',
        input: 'py-1 text-xs',
        inputPlWithIcon: 'pl-1',
        inputPlNoIcon: 'pl-2.5',
        inputPrWithControl: 'pr-1.5',
        inputPrNoControl: 'pr-2.5',
        leftIcon: 'pl-2.5 pr-1',
        rightIcon: 'pr-2',
        stepperBtn: 'h-4 w-6',
        stepperIcon: 'h-3 w-3',
      },
      md: {
        container: 'h-10 text-xs',
        input: 'py-2 text-xs',
        inputPlWithIcon: 'pl-1.5',
        inputPlNoIcon: 'pl-3.5',
        inputPrWithControl: 'pr-2',
        inputPrNoControl: 'pr-3.5',
        leftIcon: 'pl-3 pr-1.5',
        rightIcon: 'pr-3',
        stepperBtn: 'h-5 w-7',
        stepperIcon: 'h-3.5 w-3.5',
      },
    }[size]

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-zinc-200 select-none cursor-pointer"
          >
            {label}
          </label>
        )}

        {/* Input Surface */}
        <div
          className={`group relative flex items-center rounded-xl border bg-zinc-900/60 transition-all duration-150 ${
            error
              ? 'border-red-500/80 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/40'
              : 'border-zinc-800 hover:border-zinc-700/80 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/50'
          } ${disabled ? 'opacity-40 cursor-not-allowed bg-zinc-950/40' : ''} ${
            sizeClasses.container
          }`}
        >
          {/* Left Icon */}
          {leftIcon && (
            <div
              className={`flex items-center text-zinc-500 group-focus-within:text-purple-400 transition-colors select-none shrink-0 ${sizeClasses.leftIcon}`}
            >
              <Icon icon={leftIcon} className="h-4 w-4" />
            </div>
          )}

          {/* Actual Input Field */}
          <input
            {...restProps}
            ref={setRefs}
            id={inputId}
            type={type}
            value={value}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={`w-full h-full bg-transparent text-white placeholder-zinc-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              isNumberType ? 'tabular-nums' : ''
            } ${leftIcon ? sizeClasses.inputPlWithIcon : sizeClasses.inputPlNoIcon} ${
              suffix || (isNumberType && showSteppers)
                ? sizeClasses.inputPrWithControl
                : sizeClasses.inputPrNoControl
            } ${sizeClasses.input} ${className}`}
          />

          {/* Suffix unit badge */}
          {suffix && (
            <span className="mr-2 inline-flex items-center rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/50 select-none whitespace-nowrap shrink-0">
              {suffix}
            </span>
          )}

          {/* Right Icon (when not using steppers or specified alongside) */}
          {rightIcon && !isNumberType && (
            <div className={`flex items-center text-zinc-500 select-none shrink-0 ${sizeClasses.rightIcon}`}>
              <Icon icon={rightIcon} className="h-4 w-4" />
            </div>
          )}

          {/* Linear / Raycast style vertical steppers for numbers */}
          {isNumberType && showSteppers && !disabled && (
            <div className="flex h-full flex-col border-l border-zinc-800/80 divide-y divide-zinc-800/80 shrink-0 select-none overflow-hidden rounded-r-xl bg-zinc-950/30">
              <button
                type="button"
                tabIndex={-1}
                onClick={e => handleStep('up', e)}
                title="Incrementar (Shift para +10)"
                className={`flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-purple-950/60 transition-colors ${sizeClasses.stepperBtn}`}
              >
                <Icon icon="mdi:chevron-up" className={sizeClasses.stepperIcon} />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={e => handleStep('down', e)}
                title="Decrementar (Shift para -10)"
                className={`flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-purple-950/60 transition-colors ${sizeClasses.stepperBtn}`}
              >
                <Icon icon="mdi:chevron-down" className={sizeClasses.stepperIcon} />
              </button>
            </div>
          )}
        </div>

        {/* Supporting description below the input */}
        {description && !error && (
          <p className="text-[11px] text-zinc-500 font-normal leading-normal">
            {description}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-red-400 pt-0.5">
            <Icon icon="mdi:alert-circle-outline" className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
