/**
 * NestJS Swagger often emits nullable scalars as `{ type: "object", nullable: true }`
 * when reflection loses `string | null` / `number | null`. Orval then generates
 * `{ [key: string]: unknown } | null` instead of `string | null` / `number | null`.
 *
 * This patches empty nullable object schemas to the inferred scalar type.
 * Run after syncing OpenAPI and before `orval`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const target = resolve(__dirname, '../openapi/openapi.json')

const KEEP_AS_OBJECT = new Set([
  'AuditLogResponseDto.oldValues',
  'AuditLogResponseDto.newValues',
  'AuditLogResponseDto.metadata',
])

const NUMBER_NAME =
  /^(capacity|latitude|longitude|rate|coverage|score|weight|latrineCount|attendanceRate|feedingCoverage|screeningCoverage|averageScore|averageCompletionDays|classificationNullRate)$/i

function inferScalarType(schemaName, propName, def) {
  const key = `${schemaName}.${propName}`
  if (KEEP_AS_OBJECT.has(key)) return null

  if (def.format === 'uuid' || def.format === 'email' || def.format === 'date-time' || def.format === 'date') {
    return 'string'
  }
  if (typeof def.example === 'string') return 'string'
  if (typeof def.example === 'number') return 'number'
  if (NUMBER_NAME.test(propName)) return 'number'
  // Nest bug default: nullable scalars without shape are almost always strings
  return 'string'
}

const spec = JSON.parse(readFileSync(target, 'utf8'))
const schemas = spec.components?.schemas ?? {}
let patched = 0

for (const [schemaName, schema] of Object.entries(schemas)) {
  if (!schema?.properties) continue
  for (const [propName, def] of Object.entries(schema.properties)) {
    if (
      def?.type !== 'object' ||
      def.nullable !== true ||
      def.additionalProperties ||
      def.properties ||
      def.$ref ||
      def.oneOf ||
      def.anyOf ||
      def.allOf
    ) {
      continue
    }
    const nextType = inferScalarType(schemaName, propName, def)
    if (!nextType) continue
    def.type = nextType
    patched += 1
  }
}

writeFileSync(target, `${JSON.stringify(spec, null, 2)}\n`)
console.log(`Patched ${patched} nullable scalar schema(s) in ${target}`)
