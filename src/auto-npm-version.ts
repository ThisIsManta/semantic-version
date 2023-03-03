import semver from 'semver'
import { execaCommand } from 'execa'
import * as github from '@actions/github'
import { checkConventionalMessage } from './index'
import { debug } from './debug'

main()

async function main() {
	const lastVersion = semver.valid(
		await run('git describe --tags --abbrev=0').catch(() => '') ||
		JSON.parse(await run('npm pkg get version'))
	)
	debug('lastVersion »', JSON.stringify(lastVersion))

	if (!lastVersion) {
		throw new Error('Expect to have a valid "version" field in package.json.')
	}

	const commits = (await run(`git log v${lastVersion}..HEAD --format=%H%s`))
		.split('\n')
		.filter(line => line.length > 0)
		.map(line => ({
			hash: line.substring(0, 40),
			message: line.substring(40),
		}))
		.filter(({ message }) => semver.valid(message) === null)
		.map(({ hash, message }) => {
			const { type, breaking, subject } = checkConventionalMessage(message, { debug: () => { } })

			return {
				hash,
				type,
				breaking,
				subject,
			}
		})
	console.log(`Found ${commits.length} commits since v${lastVersion}`)
	debug('commits »', JSON.stringify(commits, null, 2))

	const releaseType = commits.reduce((releaseType: 'major' | 'minor' | 'patch' | null, { type, breaking }) => {
		if (releaseType === 'major' || breaking) {
			return 'major'
		}

		if (releaseType === 'minor' || type === 'feat') {
			return releaseType
		}

		if (type === 'fix' || type === 'refactor') {
			return 'patch'
		}

		return releaseType
	}, null)
	debug('releaseType »', JSON.stringify(releaseType))

	if (!releaseType) {
		console.log('Exited without releasing a new version')
		return
	}

	const nextVersion = semver.valid(await run(`npm version --json --no-commit-hooks ${releaseType}`))
	debug('nextVersion »', JSON.stringify(nextVersion))
	console.log(`Created tag ${releaseType}`)

	await run(`git push --follow-tags origin`)
	console.log(`Pushed Git tags`)

	if (nextVersion && process.env.GITHUB_TOKEN) {
		const commitGroups: Record<'BREAKING CHANGES' | 'Features' | 'Bug Fixes' | 'Others', typeof commits> = {
			'BREAKING CHANGES': [],
			'Features': [],
			'Bug Fixes': [],
			'Others': [],
		}

		for (const commit of commits) {
			if (commit.breaking) {
				commitGroups['BREAKING CHANGES'].push(commit)
			} else if (commit.type === 'feat') {
				commitGroups['Features'].push(commit)
			} else if (commit.type === 'bug') {
				commitGroups['Bug Fixes'].push(commit)
			} else {
				commitGroups['Others'].push(commit)
			}
		}

		const releaseNote = Object.entries(commitGroups)
			.filter(([title, commits]) => commits.length > 0)
			.map(([title, commits]) =>
				`### ${title}\n\n` +
				commits.map(({ subject, hash }) =>
					`- ${subject} (${hash})`
				).join('\n')
			)
			.join('\n\n')
		debug('releaseNote »', releaseNote)

		const octokit = github.getOctokit(process.env.GITHUB_TOKEN)

		github.context.payload.ref

		// See https://octokit.github.io/rest.js/v19#repos-create-release
		const releaseRespond = await octokit.rest.repos.createRelease({
			...github.context.repo,
			tag_name: nextVersion,
			body: releaseNote,
		})
		debug('releaseRespond »', JSON.stringify(releaseRespond, null, 2))
		console.log('Created a new release on GitHub')
	}
}

async function run(command: string) {
	debug(command)
	const { stdout } = await execaCommand(command)
	debug(stdout)
	return stdout
}
