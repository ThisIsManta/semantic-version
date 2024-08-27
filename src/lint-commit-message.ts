import * as fs from 'fs/promises'
import { checkConventionalMessage } from './index'
import { debug } from './debug'

export default async function main(messageFilePath: string) {
	debug('messageFilePath »', messageFilePath)

	const message = (await fs.readFile(messageFilePath, 'utf-8')).trim()
	debug('message »', message)

	const { errors } = checkConventionalMessage(message, { debug })
	for (const error of errors) {
		console.error(error)
	}
	process.exitCode = errors.length
}
