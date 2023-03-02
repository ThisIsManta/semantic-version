export function debug(...args: Array<any>) {
	if (process.env.DEBUG) {
		console.log(...args)
	}
}
