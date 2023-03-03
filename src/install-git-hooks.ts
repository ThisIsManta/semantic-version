import * as fs from 'fs/promises'
import * as fp from 'path'
import { execaCommand } from 'execa'
import { debug } from './debug'

main()

const packageName = require('../package.json').name

async function main() {
	const currentDirectoryPath = process.cwd()
	debug('currentDirectoryPath »', currentDirectoryPath)

	const gitDirectoryPath = await findGitDirectoryPath(currentDirectoryPath)
	debug('gitDirectoryPath »', gitDirectoryPath)

	if (!gitDirectoryPath) {
		throw new Error('Could not find a Git directory.')
	}

	const packageJSON = JSON.parse(await fs.readFile(fp.join(gitDirectoryPath, 'package.json'), 'utf-8'))
	if (packageJSON.name === packageName) {
		console.warn('Skip installing Git hooks as it is supposed to be done on a consumer repository.')
		return
	}

	console.log('Installing Husky')
	await execaCommand('npx husky install', { cwd: gitDirectoryPath })

	const huskyDirectoryPath = fp.resolve(gitDirectoryPath, '.husky')
	debug('huskyDirectoryPath »', huskyDirectoryPath)

	await fs.access(huskyDirectoryPath)

	await upsert(
		fp.join(huskyDirectoryPath, 'commit-msg'),
		'npx lint-commit-message ${1}'
	)

	console.log('Done adding Git hooks.')
}

async function findGitDirectoryPath(path: string) {
	const pathList = path.split(fp.sep)
	while (pathList.length > 1) {
		const testPath = fp.join(pathList.join(fp.sep), '.git')

		try {
			await fs.access(testPath)
			const stat = await fs.lstat(testPath)
			if (stat.isDirectory()) {
				return pathList.join(fp.sep)
			}

		} catch {
			// Do nothing
		}

		pathList.pop()
	}

	return null
}

async function upsert(filePath: string, text: string) {
	try {
		await fs.access(filePath)
		console.log('Found', filePath)
	} catch (error) {
		await fs.writeFile(
			filePath,
			'#!/usr/bin/env sh' + '\n' +
			'. "$(dirname -- "$0")/_/husky.sh"' + '\n',
			'utf-8'
		)
		console.log('Created', filePath)
	}

	const fileText = await fs.readFile(filePath, 'utf-8')
	const lines = fileText.trim().split('\n')
	const index = lines
		.findIndex(line => line.trim().includes(text))

	if (index === -1) {
		await fs.appendFile(filePath, '\n' + text + '\n', 'utf-8')
		console.log(`Added "${text}" to ${filePath}`)
	}
}
