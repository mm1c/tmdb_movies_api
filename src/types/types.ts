export interface ValidationError {
  type: string
  value: string
  msg: string
  path: string
  location: string
}

export interface TMDBQueryParams {
  key: string
  value: string | number | boolean
}

export interface CacheGetResponse {
  inCache: boolean
  data?: any[]
  error?: any
}

export interface MoviesResponse {
  success: boolean
  data?: any[]
  error?: any
}

export interface ApiRequestItem {
  date: string
  key: string
  total_hits: number
  cache_hits: number
}

export const enum HitCounterUpdateType {
  GET,
  SET
}