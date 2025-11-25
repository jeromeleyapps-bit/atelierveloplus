/**
 * Axios HTTP Client Configuration
 * 
 * Client HTTP configuré avec interceptors pour:
 * - Gestion automatique JWT
 * - Gestion erreurs 401 (auth expirée)
 * - Logging en développement
 */

import axios, { AxiosError } from 'axios'
import { logger } from '@/lib/logger';

const BASE_URL = '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// REQUEST INTERCEPTOR: Ajoute JWT automatiquement
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('jwt_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[API Request] ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// RESPONSE INTERCEPTOR: Gère 401, 403, etc.
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[API Success] ${response.config.method?.toUpperCase()} ${response.config.url}`)
    }
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        if (currentPath !== '/auth/login') {
          sessionStorage.setItem('redirectAfterLogin', currentPath)
        }
        
        window.localStorage.removeItem('jwt_token')
        window.location.assign('/auth/login')
      }
    }
    
    if (error.response?.status === 403) {
      logger.error('[API] Accès refusé:', error.response.data)
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error)
    }
    
    return Promise.reject(error)
  }
)

// HELPER FUNCTIONS
export async function get<T>(url: string, config = {}) {
  const response = await apiClient.get<T>(url, config)
  return response.data
}

export async function post<T>(url: string, data?: unknown, config = {}) {
  const response = await apiClient.post<T>(url, data, config)
  return response.data
}

export async function put<T>(url: string, data?: unknown, config = {}) {
  const response = await apiClient.put<T>(url, data, config)
  return response.data
}

export async function patch<T>(url: string, data?: unknown, config = {}) {
  const response = await apiClient.patch<T>(url, data, config)
  return response.data
}

export async function del<T>(url: string, config = {}) {
  const response = await apiClient.delete<T>(url, config)
  return response.data
}
