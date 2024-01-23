import * as cp from 'child_process'
import { debug } from './debug'

export function run(command: string): Promise<string> {
	debug(command)

	return new Promise<string>((resolve, reject) => {
		cp.exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(error)
			} else {
				const output = (stdout + stderr).trim()
				debug(output)
				resolve(output)
			}
		})
	})
}
