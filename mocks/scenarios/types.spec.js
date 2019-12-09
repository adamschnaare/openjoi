import { SchemaParser, convert } from '../../src/index'
import { getDoc } from '../../src/lib/utils'
import Joi from '@hapi/joi'
import { CustomConsole } from '@jest/console'

describe('types', () => {
  const doc = getDoc('../../mocks/scenarios/types.json')
  const schemas = convert({ doc })

  /** typesMap: Array of Test Scenarios
   *
   * key: key in doc to test
   * type: Jooi type to expect
   * valid: array of valid payloads
   * invalid: array of invalid payloads
   */
  const typesMap = [
    {
      key: 'string',
      type: 'string',
      valid: ['string'],
      invalid: [1],
    },
    {
      key: 'string_enum',
      type: 'string',
      valid: ['one'],
      invalid: ['invalid'],
    },
    { key: 'number', type: 'number', valid: [1], invalid: ['1'] },
    {
      key: 'integer',
      type: 'number',
      valid: [1],
      invalid: ['1'],
    },
    {
      key: 'boolean',
      type: 'boolean',
      valid: [true],
      invalid: ['true'],
    },
    {
      key: 'object',
      type: 'object',
      valid: [{ one: 'string', two: 'string' }, { two: 'string' }],
      invalid: [{ one: 'string' }],
    },
    {
      key: 'object_noType',
      type: 'object',
      valid: [{ three: 'string', four: 'string' }, { three: 'string' }],
      invalid: [{ one: 'string' }],
    },
    {
      key: 'array',
      type: 'array',
      valid: [['string']],
      invalid: [[1], [1, 'string'], null],
    },
    {
      key: 'array_$ref',
      type: 'array',
      valid: [[1]],
      invalid: [[1, 'string']],
    },
    {
      key: 'object_oneOf',
      type: 'alternatives',
      valid: ['string', 1],
      invalid: [true, {}],
    },
    {
      key: 'object_anyOf',
      type: 'alternatives',
      valid: [{ two: 'string' }, { one: 'string', two: 'string' }, ['string']],
      invalid: [{ one: 'string' }, [true]],
    },
    {
      key: 'object_allOf',
      type: 'object',
      valid: [
        { one: 'string', two: 'string', alpha: 'string', beta: 'string' },
        { two: 'string', alpha: 'string' },
      ],
      invalid: [
        { one: 'string', alpha: 'string', beta: 'string' }, // without required properties in one of the schemas
        { one: 'string', beta: 'string' }, // without required properties in each schema
        { one: 'string', two: 'string' }, // only one of the schemas
      ],
    },
    {
      key: 'object_allOf_noType',
      type: 'object',
      valid: [{}, {}],
      invalid: [{ two: 'string' }],
    },
    {
      key: 'object_recursiveFail',
      type: 'object',
      valid: [
        {
          object_recursiveFail: 'anything',
        },
      ],
      invalid: ['string'],
    },
    {
      key: 'object_recursiveFail_oneOf',
      type: 'object',
      valid: [
        {
          string_number: ['anything'],
        },
      ],
      invalid: ['invalid'],
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
      valid.forEach(item => {
        const { error, value } = schemas[key].validate(item)
        expect(error).toBeUndefined()
      })
    })
  })
  test('should throw', () => {
    typesMap.forEach(({ key, invalid }) => {
      invalid.forEach(item => {
        const { error, value } = schemas[key].validate(item)
        expect(error).toBeDefined()
      })
    })
  })

  // const { error, value } = schemas[id].validate(payload)

  // expect(error).toBeUndefined()

  // TODO: Next - resolve this test
})
