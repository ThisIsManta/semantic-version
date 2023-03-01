"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execa_1 = require("execa");
const index_1 = require("./index");
const debug_1 = require("./debug");
main();
async function main() {
    const message = await run('git log -1 HEAD --format=%s');
    (0, debug_1.debug)('message »', JSON.stringify(message));
    const { type, breaking } = (0, index_1.checkConventionalMessage)(message, { debug: debug_1.debug });
    const releaseType = (() => {
        if (breaking) {
            return 'major';
        }
        else if (type === 'feat') {
            return 'minor';
        }
        else if (type === 'fix') {
            return 'patch';
        }
        // Indicate no version bump
        return null;
    })();
    (0, debug_1.debug)('releaseType »', JSON.stringify(releaseType));
    if (!releaseType) {
        console.log('semantic-version: no version bump.');
        return;
    }
    console.log(`semantic-version: creating ${releaseType} version.`);
    const newVersion = await run(`npm version --json --no-commit-hooks ${releaseType}`);
    await run(`git push origin refs/tags/${newVersion}`);
}
async function run(command) {
    const { stdout } = await (0, execa_1.execaCommand)(command);
    return stdout;
}
