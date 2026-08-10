import Axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { env } from '@/config/env'
import { attachAuthInterceptors } from '@/api/interceptors'

/**
 * Shared Axios instance for all LIVE API calls.
 * Orval-generated hooks use {@link customInstance} as their mutator.
 */
export const apiClient = Axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

attachAuthInterceptors(apiClient)

/**
 * Orval mutator — returns response `data` directly.
 * @see https://orval.dev/guides/custom-axios
 */
export function customInstance<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  const source = Axios.CancelToken.source()

  const promise = apiClient({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then((response: AxiosResponse<T>) => response.data)

  // Orval attaches `.cancel` for React Query abort compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(promise as any).cancel = () => {
    source.cancel('Query was cancelled')
  }

  return promise
}

export default customInstance
