import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

const { navigateMock } = vi.hoisted((): { navigateMock: Mock } => ({ navigateMock: vi.fn() }))

vi.mock('react-router', (): { useNavigate: () => Mock } => ({
  useNavigate: (): Mock => navigateMock,
}))
vi.mock('/icons/custom/ff!-icon.svg?react', (): { default: () => null } => ({ default: (): null => null }))

import NotFound from './not-found'

const STORAGE_ROOT_PATH_KEY = 'active-project-root-path'

beforeEach((): void => {
  navigateMock.mockClear()
  localStorage.clear()
})

afterEach((): void => {
  cleanup()
})

describe('NotFound', (): void => {
  it('renders the not-found message', (): void => {
    render(<NotFound />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  describe('when no project has been opened', (): void => {
    it('offers a way back to the project landing', (): void => {
      render(<NotFound />)

      expect(screen.getByRole('button', { name: 'Back to projects' })).toBeInTheDocument()
    })

    it('navigates to the project landing on click', (): void => {
      render(<NotFound />)

      fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }))

      expect(navigateMock).toHaveBeenCalledWith('/')
    })
  })

  describe('when a project has been opened', (): void => {
    beforeEach((): void => {
      localStorage.setItem(STORAGE_ROOT_PATH_KEY, '/some/project/path')
    })

    it('offers a way back to the configuration overview', (): void => {
      render(<NotFound />)

      expect(screen.getByRole('button', { name: 'Back to overview' })).toBeInTheDocument()
    })

    it('navigates to the configuration overview on click', (): void => {
      render(<NotFound />)

      fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }))

      expect(navigateMock).toHaveBeenCalledWith('/configurations')
    })
  })
})
