import yn from 'yn'

export function debug(...args: Array<any>) {
	if (yn(process.env.DEBUG)) {
		console.log(...args)
	}
}
