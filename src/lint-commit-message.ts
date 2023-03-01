import * as fs from 'fs/promises'
import { checkConventionalMessage } from './index'

main()

async function main() {
	const [messageFilePath] = process.argv.slice(2)
	const message = (await fs.readFile(messageFilePath, 'utf-8')).trim()

	const { errors } = checkConventionalMessage(message, console)
	if (errors.length > 0) {
		throw new Error(errors[0])
	}
}
