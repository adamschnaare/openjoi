import Joi from '@hapi/joi'
import { assert } from '@hapi/hoek'
import { isArray } from 'util'

// OPTIONS:
// - (bool)required: if the base object should be required. default = true

export class SchemaParser {
  constructor({ schemas, options }) {
    this.schemas = schemas
    this.options = { required: true, ...options }
    this.joiSchemas = {}

    for (const id in schemas) {
      this.joiSchemas[id] = this.resolve({
        id,
        schema: schemas[id],
        required: this.options.required,
        history: [id],
      }) // Default required?
    }
  }

  resolve({ id, schema, required, history }) {
    // type
    if (schema.type) {
      return this.resolveType({ id, type: schema.type, schema, required, history })
    }

    // allOf
    if (schema.allOf) {
      return this.list({ id, schemas: schema.allOf, required, requireAll: true, history })
    }

    // anyOf
    if (schema.anyOf) {
      return this.list({ id, schemas: schema.anyOf, required, history })
    }

    // oneOf
    if (schema.oneOf) {
      return this.list({ id, schemas: schema.oneOf, required, requireOne: true, history })
    }

    // $ref
    if (schema.$ref) {
      return this.ref({ ref: schema.$ref, history })
    }

    // enum
    if (schema.enum) {
      return Joi.any().valid(...schema.enum)
    }

    // 'objects' without a `type`
    if (schema.properties) {
      return this.resolveType({ id, type: 'object', schema, required, history })
    }

    // TODO: Maybe - Interpret non-standard Joi types?
    // default
    return Joi.any()
  }

  resolveType({ id, type, schema, required, history }) {
    let joiSchema
    switch (type) {
      case 'boolean':
        joiSchema = Joi.boolean().preferences({ convert: false })
        break
      case 'object':
        joiSchema = this.object({ schema, history })
        break
      case 'array':
        joiSchema = this.array({ id, schema, history })
        break
      case 'string':
        joiSchema = this.string({ schema, history })
        break
      case 'number':
      case 'integer':
        joiSchema = Joi.number()
          .integer()
          .preferences({ convert: false })
        break
      default:
        joiSchema = Joi.any()
    }

    return required ? joiSchema.required() : joiSchema
  }

  string({ schema, history }) {
    let joiSchema = Joi.string()
    if (schema.enum) joiSchema = joiSchema.valid(...schema.enum)

    return joiSchema
  }

  object({ schema, history }) {
    const { properties, required } = schema
    const keys = {}

    if (properties) {
      const requiredArray = [...required]
      for (const prop in properties) {
        const localHistory = [...history, prop]
        keys[prop] = this.resolve({
          id: prop,
          schema: properties[prop],
          required: requiredArray.includes(prop),
          history: localHistory,
        })
      }
    }

    const hasKeys = Object.keys(keys).length > 0

    return hasKeys ? Joi.object().keys({ ...keys }) : Joi.object()
  }

  array({ id, schema, history }) {
    const { items } = schema
    assert(items, 'Property missing: `items`')
    history.push(id)
    const itemsType = this.resolve({ id, schema: items, required: true, history })
    return Joi.array().items(itemsType)
  }

  /**
   *
   * @param {string} id schema key
   * @param {array} schemas array of schemas
   * @param {bool} required if the object is required
   * @param {bool} requireAll if all the schemas should be required
   * @param {bool} requireOne if at least one schema should be required
   */
  list({ id, schemas, required, requireAll, requireOne, history }) {
    const items = schemas.map(item =>
      this.resolve({ id, schema: item, required: requireAll, history })
    )
    let joiSchema = Joi.array().items(...items)

    if (requireOne) joiSchema = joiSchema.min(1)
    if (required) joiSchema = joiSchema.required()

    return joiSchema
  }

  /**
   *
   * @param {string} ref String containing OpenAPI ref to another schema in the list of schemas ex: #/components/schemas/some_key
   */
  ref({ ref, history }) {
    const id = ref.replace('#/components/schemas/', '')

    // test for endless recursive loops in references
    const isReferenced = history.indexOf(id) > -1
    const referencedOtherThanLast = history.indexOf(id) < history.length - 1

    if (isReferenced && referencedOtherThanLast) return Joi.any()

    return this.resolve({ id, schema: this.schemas[id], history })
  }
}

// convert schemas to joi schemas
export const convert = ({ doc }) => {
  assert(doc.components.schemas, 'Invalid doc structure: missing `components.schemas`')
  const schemas = doc.components.schemas
  const { joiSchemas } = new SchemaParser({ schemas })
  return joiSchemas
}

export default convert
