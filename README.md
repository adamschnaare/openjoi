# openjoi

Converts OpenApi 3.0 specs (JSON) to Joi schemas.

# Installation
```
npm install openjoi
```

# Usage
```js
// Import
import path from 'path'
import { readFileSync } from 'fs'
import { convert } from './index'
import Joi from '@hapi/joi'

// Get file (local file, or from remote, whatever)
const specPath = path.join(__dirname, '../constants/openapi.json')
const doc = JSON.parse(readFileSync(specPath, 'utf-8'))

// Convert
const schemas = convert({ doc })
```

Given the following `openapi.json` as the `doc`:
```json
{
  ...
  "components": {
    "schemas": {
      "foo": {
        "type": "string",
        "description": "Sint deserunt reprehenderit ut occaecat ad."
      },
      "bar": {
        "type": "string",
        "enum": ["one", "two", "three"]
      },
      ...
    }
  }
}
```

`convert` would give you
```js
const schemas = convert({doc})

// schemas would be the same as:
schemas = {
  foo: Joi.string().required(),
  bar: Joi.string().valid(['one','two','three']).required()
}

```

So you can use them for validation, etc...
```js
schemas['foo'].validate('some string') // -> `true`
schemas['foo'].validate(1234) // -> `false
```

# Constructor
**convert( { doc } )**: 
  - `doc`: valid [OpenApi 3.0](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md) document in JSON format

# Misc

## Gotchas / Heads up
- Passing `$refs` that refer to ancestors of itself will result in a generic Joi validation model (`Joi.any()`), or else we end up maxing out the call stack.

## Roadmap
- string formatting
- integer formatting
- discriminator support

## Kudos 
Highly influenced and inspired by [enjoi](https://github.com/tlivings/enjoi/blob/master/package.json). Much thanks.
