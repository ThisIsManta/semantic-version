"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execa_1 = require("execa");
const index_1 = require("./index");
main();
async function main() {
    const message = await run('git log -1 HEAD --format=%s');
    console.log('message »', message);
    const { type, breaking } = (0, index_1.checkConventionalMessage)(message, console);
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
        return '';
    })();
    console.log('releaseType »', releaseType);
    if (!releaseType) {
        return;
    }
    const newVersion = await run(`npm version --json --no-commit-hooks ${releaseType}`);
    await run(`git push origin refs/tags/${newVersion}`);
}
async function run(command) {
    console.log(command);
    const { stdout } = await (0, execa_1.execaCommand)(command);
    console.log(stdout);
    return stdout;
}
