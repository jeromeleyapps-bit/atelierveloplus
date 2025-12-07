/**
 * Formatage utilities avec dayjs
 * 
 * Centralise tout le formatage de dates, prix, téléphones, etc.
 * 
 * Migration date-fns -> dayjs (22 MB -> 2 MB)
 */

import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';

// Configuration dayjs
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.locale('fr');

// === DATES ===

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = dayjs(date);
    if (!d.isValid()) return '-'
    return d.format('DD/MM/YYYY')
  } catch {
    return '-'
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = dayjs(date);
    if (!d.isValid()) return '-'
    return d.format('DD/MM/YYYY à HH:mm')
  } catch {
    return '-'
  }
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = dayjs(date);
    if (!d.isValid()) return '-'
    return d.format('dddd D MMMM YYYY')
  } catch {
    return '-'
  }
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = dayjs(date);
    if (!d.isValid()) return '-'
    return d.format('HH:mm')
  } catch {
    return '-'
  }
}

// === PRIX ===

export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPriceNoSymbol(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// === TÉLÉPHONE ===

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
  
  if (cleaned.length > 10) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3)}`
  }
  
  return phone
}

// === NOMBRES ===

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('fr-FR').format(num)
}

export function formatPercent(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) return '-'
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(percent / 100)
}

// === STRINGS ===

export function capitalize(str: string | null | undefined): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function truncate(str: string | null | undefined, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}
