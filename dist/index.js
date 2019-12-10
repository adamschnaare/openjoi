"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.convert = exports.SchemaParser = void 0;

var _joi = _interopRequireDefault(require("@hapi/joi"));

var _hoek = require("@hapi/hoek");

var _util = require("util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SchemaParser {
  constructor({
    schemas,
    options
  }) {
    this.schemas = schemas;
    this.options = {
      required: true,
      extensions: [],
      ...options
    };
    this.joiSchemas = {};

    for (const id in schemas) {
      this.joiSchemas[id] = this.resolve({
        id,
        schema: schemas[id],
        required: this.options.required,
        history: [id]
      }); // Default required?
    }
  } // TODO: Clean up the objects in the call, simplify somehow


  resolve({
    id,
    schema,
    required,
    history
  }) {
    // type
    //TODO: Need to resolve what happens when type and allOf/anyOf/oneOf exist
    if (schema.type) {
      // allOf
      if (schema.allOf) {
        return this.resolveAllOf({
          id,
          schemas: schema.allOf,
          required,
          history
        });
      } // anyOf


      if (schema.anyOf) {
        return this.list({
          id,
          schemas: schema.anyOf,
          required,
          history,
          mode: 'any'
        });
      } // oneOf


      if (schema.oneOf) {
        return this.list({
          id,
          schemas: schema.oneOf,
          required,
          history,
          mode: 'one'
        });
      }

      return this.resolveType({
        id,
        type: schema.type,
        schema,
        required,
        history
      });
    } // allOf


    if (schema.allOf) {
      return this.resolveAllOf({
        id,
        schemas: schema.allOf,
        required,
        history
      }); // return this.list({ id, schemas: schema.allOf, required, history, mode: 'all' })
    } // anyOf


    if (schema.anyOf) {
      return this.list({
        id,
        schemas: schema.anyOf,
        required,
        history,
        mode: 'any'
      });
    } // oneOf


    if (schema.oneOf) {
      return this.list({
        id,
        schemas: schema.oneOf,
        required,
        history,
        mode: 'one'
      });
    } // $ref


    if (schema.$ref) {
      return this.ref({
        ref: schema.$ref,
        history
      });
    } // enum


    if (schema.enum) {
      var _Joi$any;

      return (_Joi$any = _joi.default.any()).valid.apply(_Joi$any, schema.enum);
    } // 'objects' without a `type`


    if (schema.properties) {
      return this.resolveType({
        id,
        type: 'object',
        schema,
        required,
        history
      });
    } // TODO: Maybe - Interpret non-standard Joi types?
    // default


    return _joi.default.any();
  }

  resolveType({
    id,
    type,
    schema,
    required,
    history
  }) {
    let joiSchema;

    switch (type) {
      case 'boolean':
        joiSchema = _joi.default.boolean().preferences({
          convert: false
        });
        break;

      case 'object':
        joiSchema = this.object({
          schema,
          history
        });
        break;

      case 'array':
        joiSchema = this.array({
          id,
          schema,
          history
        });
        break;

      case 'string':
        joiSchema = this.string({
          schema,
          history
        });
        break;

      case 'number':
      case 'integer':
        joiSchema = _joi.default.number().integer().preferences({
          convert: false
        });
        break;

      default:
        joiSchema = _joi.default.any();
    }

    return required ? joiSchema.required() : joiSchema;
  }

  string({
    schema,
    history
  }) {
    var _joiSchema;

    let joiSchema = _joi.default.string();

    if (schema.enum) joiSchema = (_joiSchema = joiSchema).valid.apply(_joiSchema, schema.enum);
    return joiSchema;
  }

  object({
    schema,
    history
  }) {
    const {
      properties,
      required
    } = schema;
    const keys = {};

    if (properties) {
      const requiredArray = [].concat(required);

      for (const prop in properties) {
        const localHistory = [].concat(history, [prop]);
        keys[prop] = this.resolve({
          id: prop,
          schema: properties[prop],
          required: requiredArray.includes(prop),
          history: localHistory
        });
      }
    }

    const hasKeys = Object.keys(keys).length > 0;
    return hasKeys ? _joi.default.object().keys({ ...keys
    }) : _joi.default.object();
  }

  array({
    id,
    schema,
    history
  }) {
    const {
      items
    } = schema;
    (0, _hoek.assert)(items, 'Property missing: `items`');
    history.push(id);
    const itemsType = this.resolve({
      id,
      schema: items,
      required: true,
      history
    });
    return _joi.default.array().items(itemsType);
  }
  /**
   *
   * @param {string} id schema key
   * @param {array} schemas array of schemas
   * @param {bool} required if the object is required
   * @param {array} history array of ids processed up this chain
   * @param {string} mode how to process the list: 'all','one','any'
   */


  list({
    id,
    schemas,
    required,
    history,
    mode
  }) {
    const items = schemas.map(item => this.resolve({
      id,
      schema: item,
      history
    }));

    let joiSchema = _joi.default.alternatives.apply(_joi.default, items).match(mode);

    if (required) joiSchema = joiSchema.required();
    return joiSchema;
  }

  resolveAllOf({
    id,
    schemas,
    required,
    history
  }) {
    (0, _hoek.assert)((0, _util.isArray)(schemas), 'Expected allOf to be an array.');
    const items = schemas.map(item => this.resolve({
      id,
      schema: item,
      history
    }));
    let schemaKeys = {};
    items.forEach(item => {
      schemaKeys = Object.assign(schemaKeys, item.describe().keys);
    });
    Object.keys(schemaKeys).forEach(key => {
      const required = schemaKeys[key].flags && schemaKeys[key].flags.presence == 'required';
      schemaKeys[key] = this.resolve({
        id,
        schema: schemaKeys[key],
        history,
        required
      });
    });

    let joiSchema = _joi.default.object().keys(schemaKeys);

    if (required) joiSchema = joiSchema.required();
    return joiSchema;
  }
  /**
   *
   * @param {string} ref String containing OpenAPI ref to another schema in the list of schemas ex: #/components/schemas/some_key
   */


  ref({
    ref,
    history
  }) {
    const id = ref.replace('#/components/schemas/', ''); // test for endless recursive loops in references

    const isReferenced = history.indexOf(id) > -1;
    const referencedOtherThanLast = history.indexOf(id) < history.length - 1;
    if (isReferenced && referencedOtherThanLast) return _joi.default.any();
    return this.resolve({
      id,
      schema: this.schemas[id],
      history
    });
  }

} // convert schemas to joi schemas


exports.SchemaParser = SchemaParser;

const convert = ({
  doc
}) => {
  (0, _hoek.assert)(doc.components.schemas, 'Invalid doc structure: missing `components.schemas`');
  const schemas = doc.components.schemas;
  const {
    joiSchemas
  } = new SchemaParser({
    schemas
  });
  return joiSchemas;
};

exports.convert = convert;
var _default = convert;
exports.default = _default;