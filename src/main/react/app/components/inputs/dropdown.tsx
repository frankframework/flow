import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import AltArrowDownIcon from '/icons/solar/Alt Arrow Down.svg?react'

export type DropdownOptions = Record<string, string>

export interface DropdownProperties {
  options: DropdownOptions
  onChange: (value: string) => void
  value?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function Dropdown({
  options,
  onChange,
  value,
  placeholder = 'Select an option',
  className,
  disabled = false,
}: Readonly<DropdownProperties>) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const dropdownReference = useRef<HTMLDivElement>(null)
  const optionsReference = useRef<(HTMLLIElement | null)[]>([])
  const listReference = useRef<HTMLUListElement>(null)

  const optionsArray = Object.keys(options)

  useEffect(() => {
    setSelectedValue(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownReference.current && !dropdownReference.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(getSelectedIndex())
      dropdownReference.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsReference.current[highlightedIndex]) {
      optionsReference.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [isOpen, highlightedIndex])

  useEffect(() => {
    optionsReference.current = optionsReference.current.slice(0, optionsArray.length)
  }, [options])

  const getSelectedIndex = () => {
    const index = optionsArray.indexOf(selectedValue ?? '')
    return index === -1 ? 0 : index
  }

  const getSelectedLabel = () => {
    return selectedValue ? options[selectedValue] : placeholder
  }

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleOptionClick = (optionValue: string) => {
    setSelectedValue(optionValue)
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      handleClosedDropdownKeyDown(event)
      return
    }

    handleOpenDropdownKeyDown(event)
  }

  const handleClosedDropdownKeyDown = (event: React.KeyboardEvent) => {
    const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' ']

    if (openKeys.includes(event.key)) {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex(getSelectedIndex())
    }
  }

  const handleOpenDropdownKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        setHighlightedIndex((previousIndex) =>
          previousIndex < optionsArray.length - 1 ? previousIndex + 1 : previousIndex,
        )
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        setHighlightedIndex((previousIndex) => (previousIndex > 0 ? previousIndex - 1 : 0))
        break
      }
      case 'Enter': {
        event.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < optionsArray.length) {
          handleOptionClick(optionsArray[highlightedIndex])
        }
        break
      }
      case 'Escape': {
        event.preventDefault()
        setIsOpen(false)
        break
      }
    }
  }

  const setOptionReference = (index: number) => (element: HTMLLIElement | null) => {
    optionsReference.current[index] = element
  }

  return (
    <div
      ref={dropdownReference}
      className={clsx('relative inline-block w-full', disabled && 'cursor-not-allowed opacity-50', className)}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={handleKeyDown}
      aria-expanded={isOpen}
      role="combobox"
    >
      <div
        onClick={toggleDropdown}
        className={clsx(
          'flex items-center justify-between rounded-md border border-gray-200 px-3 py-2',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span className={clsx('block truncate text-gray-950 sm:text-sm', !selectedValue && 'text-gray-400')}>
          {getSelectedLabel()}
        </span>
        <AltArrowDownIcon className={clsx('h-4 w-4 fill-gray-500', isOpen && 'rotate-180')} />
      </div>

      {isOpen && !disabled && (
        <ul
          ref={listReference}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-gray-950 shadow-lg"
        >
          {optionsArray.length > 0 ? (
            Object.entries(options).map(([value, label], index) => (
              <li
                key={value}
                ref={(element) => (optionsReference.current[index] = element)}
                onClick={() => handleOptionClick(value)}
                className={clsx(
                  'relative cursor-pointer px-3 py-2 sm:text-sm',
                  value === selectedValue && 'font-medium',
                  highlightedIndex === index && 'bg-gray-50',
                  value === selectedValue || highlightedIndex === index ? 'hover:bg-gray-100' : 'hover:bg-gray-50',
                )}
              >
                {label}
                <div
                  className={clsx(
                    'absolute top-1/2 left-1 h-5 w-[2px] -translate-y-1/2 rounded',
                    value === selectedValue && 'bg-[var(--color-brand)]',
                  )}
                ></div>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-gray-400 sm:text-sm">No options available</li>
          )}
        </ul>
      )}
    </div>
  )
}
