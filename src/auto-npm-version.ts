import semver from 'semver'
import { execaCommand } from 'execa'
import * as github from '@actions/github'
import { checkConventionalMessage } from './index'
import { debug } from './debug'

main()

async function main() {
	debug('process.env.GITHUB_TOKEN »', process.env.GITHUB_TOKEN)
	if (!process.env.GITHUB_TOKEN) {
		throw new Error('Expected "GITHUB_TOKEN" env to be provided.')
	}

	// Set up Git commit author for further use in "npm version" and "git push" command
	await run(`git config user.name semantic-version`)
	await run(`git config user.email semantic-version@example.com`)
	await run(`git config user.password ${process.env.GITHUB_TOKEN}`)

	const lastVersion = await getLastVersion()
	debug('lastVersion »', JSON.stringify(lastVersion))

	if (!lastVersion) {
		throw new Error('Expected "version" field to exist in package.json.')
	}

	const commits = getCommits(await getGitHistory(lastVersion))
	console.log(`Found ${commits.length} qualified commits since v${lastVersion}`)
	debug('commits »', JSON.stringify(commits, null, 2))

	const releaseType = getReleaseType(commits)
	debug('releaseType »', JSON.stringify(releaseType))

	if (!releaseType) {
		console.log('Done without releasing a new version')
		return
	}

	await run(`npm version --git-tag-version ${releaseType}`)
	await run(`git push --follow-tags origin`)

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
	const releaseRespond = await octokit.rest.repos.createRelease({
		...github.context.repo,
		tag_name: 'v' + nextVersion,
		body: releaseNote,
		make_latest: true, // TODO: compare with the latest release
	})
	debug('releaseRespond »', JSON.stringify(releaseRespond, null, 2))
	if (releaseRespond.status >= 200 && releaseRespond.status < 300) {
		console.log('Created', releaseRespond.data.url)
	}
}

async function run(command: string) {
	debug(command)
	const { stdout } = await execaCommand(command)
	debug(stdout)
	return stdout
}

async function getLastVersion() {
	return (
		semver.valid(await run('git describe --tags --abbrev=0').catch(() => '')) ||
		semver.valid(JSON.parse(await run('npm pkg get version')))
	)
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

function getReleaseType(commits: ReturnType<typeof getCommits>) {
	return (
		commits.find(({ breaking }) => breaking) && 'major' ||
		commits.find(({ type }) => type === 'feat') && 'minor' ||
		commits.find(({ type }) => type === 'fix' || type === 'build') && 'patch' ||
		null
	)
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
