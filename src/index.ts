import * as cp from 'node:child_process'
import * as fs from 'node:fs'

import isValidVersion from 'semver/functions/valid'
import yn from 'yn'

// See https://docs.github.com/en/actions/how-tos/monitor-workflows/enable-debug-logging
const debuggingEnabled =
	yn(process.env.DEBUG) ||
	yn(process.env.ACTIONS_RUNNER_DEBUG) ||
	yn(process.env.ACTIONS_STEP_DEBUG)

export function debug(text: string | number) {
	if (debuggingEnabled) {
		console.log('::debug::' + text)
	}
}

export function run(command: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		cp.exec(command, (error, stdout, stderr) => {
			debug('> ' + command)

			stdout = stdout.trim()
			if (stdout.length > 0) {
				debug(stdout)
			}

			stderr = stderr.trim()
			if (stderr.length > 0) {
				debug(stderr)
			}

			if (error) {
				reject(error)
			} else {
				resolve(stdout)
			}
		})
	})
}

const packageJSON = ((): any => {
	try {
		return JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf-8' }))
	} catch {
		return {}
	}
})()

export const npm: string =
	('packageManager' in packageJSON && packageJSON.packageManager?.replace(/@.*$/, '')) ||
	('devEngines' in packageJSON && packageJSON.devEngines?.packageManager?.name) ||
	'npm'

const titlePattern = /^(?<type>\w+)(?<scope>\(.*?\))?(?<breaking>\!)?:(?<subject>.+)/

export const allowedTypes = ['feat', 'fix', 'build', 'chore'] as const

export type SemanticType = (typeof allowedTypes)[number]

export function checkConventionalMessage(message: string) {
	const pattern: { [key: string]: string | undefined } = message.match(titlePattern)?.groups || {}

	const { type, scope, breaking, subject } = pattern

	const errors = [
		!type &&
			'The pull request title must match the pattern of "<type>[!]: <subject>" which is a reduced set of https://www.conventionalcommits.org/en/v1.0.0/',

		typeof type === 'string' &&
			allowedTypes.includes(type.toLowerCase() as any) === false &&
			'The type in a pull request title must be one of ' +
				allowedTypes.map((name) => '"' + name + '"').join(', ') +
				'.',

		typeof type === 'string' &&
			/^[a-z]+$/.test(type) === false &&
			'The type in a pull request title must be in lower case only.',

		scope && 'A scope in a pull request title is never allowed.',

		typeof type === 'string' &&
			typeof subject !== 'string' &&
			'The subject in a pull request title must be provided.',

		typeof subject === 'string' &&
			(subject.match(/^ +/)?.[0].length || 0) !== 1 &&
			'A single space must be after ":" symbol.',

		typeof subject === 'string' &&
			/^[a-z]/.test(subject.trim()) === false &&
			'The subject must start with a lower case latin alphabet.',

		typeof subject === 'string' &&
			/[\s\.]+$/.test(subject) &&
			/\.{3}$/.test(subject.trim()) === false &&
			'The subject must not end with a period or a space.',
	].filter((error): error is string => typeof error === 'string')

	return {
		type: allowedTypes.includes(type as any) ? (type as SemanticType) : undefined,
		breaking: !!breaking,
		subject:
			typeof subject === 'string'
				? subject.trim().replace(/[\s\.]+$/, '') + (/\.{3}$/.test(subject.trim()) ? '...' : '')
				: message,
		errors,
	}
}

interface GitCommit {
	hash: string
	type: string | undefined
	breaking: boolean
	subject: string
}

export function getReleaseType(commits: Array<GitCommit>): string | null {
	if (commits.find(({ breaking }) => breaking)) {
		return 'major'
	}

	if (commits.find(({ type }) => type === 'feat')) {
		return 'minor'
	}

	if (commits.find(({ type }) => type === 'fix' || type === 'build')) {
		return 'patch'
	}

	return null
}

export async function getCurrentPackageVersion() {
	const version = JSON.parse(await run(`${npm} pkg get version`))
	if (typeof version === 'string' && isValidVersion(version)) {
		return version
	} else {
		throw new Error('Expected a valid version field in package.json.')
	}
}

export async function getGitHistory(version: string): Promise<Array<GitCommit>> {
	const tag =
		(await run(`git tag --list v${version}`)) || (await run('git describe --tags --abbrev=0'))
	return getCommits(await run(`git --no-pager log ${tag ? tag + '..HEAD' : ''} --format=%H%s`))
}

function getCommits(gitLogs: string) {
	return gitLogs
		.split('\n')
		.filter((line) => line.length > 0)
		.map((line) => ({
			hash: line.substring(0, 40),
			message: line.substring(40),
		}))
		.filter(({ message }) => isValidVersion(message) === null)
		.map(({ hash, message }): GitCommit => {
			const { type, breaking, subject } = checkConventionalMessage(message)
			return { hash, type, breaking, subject }
		})
}

export function getReleaseNote(commits: Array<GitCommit>) {
	const groups: Record<'BREAKING CHANGES' | 'Features' | 'Bug Fixes' | 'Others', typeof commits> = {
		'BREAKING CHANGES': [],
		Features: [],
		'Bug Fixes': [],
		Others: [],
	}

	for (const commit of commits) {
		if (commit.breaking) {
			groups['BREAKING CHANGES'].push(commit)
		} else if (commit.type === 'feat') {
			groups['Features'].push(commit)
		} else if (commit.type === 'fix') {
			groups['Bug Fixes'].push(commit)
		} else {
			groups['Others'].push(commit)
		}
	}

	return Object.entries(groups)
		.filter(([title, commits]) => commits.length > 0)
		.map(
			([title, commits]) =>
				`### ${title}\n\n` + commits.map(({ subject, hash }) => `- ${subject} (${hash})`).join('\n')
		)
		.join('\n\n')
}
