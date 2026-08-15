/**
 * @jest-environment node
 *
 * jose s'appuie sur structuredClone et sur la Web Crypto API, absents de jsdom.
 * Ce module est de toute façon serveur : il se teste en environnement node.
 */
import { generateToken, verifyToken, type JWTPayload } from '../jwt'

describe('jwt', () => {
  beforeAll(() => {
    // S'assurer que JWT_SECRET est défini
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = '0'.repeat(128)
    }
  })

  describe('generateToken', () => {
    it('should generate a JWT token', async () => {
      const payload: JWTPayload = { 
        userId: 'user-123', 
        email: 'test@example.com',
        role: 'admin'
      }
      const token = await generateToken(payload)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format: header.payload.signature
    })

    it('should generate different tokens for same payload', async () => {
      const payload: JWTPayload = { 
        userId: 'user-123', 
        email: 'test@example.com',
        role: 'user'
      }
      const token1 = await generateToken(payload)
      // Delay 1 seconde pour garantir iat différent (JWT timestamp en secondes)
      await new Promise(resolve => setTimeout(resolve, 1100))
      const token2 = await generateToken(payload)
      
      // Tokens should be different (different iat)
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const payload: JWTPayload = { 
        userId: 'user-456', 
        email: 'user@test.com',
        role: 'user'
      }
      const token = await generateToken(payload)
      const verified = await verifyToken(token)
      
      expect(verified).not.toBeNull()
      expect(verified?.userId).toBe('user-456')
      expect(verified?.email).toBe('user@test.com')
      expect(verified?.role).toBe('user')
    })

    it('should return null for invalid token', async () => {
      const result = await verifyToken('invalid.token.here')
      expect(result).toBeNull()
    })

    it('should return null for tampered token', async () => {
      const payload: JWTPayload = { 
        userId: 'user-123', 
        email: 'test@example.com',
        role: 'admin'
      }
      const token = await generateToken(payload)
      const parts = token.split('.')
      const tampered = parts[0] + '.' + parts[1] + '.tampered'
      
      const result = await verifyToken(tampered)
      expect(result).toBeNull()
    })

    it('should verify and extract all payload fields', async () => {
      const payload: JWTPayload = { 
        userId: 'user-999', 
        email: 'full@test.com',
        role: 'admin'
      }
      const token = await generateToken(payload)
      const verified = await verifyToken(token)
      
      expect(verified).not.toBeNull()
      expect(verified?.userId).toBe('user-999')
      expect(verified?.email).toBe('full@test.com')
      expect(verified?.role).toBe('admin')
    })
  })

  describe('generateToken/verifyToken roundtrip', () => {
    const testPayloads: JWTPayload[] = [
      { userId: 'user-1', email: 'user1@test.com', role: 'user' },
      { userId: 'admin-1', email: 'admin@test.com', role: 'admin' },
      { userId: 'test-123', email: 'test@example.org', role: 'user' },
    ]

    testPayloads.forEach((payload, index) => {
      it(`should roundtrip payload ${index + 1}`, async () => {
        const token = await generateToken(payload)
        const verified = await verifyToken(token)
        
        expect(verified).not.toBeNull()
        expect(verified?.userId).toBe(payload.userId)
        expect(verified?.email).toBe(payload.email)
        expect(verified?.role).toBe(payload.role)
      })
    })
  })
})
