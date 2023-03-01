import { execaCommand } from 'execa'
import { checkConventionalMessage } from './index'

main()

async function main() {
	const message = await run('git log -1 HEAD --format=%s')
	console.log('message »', message)

	const { type, breaking } = checkConventionalMessage(message, console)

	const releaseType = (() => {
		if (breaking) {
			return 'major'
		} else if (type === 'feat') {
			return 'minor'
		} else if (type === 'fix') {
			return 'patch'
		}

		// Indicate no version bump
		return ''
	})()
	console.log('releaseType »', releaseType)

	if (!releaseType) {
		return
	}

	const newVersion = await run(`npm version --json --no-commit-hooks ${releaseType}`)

	await run(`git push origin refs/tags/${newVersion}`)
}

async function run(command: string) {
	console.log(command)

	const { stdout } = await execaCommand(command)
	console.log(stdout)

	return stdout
}
