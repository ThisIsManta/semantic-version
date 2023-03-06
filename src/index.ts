const titlePattern = /^(?<type>\w+)(?<scope>\(.*?\))?(?<breaking>\!)?:(?<subject>.+)/

export const allowedTypes = ['feat', 'fix', 'build', 'chore'] as const

export type SemanticType = typeof allowedTypes[number]

export function checkConventionalMessage(message: string, { debug }: Pick<Console, 'debug'>) {
	const pattern: { [key: string]: string | undefined } = (message.match(titlePattern)?.groups || {})

	const { type, scope, breaking, subject } = pattern
	debug('type »', type)
	debug('scope »', scope)
	debug('breaking »', breaking)
	debug('subject »', subject?.trim())

	const errors = [
		!type &&
		'The pull request title must match the pattern of "<type>[!]: <subject>" which is a reduced set of https://www.conventionalcommits.org/en/v1.0.0/',

		typeof type === 'string' && allowedTypes.includes(type.toLowerCase() as any) === false &&
		'The type in a pull request title must be one of ' + allowedTypes.map(name => '"' + name + '"').join(', ') + '.',

		typeof type === 'string' && /^[a-z]+$/.test(type) === false &&
		'The type in a pull request title must be in lower case only.',

		scope &&
		'A scope in a pull request title is never allowed.',

		typeof type === 'string' && typeof subject !== 'string' &&
		'The subject in a pull request title must be provided.',

		typeof subject === 'string' && (subject.match(/^ +/)?.[0].length || 0) !== 1 &&
		'A single space must be after ":" symbol.',

		typeof subject === 'string' && /^[a-z]/.test(subject.trim()) === false &&
		'The subject must start with a lower case latin alphabet.',

		typeof subject === 'string' && /[\s\.]+$/.test(subject) && /\.{3}$/.test(subject.trim()) === false &&
		'The subject must not end with a period or a space.',
	].filter((error): error is string => typeof error === 'string')

	return {
		type: allowedTypes.includes(type as any) ? type as SemanticType : undefined,
		breaking: !!breaking,
		subject: typeof subject === 'string'
			? subject.trim().replace(/[\s\.]+$/, '') + (/\.{3}$/.test(subject.trim()) ? '...' : '')
			: message,
		errors
	}
}
