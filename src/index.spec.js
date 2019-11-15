import { SchemaParser, convert } from './index'
import { getDoc } from './lib/utils'
import Joi from '@hapi/joi'

const doc = getDoc('../../mocks/petstore-expanded.json')

describe('convert', () => {
  test('should return an object of Joi schemas', () => {
    const schemas = convert({ doc })

    expect(typeof schemas).toBe('object')
  })

  test('should throw for an invalid document', () => {
    let invalidDoc = { ...doc }
    delete invalidDoc.components.schemas
    let error = undefined

    try {
      const schemas = convert({ doc: invalidDoc })
    } catch (e) {
      error = e
    }

    expect(error).toBeDefined()
  })
})

describe('SchemaParser', () => {
  const schemas = doc.components.schemas
  const { joiSchemas } = new SchemaParser({ schemas })

  test('should return an object of Joi schemas', () => {
    let areJoiSchemas = true
    for (const prop in joiSchemas) {
      if (!Joi.isSchema(joiSchemas[prop])) {
        areJoiSchemas = false
      }
    }
    expect(typeof joiSchemas).toBe('object')
    expect(areJoiSchemas).toBe(true)
  })

  test('should validate a schema correctly', () => {
    const id = 'NewPet'
    const payload = {
      name: 'string',
      tag: 'string',
    }

    const { error, value } = joiSchemas[id].validate(payload)

    expect(value).toBeDefined()
    expect(value).toMatchObject(payload)
    expect(error).toBeUndefined()
  })

  test('should parse `other` schemas', () => {
    const id = 'Other'

    expect(Joi.isSchema(joiSchemas[id])).toBe(true)
    expect(joiSchemas[id].type).toBe('any')
  })

  describe('schemas that contain `type` properties', () => {
    test('should throw an error for an invalid data type', () => {
      const id = 'NewPet'
      const payload = {
        name: 'string',
        tag: 1,
      }

      const { error, value } = joiSchemas[id].validate(payload)

      expect(error).toBeDefined()
    })

    test('should throw an error for a missing required field', () => {
      const id = 'NewPet'
      const payload = {
        tag: 'string',
      }

      const { error, value } = joiSchemas[id].validate(payload)
      expect(error).toBeDefined()
    })

    test('should parse `custom` schema types', () => {
      const id = 'CustomType'

      expect(Joi.isSchema(joiSchemas[id])).toBe(true)
    })
  })

  describe('schemas that contain `allOf` properties', () => {
    const id = 'Pet'
    const schema = joiSchemas[id]

    test('should parse', () => {
      expect(typeof schema).toBe('object')
      expect(Joi.isSchema(schema)).toBe(true)
    })

    test('should validate', () => {
      const payload = [
        {
          name: 'string',
          tag: 'string',
        },
        { id: 1234 },
      ]

      const { error, value } = schema.validate(payload)

      expect(value).toBeDefined()
      expect(value).toMatchObject(payload)
      expect(error).toBeUndefined()
    })

    test('should throw for missing required field', () => {
      const payload = [
        {
          name: 'string',
          tag: 'string',
        },
      ]

      const { error, value } = schema.validate(payload)

      expect(error).toBeDefined()
    })
  })

  describe('schemas that contain `anyOf` properties', () => {
    const id = 'Pet_anyOf'
    const schema = joiSchemas[id]

    test('should parse', () => {
      expect(typeof schema).toBe('object')
      expect(Joi.isSchema(schema)).toBe(true)
    })

    test('should validate', () => {
      const payload = [
        {
          name: 'string',
          tag: 'string',
        },
        { id: 1234 },
      ]

      const { error, value } = schema.validate(payload)

      expect(value).toBeDefined()
      expect(value).toMatchObject(payload)
      expect(error).toBeUndefined()
    })
    test('should not throw if schemas are missing', () => {
      const payload = []

      const { error, value } = schema.validate(payload)

      expect(error).toBeUndefined()
    })
  })

  describe('schemas that contain `oneOf` properties', () => {
    const id = 'Pet_oneOf'
    const schema = joiSchemas[id]

    test('should parse', () => {
      expect(typeof schema).toBe('object')
      expect(Joi.isSchema(schema)).toBe(true)
    })

    test('should validate', () => {
      const payload = [
        {
          name: 'string',
          tag: 'string',
        },
        { id: 1234 },
      ]

      const { error, value } = schema.validate(payload)

      expect(value).toBeDefined()
      expect(value).toMatchObject(payload)
      expect(error).toBeUndefined()
    })

    test('should throw if schemas are missing', () => {
      const payload = []

      const { error, value } = schema.validate(payload)

      expect(error).toBeDefined()
    })
  })

  describe('schemas that contain `$ref` properties', () => {
    const id = 'Pet'
    const schema = joiSchemas[id]

    test('should parse', () => {
      expect(typeof schema).toBe('object')
      expect(Joi.isSchema(schema)).toBe(true)
    })

    test('should validate', () => {
      const payload = [
        {
          name: 'string',
          tag: 'string',
        },
        { id: 1234 },
      ]

      const { error, value } = schema.validate(payload)

      expect(value).toBeDefined()
      expect(value).toMatchObject(payload)
      expect(error).toBeUndefined()
    })

    test('should throw if payload is invalid', () => {
      const payload = [
        {
          tag: 'string',
        },
        { id: 1234 },
      ]

      const { error, value } = schema.validate(payload)

      expect(error).toBeDefined()
    })
  })

  describe('schemas that contain `enum` properties', () => {
    describe('only `enum` properties', () => {
      const id = 'EnumExample'
      const schema = joiSchemas[id]

      test('should parse', () => {
        expect(typeof schema).toBe('object')
        expect(Joi.isSchema(schema)).toBe(true)
      })

      test('should validate', () => {
        const payload = 'string_one'

        const { error, value } = schema.validate(payload)

        expect(value).toBeDefined()
        expect(error).toBeUndefined()
      })

      test('should throw', () => {
        const payload = 'some_string'

        const { error, value } = schema.validate(payload)

        expect(error).toBeDefined()
      })
    })

    describe('`string` types with `enum` properties', () => {
      const id = 'EnumExample_string'
      const schema = joiSchemas[id]

      test('should parse', () => {
        expect(typeof schema).toBe('object')
        expect(Joi.isSchema(schema)).toBe(true)
      })

      test('should validate', () => {
        const payload = 'string_one'

        const { error, value } = schema.validate(payload)

        expect(value).toBeDefined()
        expect(error).toBeUndefined()
      })

      test('should throw', () => {
        const payload = 'some_string'

        const { error, value } = schema.validate(payload)

        expect(error).toBeDefined()
      })
    })
  })
})
