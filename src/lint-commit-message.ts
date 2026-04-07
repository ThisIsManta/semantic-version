import * as fs from 'node:fs/promises'

import { checkConventionalMessage } from './index'

export default async function (messageFilePath: string) {
	console.log('Verifying the commit message...')
	const message = (await fs.readFile(messageFilePath, 'utf-8')).trim()
	console.log('  input =', message)

	const { errors } = checkConventionalMessage(message)
	for (const error of errors) {
		console.error('  error =', error)
	}

	process.exitCode = errors.length
}
