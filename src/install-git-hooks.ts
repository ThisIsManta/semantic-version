import * as fs from 'fs/promises'
import * as fp from 'path'
import { execaCommand } from 'execa'

main()

async function main() {
	const currentDirectoryPath = process.cwd()
	console.debug('currentDirectoryPath »', currentDirectoryPath)

	const gitDirectoryPath = await findGitDirectoryPath(currentDirectoryPath)
	console.debug('gitDirectoryPath »', gitDirectoryPath)
	if (!gitDirectoryPath) {
		throw new Error('Could not find a Git directory.')
	}

	const packageJSON = JSON.parse(await fs.readFile(fp.join(gitDirectoryPath, 'package.json'), 'utf-8'))
	if (packageJSON.name === '@thisismanta/semantic-version') {
		console.warn('Skip installing Git hooks as it is supposed to be done on a consumer repository.')
		return
	}

	console.log('Installing Husky')
	await execaCommand('npx husky install', { cwd: gitDirectoryPath })

	const huskyDirectoryPath = fp.resolve(gitDirectoryPath, '.husky')
	console.debug('huskyDirectoryPath »', huskyDirectoryPath)
	await fs.access(huskyDirectoryPath)

	await upsert(
		fp.join(huskyDirectoryPath, 'commit-msg'),
		'npx lint-commit-message ${1}'
	)

	await upsert(
		fp.join(huskyDirectoryPath, 'post-commit'),
		'npx auto-npm-version'
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
	} catch (error) {
		console.log('Created', filePath)
		await fs.writeFile(
			filePath,
			'#!/usr/bin/env sh' + '\n' +
			'. "$(dirname -- "$0")/_/husky.sh"' + '\n',
			'utf-8'
		)
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
