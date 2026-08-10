import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const source = resolve(root, '../ECD Backend/openapi.generated.json')
const target = resolve(root, 'openapi/openapi.json')

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
console.log(`Synced OpenAPI → ${target}`)
