import path from 'path'
import { readFileSync } from 'fs'

export const getDoc = relativePath => {
  const docPath = path.join(__dirname, relativePath)
  const doc = JSON.parse(readFileSync(docPath, 'utf-8'))

  return doc
}
