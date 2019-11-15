"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDoc = void 0;

var _path = _interopRequireDefault(require("path"));

var _fs = require("fs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getDoc = relativePath => {
  const docPath = _path.default.join(__dirname, relativePath);

  const doc = JSON.parse((0, _fs.readFileSync)(docPath, 'utf-8'));
  return doc;
};

exports.getDoc = getDoc;