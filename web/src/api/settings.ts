import { request, authToken, uploadFile } from './client'

export function getSettings() {
  return request<Record<string, string>>('/admin/settings', { token: authToken()! })
}

export function updateSetting(key: string, value: string) {
  return request<{ key: string; value: string }>(
    '/admin/settings',
    { method: 'PUT', body: { key, value }, token: authToken()! },
  )
}

export interface CarouselImageInfo {
  filename: string
  url: string
}

export interface CarouselImagesResponse {
  available: CarouselImageInfo[]
  active: string[]
}

export function getCarouselImages() {
  return request<CarouselImagesResponse>('/admin/carousel-images', { token: authToken()! })
}

export function updateCarouselImages(active: string[]) {
  return updateSetting('login_carousel_images', JSON.stringify(active))
}

export function uploadCarouselImage(file: File) {
  return uploadFile<{ message: string; image: CarouselImageInfo }>(
    '/admin/carousel-images/upload',
    file,
    authToken()!,
  )
}

export function deleteCarouselImage(filename: string) {
  return request<{ message: string }>(
    `/admin/carousel-images/${encodeURIComponent(filename)}`,
    { method: 'DELETE', token: authToken()! },
  )
}
