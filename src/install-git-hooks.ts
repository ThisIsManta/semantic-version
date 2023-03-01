import * as fs from 'fs/promises'
import * as fp from 'path'

main()

async function main() {
	const huskyDirectoryPath = fp.resolve(process.cwd(), '.husky')

	await upsert(
		fp.join(huskyDirectoryPath, 'commit-msg'),
		'npx lint-commit-message ${1}'
	)

	await upsert(
		fp.join(huskyDirectoryPath, 'post-commit'),
		'npx auto-npm-version'
	)
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
		console.log('Added', text, 'to', filePath)
	}
}
