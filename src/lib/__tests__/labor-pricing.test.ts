import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateLaborCost, formatDuration } from '../labor-pricing'

// Mock Prisma
const mockPrisma = {
  globalSetting: {
    findUnique: vi.fn(),
  },
}

vi.mock('../db', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}))

describe('labor-pricing', () => {
  beforeEach(() => {
    // Reset tous les mocks avant chaque test
    vi.clearAllMocks()
  })

  describe('calculateLaborCost', () => {
    describe('Facturation par tranches de 30 min', () => {
      it('should calculate 25 min → 0.5h × 60€ = 30€', async () => {
        // Arrange: Mock pas de setting (utilise défaut 60€)
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(25, null)

        // Assert
        expect(result).toEqual({
          billableHours: 0.5,
          hourlyRate: 60,
          laborCostHT: 30,
        })
      })

      it('should calculate 45 min → 1h × 60€ = 60€', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(45, null)

        // Assert
        expect(result).toEqual({
          billableHours: 1,
          hourlyRate: 60,
          laborCostHT: 60,
        })
      })

      it('should calculate 75 min → 1.5h × 60€ = 90€', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(75, null)

        // Assert
        expect(result).toEqual({
          billableHours: 1.5,
          hourlyRate: 60,
          laborCostHT: 90,
        })
      })

      it('should calculate 1 min → 0.5h (tranche minimale)', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(1, null)

        // Assert
        expect(result.billableHours).toBe(0.5)
        expect(result.laborCostHT).toBe(30) // 0.5h × 60€
      })

      it('should calculate 30 min → 0.5h (limite tranche)', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(30, null)

        // Assert
        expect(result.billableHours).toBe(0.5)
        expect(result.laborCostHT).toBe(30)
      })

      it('should calculate 31 min → 1h (nouvelle tranche)', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(31, null)

        // Assert
        expect(result.billableHours).toBe(1)
        expect(result.laborCostHT).toBe(60)
      })

      it('should calculate 60 min → 1h', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(60, null)

        // Assert
        expect(result.billableHours).toBe(1)
        expect(result.laborCostHT).toBe(60)
      })

      it('should calculate 61 min → 1.5h', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(61, null)

        // Assert
        expect(result.billableHours).toBe(1.5)
        expect(result.laborCostHT).toBe(90)
      })

      it('should calculate 120 min → 2h', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(120, null)

        // Assert
        expect(result.billableHours).toBe(2)
        expect(result.laborCostHT).toBe(120) // 2h × 60€
      })
    })

    describe('Tarif horaire personnalisé', () => {
      it('should use custom hourly rate: 45 min × 50€ = 50€', async () => {
        // Arrange: Tarif personnalisé fourni
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(45, 50)

        // Assert
        expect(result).toEqual({
          billableHours: 1,
          hourlyRate: 50, // Tarif custom
          laborCostHT: 50, // 1h × 50€
        })
      })

      it('should use custom hourly rate: 75 min × 80€ = 120€', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(75, 80)

        // Assert
        expect(result).toEqual({
          billableHours: 1.5,
          hourlyRate: 80,
          laborCostHT: 120, // 1.5h × 80€
        })
      })

      it('should prioritize workOrderHourlyRate over GlobalSetting', async () => {
        // Arrange: Setting global à 70€, mais workOrder à 50€
        mockPrisma.globalSetting.findUnique.mockResolvedValue({
          id: '1',
          key: 'pricing.hourlyRate',
          value: '70',
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Act: Tarif workOrder fourni
        const result = await calculateLaborCost(30, 50)

        // Assert: Doit utiliser 50€ (pas 70€)
        expect(result.hourlyRate).toBe(50)
        expect(result.laborCostHT).toBe(25) // 0.5h × 50€
        // Ne doit PAS appeler DB si tarif fourni
        expect(mockPrisma.globalSetting.findUnique).not.toHaveBeenCalled()
      })
    })

    describe('GlobalSetting hourlyRate', () => {
      it('should read hourlyRate from GlobalSetting', async () => {
        // Arrange: Setting à 75€
        mockPrisma.globalSetting.findUnique.mockResolvedValue({
          id: '1',
          key: 'pricing.hourlyRate',
          value: '75',
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Act: Pas de tarif workOrder
        const result = await calculateLaborCost(30, null)

        // Assert
        expect(mockPrisma.globalSetting.findUnique).toHaveBeenCalledWith({
          where: { key: 'pricing.hourlyRate' },
        })
        expect(result.hourlyRate).toBe(75)
        expect(result.laborCostHT).toBe(37.5) // 0.5h × 75€
      })

      it('should use default 60€ if GlobalSetting not found', async () => {
        // Arrange: Pas de setting
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(30, null)

        // Assert
        expect(result.hourlyRate).toBe(60) // Défaut
        expect(result.laborCostHT).toBe(30)
      })

      it('should use default 60€ if GlobalSetting value is invalid', async () => {
        // Arrange: Valeur invalide
        mockPrisma.globalSetting.findUnique.mockResolvedValue({
          id: '1',
          key: 'pricing.hourlyRate',
          value: 'invalid', // Pas un nombre
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Act
        const result = await calculateLaborCost(30, null)

        // Assert
        expect(result.hourlyRate).toBe(60) // Défaut car NaN
        expect(result.laborCostHT).toBe(30)
      })

      it('should use default 60€ if GlobalSetting value is negative', async () => {
        // Arrange: Valeur négative
        mockPrisma.globalSetting.findUnique.mockResolvedValue({
          id: '1',
          key: 'pricing.hourlyRate',
          value: '-50',
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Act
        const result = await calculateLaborCost(30, null)

        // Assert
        expect(result.hourlyRate).toBe(60) // Défaut car <= 0
        expect(result.laborCostHT).toBe(30)
      })

      it('should use default 60€ if GlobalSetting value is zero', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue({
          id: '1',
          key: 'pricing.hourlyRate',
          value: '0',
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Act
        const result = await calculateLaborCost(30, null)

        // Assert
        expect(result.hourlyRate).toBe(60)
      })

      it('should handle DB error gracefully and use default', async () => {
        // Arrange: Erreur DB
        mockPrisma.globalSetting.findUnique.mockRejectedValue(
          new Error('Database error')
        )

        // Act: Ne doit PAS throw
        const result = await calculateLaborCost(30, null)

        // Assert: Utilise valeur par défaut
        expect(result.hourlyRate).toBe(60)
        expect(result.laborCostHT).toBe(30)
      })
    })

    describe('Valeurs null/undefined/0', () => {
      it('should return 0€ for null minutes', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(null, null)

        // Assert
        expect(result).toEqual({
          billableHours: 0,
          hourlyRate: 60,
          laborCostHT: 0,
        })
      })

      it('should return 0€ for undefined minutes', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(undefined, null)

        // Assert
        expect(result).toEqual({
          billableHours: 0,
          hourlyRate: 60,
          laborCostHT: 0,
        })
      })

      it('should return 0€ for 0 minutes', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(0, null)

        // Assert
        expect(result).toEqual({
          billableHours: 0,
          hourlyRate: 60,
          laborCostHT: 0,
        })
      })

      it('should return 0€ for negative minutes', async () => {
        // Arrange
        mockPrisma.globalSetting.findUnique.mockResolvedValue(null)

        // Act
        const result = await calculateLaborCost(-10, null)

        // Assert
        expect(result).toEqual({
          billableHours: 0,
          hourlyRate: 60,
          laborCostHT: 0,
        })
      })
    })
  })

  describe('formatDuration', () => {
    it('should format 0 minutes', () => {
      expect(formatDuration(0)).toBe('0min')
    })

    it('should format null as 0min', () => {
      expect(formatDuration(null)).toBe('0min')
    })

    it('should format undefined as 0min', () => {
      expect(formatDuration(undefined)).toBe('0min')
    })

    it('should format negative as 0min', () => {
      expect(formatDuration(-5)).toBe('0min')
    })

    it('should format 25 minutes', () => {
      expect(formatDuration(25)).toBe('25min')
    })

    it('should format 45 minutes', () => {
      expect(formatDuration(45)).toBe('45min')
    })

    it('should format 60 minutes as 1h', () => {
      expect(formatDuration(60)).toBe('1h')
    })

    it('should format 75 minutes as 1h 15min', () => {
      expect(formatDuration(75)).toBe('1h 15min')
    })

    it('should format 120 minutes as 2h', () => {
      expect(formatDuration(120)).toBe('2h')
    })

    it('should format 125 minutes as 2h 5min', () => {
      expect(formatDuration(125)).toBe('2h 5min')
    })

    it('should format 1 minute', () => {
      expect(formatDuration(1)).toBe('1min')
    })

    it('should format 180 minutes as 3h', () => {
      expect(formatDuration(180)).toBe('3h')
    })

    it('should format 185 minutes as 3h 5min', () => {
      expect(formatDuration(185)).toBe('3h 5min')
    })
  })
})
