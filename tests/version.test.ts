import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/version.js'

describe('version', () => {
  it('is a semver string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
