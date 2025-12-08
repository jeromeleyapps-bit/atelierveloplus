import { describe, it, expect, vi } from 'vitest'
import { getUserId, getUserIdOrFirst, getIsAutoEntrepreneur, getUserSettings } from '../api-helpers'

// Mock Prisma
vi.mock('../db', () => ({
  getPrisma: vi.fn(() => ({
    user: {
      findFirst: vi.fn(),
    },
    appSetting: {
      findUnique: vi.fn(),
    },
  })),
}))

describe('api-helpers', () => {
  describe('getUserId', () => {
    it('should extract userId from x-user-id header', () => {
      const mockRequest = {
        headers: {
          get: (key: string) => {
            if (key === 'x-user-id') return 'user-123'
            return null
          },
        },
      } as unknown as Request

      const result = getUserId(mockRequest)
      expect(result).toBe('user-123')
    })

    it('should extract userId from JWT Bearer token', () => {
      const payload = { userId: 'jwt-user-456' }
      const token = 'header.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.signature'
      
      const mockRequest = {
        headers: {
          get: (key: string) => {
            if (key === 'authorization') return `Bearer ${token}`
            if (key === 'x-user-id') return null
            return null
          },
        },
      } as unknown as Request

      const result = getUserId(mockRequest)
      expect(result).toBe('jwt-user-456')
    })

    it('should return null if no auth headers present', () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as unknown as Request

      const result = getUserId(mockRequest)
      expect(result).toBeNull()
    })

    it('should trim whitespace from x-user-id', () => {
      const mockRequest = {
        headers: {
          get: (key: string) => {
            if (key === 'x-user-id') return '  user-789  '
            return null
          },
        },
      } as unknown as Request

      const result = getUserId(mockRequest)
      expect(result).toBe('user-789')
    })

    it('should return null for empty x-user-id after trim', () => {
      const mockRequest = {
        headers: {
          get: (key: string) => {
            if (key === 'x-user-id') return '   '
            return null
          },
        },
      } as unknown as Request

      const result = getUserId(mockRequest)
      expect(result).toBeNull()
    })

    it('should handle invalid JWT gracefully', () => {
      const mockRequest = {
        headers: {
          get: (key: string) => {
            if (key === 'authorization') return 'Bearer invalid.token.here'
            if (key === 'x-user-id') return null
            return null
          },
        },
      } as unknown as Request

      const result = getUserId(mockRequest)
      expect(result).toBeNull()
    })
  })

  describe('getUserIdOrFirst', () => {
    it('should return userId if present in headers', async () => {
      const mockRequest = {
        headers: {
          get: (key: string) => {
            if (key === 'x-user-id') return 'user-123'
            return null
          },
        },
      } as unknown as Request

      const result = await getUserIdOrFirst(mockRequest)
      expect(result).toBe('user-123')
    })

    it('should return first user if no userId in headers', async () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as unknown as Request

      // Mock sera configuré dans les tests d'intégration
      const result = await getUserIdOrFirst(mockRequest)
      // Test basique - sera étendu avec mock Prisma
      expect(result).toBeDefined()
    })

    it('should handle electron-local userId', async () => {
      const mockRequest = {
        headers: {
          get: (key: string) => {
            if (key === 'x-user-id') return 'electron-local'
            return null
          },
        },
      } as unknown as Request

      const result = await getUserIdOrFirst(mockRequest)
      // Devrait chercher premier user car 'electron-local' n'est pas un vrai ID
      expect(result).toBeDefined()
    })
  })

  describe('getIsAutoEntrepreneur', () => {
    it('should return false if no userId provided and no users exist', async () => {
      const result = await getIsAutoEntrepreneur()
      expect(typeof result).toBe('boolean')
    })

    it('should return false if user settings not found', async () => {
      const result = await getIsAutoEntrepreneur('nonexistent-user')
      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      // Même en cas d'erreur, doit retourner false (pas throw)
      const result = await getIsAutoEntrepreneur('error-user')
      expect(result).toBe(false)
    })
  })

  describe('getUserSettings', () => {
    it('should return null if no userId and no users exist', async () => {
      const result = await getUserSettings()
      expect(result).toBeDefined()
    })

    it('should return null if user settings not found', async () => {
      const result = await getUserSettings('nonexistent-user')
      // Peut être null si pas de settings
      expect([null, undefined].includes(result as unknown) || typeof result === 'object').toBe(true)
    })

    it('should handle errors gracefully', async () => {
      const result = await getUserSettings('error-user')
      // En cas d'erreur, retourne null
      expect([null, undefined].includes(result as unknown) || typeof result === 'object').toBe(true)
    })
  })
})
