import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Global test setup
// Cleanup after each test to reset DOM state
afterEach(() => {
  cleanup()
})

export { expect }
