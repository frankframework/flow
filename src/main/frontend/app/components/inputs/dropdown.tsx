import React, { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'

export type DropdownOptions = Record<string, string>

export type DropdownProperties = {
  options: DropdownOptions
  onChange: (value: string) => void
  value?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}

export default function Dropdown({
  options,
  onChange,
  value,
  placeholder = 'Select an option',
  className,
  disabled = false,
  id,
}: Readonly<DropdownProperties>): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const dropdownReference = useRef<HTMLDivElement>(null)
  const optionsReference = useRef<(HTMLLIElement | null)[]>([])
  const listReference = useRef<HTMLUListElement>(null)

  const optionsArray = Object.keys(options)

  const getSelectedIndex = useCallback((): number => {
    const index = optionsArray.indexOf(selectedValue ?? '')
    return index === -1 ? 0 : index
  }, [optionsArray, selectedValue])

  const getSelectedLabel = (): string => {
    if (selectedValue !== undefined && Object.hasOwn(options, selectedValue)) return options[selectedValue]
    return placeholder
  }

  const toggleDropdown = useCallback((): void => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }, [disabled, isOpen])

  useEffect((): void => {
    setSelectedValue(value)
  }, [value])

  useEffect((): void => {
    if (isOpen) {
      dropdownReference.current?.focus()
    }
  }, [isOpen])

  useEffect((): void => {
    if (isOpen && highlightedIndex >= 0 && Object.hasOwn(optionsReference.current, highlightedIndex)) {
      optionsReference.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [isOpen, highlightedIndex])

  useEffect((): void => {
    optionsReference.current = optionsReference.current.slice(0, optionsArray.length)
  }, [optionsArray.length])

  useEffect((): (() => void) | undefined => {
    if (!id) return

    const labelElement = document.querySelector(`[for="${CSS.escape(id)}"]`) as HTMLLabelElement | null

    labelElement?.addEventListener('click', toggleDropdown)

    return (): void => {
      labelElement?.removeEventListener('click', toggleDropdown)
    }
  }, [id, toggleDropdown])

  const handleOptionClick = (optionValue: string): void => {
    setSelectedValue(optionValue)
    onChange(optionValue)
    closeDropdown()
  }

  const closeDropdown = (): void => {
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (disabled) return

    if (!isOpen) {
      handleClosedDropdownKeyDown(event)
      return
    }

    handleOpenDropdownKeyDown(event)
  }

  const handleClosedDropdownKeyDown = (event: React.KeyboardEvent): void => {
    const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' ']

    if (openKeys.includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      setIsOpen(true)
      setHighlightedIndex(getSelectedIndex())
    }
  }

  useEffect((): (() => void) | undefined => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent): void => {
      if (!dropdownReference.current) return

      if (!dropdownReference.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOpenDropdownKeyDown = (event: React.KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        event.stopPropagation()
        setHighlightedIndex((previous): number => Math.min(previous + 1, optionsArray.length - 1))
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        event.stopPropagation()
        setHighlightedIndex((previous): number => Math.max(previous - 1, 0))
        break
      }
      case 'Enter': {
        event.preventDefault()
        event.stopPropagation()
        if (highlightedIndex >= 0 && highlightedIndex < optionsArray.length) {
          handleOptionClick(optionsArray[highlightedIndex])
        }
        break
      }
      case 'Escape': {
        event.preventDefault()
        event.stopPropagation()
        setIsOpen(false)
        break
      }
    }
  }

  const setOptionReference =
    (index: number): ((element: HTMLLIElement | null) => void) =>
    (element: HTMLLIElement | null): void => {
      optionsReference.current[index] = element
    }

  return (
    <div ref={dropdownReference} className="inline-block w-full">
      <div
        className={clsx('relative inline-block w-full', disabled && 'cursor-not-allowed opacity-50', className)}
        tabIndex={disabled ? undefined : 0}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        role="combobox"
        id={id}
        aria-controls="listbox"
        aria-haspopup="listbox"
      >
        <div
          onClick={toggleDropdown}
          className={clsx(
            'border-border bg-backdrop flex items-center justify-between rounded-md border px-3 py-2',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            isOpen ? 'bg-selected' : 'hover:bg-hover',
          )}
        >
          <span
            className={clsx('text-foreground flex-1 truncate sm:text-sm', !selectedValue && 'text-foreground-muted')}
          >
            {getSelectedLabel()}
          </span>
          <AltArrowDownIcon className={clsx('fill-foreground h-4 w-4', isOpen && 'rotate-180')} />
        </div>
      </div>
      {isOpen && !disabled && (
        <ul
          ref={listReference}
          className={clsx(
            'border-border text-foreground bg-background absolute z-200 mt-1 max-h-60 overflow-auto rounded-md border py-1 shadow-lg',
            className,
          )}
        >
          {optionsArray.length > 0 ? (
            Object.entries(options).map(([value, label], index): React.JSX.Element => (
              <li
                key={value}
                ref={setOptionReference(index)}
                onClick={(): void => handleOptionClick(value)}
                className={clsx(
                  'relative cursor-pointer px-3 py-2 sm:text-sm',
                  value === selectedValue && 'font-medium',
                  highlightedIndex === index && 'bg-selected',
                  highlightedIndex === index ? 'hover:bg-selected' : 'hover:bg-hover',
                )}
              >
                {label}
                <div
                  className={clsx(
                    'absolute top-1/2 left-1 h-5 w-[2px] -translate-y-1/2 rounded',
                    value === selectedValue && 'bg-brand',
                  )}
                ></div>
              </li>
            ))
          ) : (
            <li className="text-foreground-muted px-3 py-2 sm:text-sm">No options available</li>
          )}
        </ul>
      )}
    </div>
  )
}
