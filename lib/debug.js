"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
const yn_1 = __importDefault(require("yn"));
function debug(...args) {
    if ((0, yn_1.default)(process.env.DEBUG)) {
        console.log(...args);
    }
}
exports.debug = debug;
