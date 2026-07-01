import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('/icons/custom/ff!-icon.svg?react', () => ({ default: () => null }))

import NotFound from './not-found'

const STORAGE_ROOT_PATH_KEY = 'active-project-root-path'

beforeEach(() => {
  navigateMock.mockClear()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('NotFound', () => {
  it('renders the not-found message', () => {
    render(<NotFound />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  describe('when no project has been opened', () => {
    it('offers a way back to the project landing', () => {
      render(<NotFound />)

      expect(screen.getByRole('button', { name: 'Back to projects' })).toBeInTheDocument()
    })

    it('navigates to the project landing on click', () => {
      render(<NotFound />)

      fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }))

      expect(navigateMock).toHaveBeenCalledWith('/')
    })
  })

  describe('when a project has been opened', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_ROOT_PATH_KEY, '/some/project/path')
    })

    it('offers a way back to the configuration overview', () => {
      render(<NotFound />)

      expect(screen.getByRole('button', { name: 'Back to overview' })).toBeInTheDocument()
    })

    it('navigates to the configuration overview on click', () => {
      render(<NotFound />)

      fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }))

      expect(navigateMock).toHaveBeenCalledWith('/configurations')
    })
  })
})
