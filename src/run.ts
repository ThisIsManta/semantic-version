import * as cp from 'node:child_process'
import * as fs from 'node:fs'

export function run(command: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		cp.exec(command, (error, stdout, stderr) => {
			console.log('::debug::' + command)
			console.log('::debug::Output:')
			console.log('::debug::=>', stdout)
			if (stderr.trim().length > 0) {
				console.log('::debug::Error:')
				console.log('::debug::=>', stderr)
			}

			if (error) {
				reject(error)
			} else {
				resolve(stdout.trim())
			}
		})
	})
}

const packageJSON = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf-8' }))

export const npm: string =
	packageJSON?.packageManager?.replace(/@.*$/, '') ??
	packageJSON?.devEngines?.packageManager?.name ??
	'npm'
