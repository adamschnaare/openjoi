import { SchemaParser, convert } from '../../src/index'
import { getDoc } from '../../src/lib/utils'
import Joi from '@hapi/joi'
import { CustomConsole } from '@jest/console'

describe('types', () => {
  const doc = getDoc('../../mocks/scenarios/types.json')
  const schemas = convert({ doc })
  // Map of doc keys to test, expected Joi types, and valid & invalid payloads
  const typesMap = [
    { key: 'string', type: 'string', valid: 'string', invalid: 1 },
    { key: 'string_enum', type: 'string', valid: 'one', invalid: 'invalid' },
    { key: 'number', type: 'number', valid: 1, invalid: '1' },
    { key: 'integer', type: 'number', valid: 1, invalid: '1' },
    { key: 'boolean', type: 'boolean', valid: true, invalid: 'true' },
    {
      key: 'object',
      type: 'object',
      valid: { one: 'string', two: 'string' },
      invalid: 'string',
    },
    {
      key: 'object',
      type: 'object',
      valid: { one: 'string', two: 'string' },
      invalid: { one: 'string' },
    },
    {
      key: 'object_noType',
      type: 'object',
      valid: { three: 'string', four: 'string' },
      invalid: 'invalid',
    },
    {
      key: 'array',
      type: 'array',
      valid: ['string', 'string'],
      invalid: [1, 2],
    },
    {
      key: 'array',
      type: 'array',
      valid: ['string', 'string'],
      invalid: null,
    },
    {
      key: 'array_$ref',
      type: 'array',
      valid: [1, 2],
      invalid: ['string', 2],
    },
    {
      key: 'object_oneOf',
      type: 'alternatives',
      valid: 'string',
      invalid: { string: 'string' },
    },
    {
      key: 'object_anyOf',
      type: 'alternatives',
      valid: { one: 'string', two: 'string' },
      invalid: { string: 'string' },
    },
    {
      key: 'object_allOf',
      type: 'object',
      valid: { one: 'string', two: 'string', alpha: 'string', beta: 'string' },
      invalid: 'string',
    },
    {
      key: 'object_recursiveFail',
      type: 'object',
      valid: {
        object_recursiveFail: 'anything',
      },
      invalid: 'invalid',
    },
    {
      key: 'object_recursiveFail_oneOf',
      type: 'object',
      valid: {
        string_number: ['anything'],
      },
      invalid: 'invalid',
    },
  ]

  // string, string_enum
  test('should convert', () => {
    expect(typeof schemas).toBe('object')
    typesMap.forEach(({ key, type }) => {
      expect(Joi.isSchema(schemas[key])).toBe(true)
      expect(schemas[key].type).toBe(type)
    })
  })
  test('should validate', () => {
    typesMap.forEach(({ key, valid }) => {
      const { error, value } = schemas[key].validate(valid)
      expect(error).toBeUndefined()
    })
  })
  test('should throw', () => {
    typesMap.forEach(({ key, invalid }) => {
      const { error, value } = schemas[key].validate(invalid)
      expect(error).toBeDefined()
    })
  })

  // const { error, value } = schemas[id].validate(payload)

  // expect(error).toBeUndefined()

  // TODO: Next - resolve this test
})
