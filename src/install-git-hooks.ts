import * as fs from 'fs/promises'
import * as fp from 'path'
import { run } from './run'
import { debug } from './debug'

main()

const packageName = require('../package.json').name

async function main() {
	const rootDirectoryPath = await run('git rev-parse --show-toplevel')
	debug('rootDirectoryPath »', rootDirectoryPath)

	if (!rootDirectoryPath) {
		throw new Error('Could not find a Git directory.')
	}

	const packageJSON = JSON.parse(await fs.readFile(fp.join(rootDirectoryPath, 'package.json'), 'utf-8'))
	if (packageJSON.name === packageName) {
		console.warn('Skip installing Git hooks as it is supposed to be done on a consumer repository.')
		return
	}

	const hookDirectoryPath = await run('git config --get core.hooksPath').catch(() => '') || '.git/hooks'
	const hookFilePath = fp.join(rootDirectoryPath, hookDirectoryPath, 'commit-msg')
	debug('hookFilePath »', hookFilePath)

	try {
		await fs.access(hookFilePath, fs.constants.R_OK | fs.constants.W_OK)
		debug('Found', hookFilePath)
	} catch {
		await fs.mkdir(fp.dirname(hookFilePath), { recursive: true })
		await fs.writeFile(hookFilePath, '#!/bin/sh\n', 'utf-8')
		debug('Created', hookFilePath)
	}

	const hookFileText = await fs.readFile(hookFilePath, 'utf-8')
	if (/(^|\s|\/)lint-commit-message(\s|$)/m.test(hookFileText)) {
		console.log('Skipped adding commit-msg Git hook.')
	} else {
		await fs.appendFile(hookFilePath, [
			'',
			'dir="$(git rev-parse --show-toplevel)"',
			'"$dir/node_modules/.bin/lint-commit-message" "$@"',
			'',
		].join('\n'), 'utf-8')
		console.log('Done adding commit-msg Git hook.')
	}
}
