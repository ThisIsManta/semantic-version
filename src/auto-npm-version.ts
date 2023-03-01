import { execaCommand } from 'execa'
import { checkConventionalMessage } from './index'
import { debug } from './debug'

main()

async function main() {
	const message = await run('git log -1 HEAD --format=%s')
	debug('message »', JSON.stringify(message))

	const { type, breaking } = checkConventionalMessage(message, { debug })

	const releaseType = (() => {
		if (breaking) {
			return 'major'
		} else if (type === 'feat') {
			return 'minor'
		} else if (type === 'fix') {
			return 'patch'
		}

		// Indicate no version bump
		return null
	})()
	debug('releaseType »', JSON.stringify(releaseType))

	if (!releaseType) {
		console.log('semantic-version: no version bump.')
		return
	}

	console.log(`semantic-version: creating ${releaseType} version.`)
	const newVersion = await run(`npm version --json --no-commit-hooks ${releaseType}`)

	await run(`git push origin refs/tags/${newVersion}`)
}

async function run(command: string) {
	const { stdout } = await execaCommand(command)
	return stdout
}
