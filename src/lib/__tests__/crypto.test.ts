import { encrypt, decrypt } from '../crypto'

describe('crypto', () => {
  beforeAll(() => {
    // S'assurer que ENCRYPTION_KEY est définie
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  })

  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'secret message'
      const encrypted = encrypt(plaintext)
      
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should produce different ciphertext for same plaintext (IV randomization)', () => {
      const plaintext = 'same message'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)
      
      // Doit être différent à cause de l'IV aléatoire
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty string', () => {
      const encrypted = encrypt('')
      expect(encrypted).toBeDefined()
      // Empty string peut retourner empty string (edge case acceptable)
      expect(typeof encrypted).toBe('string')
    })

    it('should handle unicode characters', () => {
      const plaintext = '🔐 Émojis et açcênts'
      const encrypted = encrypt(plaintext)
      expect(encrypted).toBeDefined()
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted string', () => {
      const plaintext = 'secret message'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should handle empty string', () => {
      const encrypted = encrypt('')
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe('')
    })

    it('should handle unicode characters', () => {
      const plaintext = '🔐 Émojis et açcênts'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000)
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should throw on invalid ciphertext', () => {
      // expect.fail est une API Vitest, absente de Jest : on exprime la même
      // intention avec toThrow, qui échoue aussi si rien n'est levé.
      expect(() => decrypt('invalid-ciphertext')).toThrow()
    })

    it('should throw on tampered ciphertext', () => {
      const plaintext = 'original message'
      const encrypted = encrypt(plaintext)
      const tampered = encrypted.slice(0, -5) + '12345'
      
      expect(() => decrypt(tampered)).toThrow()
    })
  })

  describe('encrypt/decrypt roundtrip', () => {
    const testCases = [
      'simple text',
      'Text with\nnewlines\nand\ttabs',
      'Special chars: !@#$%^&*()',
      'Numbers: 1234567890',
      JSON.stringify({ key: 'value', nested: { array: [1, 2, 3] } }),
      'Very long text: ' + 'x'.repeat(1000),
      '🔐🎉✅❌⚠️', // Emojis
      'Français: éàùçî',
      'Español: ñáéíóú',
    ]

    testCases.forEach((testCase) => {
      it(`should roundtrip: "${testCase.slice(0, 30)}..."`, () => {
        const encrypted = encrypt(testCase)
        const decrypted = decrypt(encrypted)
        expect(decrypted).toBe(testCase)
      })
    })
  })
})
