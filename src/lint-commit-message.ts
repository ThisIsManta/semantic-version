import * as fs from 'fs/promises'
import { checkConventionalMessage } from './index'
import { debug } from './debug'

main()

async function main() {
	const [messageFilePath] = process.argv.slice(2)
	debug('messageFilePath »', messageFilePath)

	const message = (await fs.readFile(messageFilePath, 'utf-8')).trim()
	debug('message »', message)

	const { errors } = checkConventionalMessage(message, { debug })
	if (errors.length > 0) {
		for (const error of errors) {
			console.error(error)
		}
		process.exit(1)
	}
}
