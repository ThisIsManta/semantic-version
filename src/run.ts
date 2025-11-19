import * as cp from 'child_process'

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
