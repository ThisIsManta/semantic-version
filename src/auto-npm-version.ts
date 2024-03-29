import semver from 'semver'
import * as github from '@actions/github'
import { checkConventionalMessage } from './index'
import { run } from './run'
import { debug } from './debug'

main()

async function main() {
	debug('process.env.GITHUB_TOKEN »', process.env.GITHUB_TOKEN)
	if (!process.env.GITHUB_TOKEN) {
		throw new Error('Expected "GITHUB_TOKEN" env to be provided.')
	}

	// Set up Git commit author for further use in "npm version" and "git push" command
	// See https://github.com/actions/checkout#push-a-commit-using-the-built-in-token
	if (!(await run(`git config user.name`).catch(() => ''))) {
		await run(`git config user.name ${github.context.payload.pusher?.name || github.context.actor}`)
		await run(`git config user.email ${github.context.payload.pusher?.email || 'github-actions@github.com'}`)
	}

	const remote = await run(`git remote`) || 'origin'

	// Check if the given GITHUB_TOKEN has the permission to push to the repository
	// See https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#configuring-the-default-github_token-permissions
	await run(`git push --dry-run ${remote}`)

	const lastVersion = await getLastVersion()
	debug('lastVersion »', JSON.stringify(lastVersion))

	if (!lastVersion) {
		throw new Error('Expected "version" field to exist in package.json.')
	}

	const commits = getCommits(await getGitHistory(lastVersion))
	console.log(`Found ${commits.length} qualified commit${commits.length === 1 ? '' : 's'} since v${lastVersion}`)
	debug('commits »', JSON.stringify(commits, null, 2))

	const releaseType = getReleaseType(commits)
	debug('releaseType »', JSON.stringify(releaseType))

	if (!releaseType) {
		console.log('Done without a new version')
		return
	}

	await run(`npm version --git-tag-version ${releaseType}`)
	await run(`git push --follow-tags ${remote}`)

	const nextVersion = await getLastVersion()
	debug('nextVersion »', JSON.stringify(nextVersion))
	console.log(`Created tag v${nextVersion}`)

	if (!nextVersion) {
		throw new Error(`Expected "${nextVersion}" returned from "npm version" to be a valid semantic version.`)
	}

	const releaseNote = getReleaseNote(commits)
	debug('releaseNote »', releaseNote)

	const octokit = github.getOctokit(process.env.GITHUB_TOKEN)

	// See https://octokit.github.io/rest.js/v19#repos-create-release
	const releaseCreationRespond = await octokit.rest.repos.createRelease({
		...github.context.repo,
		tag_name: 'v' + nextVersion,
		body: releaseNote,
		make_latest: 'legacy',
	})
	debug('releaseCreationRespond »', JSON.stringify(releaseCreationRespond, null, 2))
	console.log('Done with a new release at', releaseCreationRespond.data.html_url)
}

async function getLastVersion() {
	const versionFromGit = await run('git describe --tags --abbrev=0').catch(() => null)
	const versionFromPackageJSON = JSON.parse(await run('npm pkg get version'))
	const versions = [versionFromGit, versionFromPackageJSON]
		.map(version => semver.valid(version))
		.filter((version): version is string => !!version)

	// Choose the higher version
	return semver.sort(versions).pop()
}

async function getGitHistory(version: string) {
	const tagFound = !!(await run(`git tag --list v${version}`))

	return await run(`git --no-pager log ${tagFound ? `v${version}..HEAD` : ''} --format=%H%s`)
}

function getCommits(gitLog: string) {
	return gitLog
		.split('\n')
		.filter(line => line.length > 0)
		.map(line => ({
			hash: line.substring(0, 40),
			message: line.substring(40),
		}))
		.filter(({ message }) => semver.valid(message) === null)
		.map(({ hash, message }) => {
			const { type, breaking, subject } = checkConventionalMessage(message, { debug: () => { } })
			return { hash, type, breaking, subject }
		})
}

function getReleaseType(commits: ReturnType<typeof getCommits>): string | null {
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

function getReleaseNote(commits: ReturnType<typeof getCommits>) {
	const groups: Record<'BREAKING CHANGES' | 'Features' | 'Bug Fixes' | 'Others', typeof commits> = {
		'BREAKING CHANGES': [],
		'Features': [],
		'Bug Fixes': [],
		'Others': [],
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
		.map(([title, commits]) =>
			`### ${title}\n\n` +
			commits.map(({ subject, hash }) =>
				`- ${subject} (${hash})`
			).join('\n')
		)
		.join('\n\n')
}
