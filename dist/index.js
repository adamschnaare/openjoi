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
  }

  resolve({
    id,
    schema,
    required,
    history
  }) {
    // type
    if (schema.type) {
      return this.resolveType({
        id,
        type: schema.type,
        schema,
        required,
        history
      });
    } // allOf


    if (schema.allOf) {
      return this.list({
        id,
        schemas: schema.allOf,
        required,
        requireAll: true,
        history
      });
    } // anyOf


    if (schema.anyOf) {
      return this.list({
        id,
        schemas: schema.anyOf,
        required,
        history
      });
    } // oneOf


    if (schema.oneOf) {
      return this.list({
        id,
        schemas: schema.oneOf,
        required,
        requireOne: true,
        history
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
   * @param {bool} requireAll if all the schemas should be required
   * @param {bool} requireOne if at least one schema should be required
   */


  list({
    id,
    schemas,
    required,
    requireAll,
    requireOne,
    history
  }) {
    var _Joi$array;

    const items = schemas.map(item => this.resolve({
      id,
      schema: item,
      required: requireAll,
      history
    }));

    let joiSchema = (_Joi$array = _joi.default.array()).items.apply(_Joi$array, items);

    if (requireOne) joiSchema = joiSchema.min(1);
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