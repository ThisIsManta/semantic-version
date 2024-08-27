import * as cp from 'child_process'

export function run(command: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		cp.exec(command, (error, stdout, stderr) => {
			if (error) {
				// See https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions#grouping-log-lines
				console.log('::group::' + command)
				console.log(stdout)
				console.error(stderr)
				console.log('::endgroup::')

				reject(error)
			} else {
				resolve((stdout + stderr).trim())
			}
		})
	})
}
