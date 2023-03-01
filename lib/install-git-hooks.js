"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs/promises"));
const fp = __importStar(require("path"));
const execa_1 = require("execa");
main();
async function main() {
    const currentDirectoryPath = process.cwd();
    console.debug('currentDirectoryPath »', currentDirectoryPath);
    const gitDirectoryPath = await findGitDirectoryPath(currentDirectoryPath);
    console.debug('gitDirectoryPath »', gitDirectoryPath);
    if (!gitDirectoryPath) {
        throw new Error('Could not find a Git directory.');
    }
    const packageJSON = JSON.parse(await fs.readFile(fp.join(gitDirectoryPath, 'package.json'), 'utf-8'));
    if (packageJSON.name === '@thisismanta/semantic-version') {
        console.warn('Skip installing Git hooks as it is supposed to be done on a consumer repository.');
        return;
    }
    console.log('Installing Husky');
    await (0, execa_1.execaCommand)('npx husky install', { cwd: gitDirectoryPath });
    // Up 3 levels because of `node_modules/@thisismanta/semantic-version`
    const huskyDirectoryPath = fp.resolve(currentDirectoryPath, '../../..', '.husky');
    await fs.access(huskyDirectoryPath);
    console.log('Found', huskyDirectoryPath);
    await upsert(fp.join(huskyDirectoryPath, 'commit-msg'), 'npx lint-commit-message ${1}');
    await upsert(fp.join(huskyDirectoryPath, 'post-commit'), 'npx auto-npm-version');
    console.log('Done adding Git hooks.');
}
async function findGitDirectoryPath(path) {
    const pathList = path.split(fp.sep);
    while (pathList.length > 1) {
        const testPath = fp.join(pathList.join(fp.sep), '.git');
        try {
            await fs.access(testPath);
            const stat = await fs.lstat(testPath);
            if (stat.isDirectory()) {
                return pathList.join(fp.sep);
            }
        }
        catch {
            // Do nothing
        }
        pathList.pop();
    }
    return null;
}
async function upsert(filePath, text) {
    try {
        await fs.access(filePath);
    }
    catch (error) {
        console.log('Created', filePath);
        await fs.writeFile(filePath, '#!/usr/bin/env sh' + '\n' +
            '. "$(dirname -- "$0")/_/husky.sh"' + '\n', 'utf-8');
    }
    const fileText = await fs.readFile(filePath, 'utf-8');
    const lines = fileText.trim().split('\n');
    const index = lines
        .findIndex(line => line.trim().includes(text));
    if (index === -1) {
        await fs.appendFile(filePath, '\n' + text + '\n', 'utf-8');
        console.log(`Added "${text}" to ${filePath}`);
    }
}
