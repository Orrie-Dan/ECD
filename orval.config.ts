import { defineConfig } from 'orval'

/**
 * Generates typed models + React Query hooks from the Phase 1 OpenAPI contract.
 * Spec is copied from ECD Backend (`openapi/openapi.json`), then nullable scalars
 * mis-emitted as empty objects are patched before Orval runs.
 *
 * Re-run: npm run api:generate
 */
export default defineConfig({
  ecd: {
    input: {
      target: './openapi/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints',
      schemas: './src/api/generated/models',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      prettier: false,
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
})
