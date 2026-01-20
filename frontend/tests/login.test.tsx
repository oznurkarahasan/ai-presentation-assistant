import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LoginPage from '../app/(auth)/login/page'
import React from 'react'

// 1. Mock Next.js Navigation
const mockPush = vi.fn()
const mockGet = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useSearchParams: () => ({
        get: mockGet,
    }),
}))

// 2. Mock Lucide Icons (named exports)
vi.mock('lucide-react', () => ({
    Mail: () => <div data-testid="mail-icon" />,
    Lock: () => <div data-testid="lock-icon" />,
    ArrowRight: () => <div data-testid="arrow-right-icon" />,
    Github: () => <div data-testid="github-icon" />,
    Chrome: () => <div data-testid="chrome-icon" />,
    CheckCircle2: () => <div data-testid="check-circle-icon" />,
    AlertCircle: () => <div data-testid="alert-circle-icon" />,
}))

// 3. Mock Framer Motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
        h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => <h1 {...props}>{children}</h1>,
        p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => <p {...props}>{children}</p>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// 4. Mock API Client
vi.mock('../../api/client', () => ({
    default: {
        post: vi.fn(),
    },
}))

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGet.mockReturnValue(null)
    })

    it('renders login form correctly', () => {
        render(<LoginPage />)

        // We use getByPlaceholderText because labels might be hard to match with icons inside
        expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
    })

    it('updates input values on change', () => {
        render(<LoginPage />)

        const emailInput = screen.getByPlaceholderText(/name@example.com/i) as HTMLInputElement
        const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })

        expect(emailInput.value).toBe('test@example.com')
        expect(passwordInput.value).toBe('password123')
    })

    it('submits the form with credentials', async () => {
        render(<LoginPage />)

        const emailInput = screen.getByPlaceholderText(/name@example.com/i)
        const passwordInput = screen.getByPlaceholderText(/••••••••/i)
        const submitButton = screen.getByRole('button', { name: /Sign In/i })

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(submitButton)

        // Check if loading state appears (button text changes)
        expect(screen.getByText(/Signing In.../i)).toBeInTheDocument()
    })
})
