import Joi from '@hapi/joi'
import { assert } from '@hapi/hoek'
import { isArray } from 'util'

// OPTIONS:
// - (bool)required: if the base object should be required. default = true

export class SchemaParser {
  constructor({ schemas, options }) {
    this.schemas = schemas
    this.options = { required: true, extensions: [], ...options }
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

  // TODO: Clean up the objects in the call, simplify somehow
  resolve({ id, schema, required, history }) {
    // type
    //TODO: Need to resolve what happens when type and allOf/anyOf/oneOf exist
    if (schema.type) {
      // allOf
      if (schema.allOf) {
        return this.resolveAllOf({
          id,
          schemas: schema.allOf,
          required,
          history,
        })
      }

      // anyOf
      if (schema.anyOf) {
        return this.list({
          id,
          schemas: schema.anyOf,
          required,
          history,
          mode: 'any',
        })
      }

      // oneOf
      if (schema.oneOf) {
        return this.list({
          id,
          schemas: schema.oneOf,
          required,
          history,
          mode: 'one',
        })
      }
      return this.resolveType({
        id,
        type: schema.type,
        schema,
        required,
        history,
      })
    }

    // allOf
    if (schema.allOf) {
      return this.resolveAllOf({ id, schemas: schema.allOf, required, history })
      // return this.list({ id, schemas: schema.allOf, required, history, mode: 'all' })
    }

    // anyOf
    if (schema.anyOf) {
      return this.list({ id, schemas: schema.anyOf, required, history, mode: 'any' })
    }

    // oneOf
    if (schema.oneOf) {
      return this.list({ id, schemas: schema.oneOf, required, history, mode: 'one' })
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
   * @param {array} history array of ids processed up this chain
   * @param {string} mode how to process the list: 'all','one','any'
   */
  list({ id, schemas, required, history, mode }) {
    const items = schemas.map(item => this.resolve({ id, schema: item, history }))

    let joiSchema = Joi.alternatives(...items).match(mode)

    if (required) joiSchema = joiSchema.required()

    return joiSchema
  }

  resolveAllOf({ id, schemas, required, history }) {
    assert(isArray(schemas), 'Expected allOf to be an array.')

    // List required props if definition is present, before attempting to resolve the object
    let requiredProps = schemas.filter(item => item.required != undefined)
    if (requiredProps.length > 0) requiredProps = requiredProps[0].required

    const items = schemas.map(item =>
      this.resolve({
        id,
        schema: item,
        history,
      })
    )

    let schemaKeys = {}

    items.forEach(item => {
      schemaKeys = Object.assign(schemaKeys, item.describe().keys)
    })

    Object.keys(schemaKeys).forEach(key => {
      const required =
        (schemaKeys[key].flags && schemaKeys[key].flags.presence == 'required') ||
        requiredProps.includes(key)

      schemaKeys[key] = this.resolve({
        id,
        schema: schemaKeys[key],
        history,
        required,
      })
    })

    let joiSchema = Joi.object().keys(schemaKeys)

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
