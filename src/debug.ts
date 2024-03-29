export function debug(...args: Array<any>) {
	if (process.env.DEBUG || process.env.RUNNER_DEBUG /* For GitHub Actions */) {
		console.log(...args)
	}
}
