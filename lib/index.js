"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkConventionalMessage = exports.allowedTypes = void 0;
const titlePattern = /^(?<type>\w+)(?<scope>\(.*?\))?(?<breaking>\!)?:(?<subject>.+)/;
exports.allowedTypes = ['feat', 'fix', 'test', 'refactor', 'chore'];
function checkConventionalMessage(message, { debug }) {
    const pattern = (message.match(titlePattern)?.groups || {});
    debug(JSON.stringify(pattern, null, 2));
    const { type, scope, breaking, subject } = pattern;
    const errors = [
        !type &&
            'The pull request title must match the pattern of "<type>[!]: <subject>" which is a reduced set of https://www.conventionalcommits.org/en/v1.0.0/',
        typeof type === 'string' && exports.allowedTypes.includes(type.toLowerCase()) === false &&
            'The type in a pull request title must be one of ' + exports.allowedTypes.map(name => '"' + name + '"').join(', ') + '.',
        typeof type === 'string' && /^[a-z]+$/.test(type) === false &&
            'The type in a pull request title must be in lower case only.',
        scope &&
            'A scope in a pull request title is never allowed.',
        typeof type === 'string' && typeof subject !== 'string' &&
            'The subject in a pull request title must be provided.',
        typeof subject === 'string' && (subject.match(/^ +/)?.[0].length || 0) !== 1 &&
            'A single space must be after ":" symbol.',
        typeof subject === 'string' && /^[a-z]/.test(subject.trim()) === false &&
            'The subject must start with a lower case latin alphabet.',
    ].filter((error) => typeof error === 'string');
    return {
        type,
        breaking: !!breaking,
        subject: typeof subject === 'string' ? subject.trim() : subject,
        errors
    };
}
exports.checkConventionalMessage = checkConventionalMessage;
