import * as fs from 'fs/promises'
import * as fp from 'path'
import { execaCommand } from 'execa'

main()

async function main() {
	const currentDirectoryPath = process.cwd()
	console.log('Found', currentDirectoryPath)
	if (fp.basename(fp.dirname(currentDirectoryPath)) !== 'node_modules') {
		console.log('Do nothing when running this on semantic-version repository.')
		return
	}

	console.log('Installing Husky')
	await execaCommand('npx husky install')

	// Up 3 levels because of `node_modules/@thisismanta/semantic-version`
	const huskyDirectoryPath = fp.resolve(currentDirectoryPath, '../../..', '.husky')
	await fs.access(huskyDirectoryPath)
	console.log('Found', huskyDirectoryPath)

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
