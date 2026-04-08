import { context, getOctokit } from '@actions/github'

import {
	run,
	npm,
	getCurrentPackageVersion,
	getGitHistory,
	getReleaseType,
	getReleaseNote,
} from './index'

;(async function () {
	// See https://github.com/actions/checkout#push-a-commit-using-the-built-in-token
	const existingGitUserName = await run(`git config user.name`).catch(() => '')
	if (!existingGitUserName) {
		console.log(
			'Setting Git commit author for further use in `' + npm + ' version` and `git push` command...'
		)

		const name = context.payload.pusher?.name || context.actor
		console.log('  user.name =', name)
		await run(`git config user.name ${name}`)

		const email = context.payload.pusher?.email || 'github-actions@github.com'
		console.log('  user.email =', name)
		await run(`git config user.email ${email}`)
	}

	console.log('Getting the remote repository...')
	const remote = (await run(`git remote`)) || 'origin'
	console.log('  remote =', remote)

	if (!process.env.GITHUB_TOKEN) {
		throw new Error('Expected "GITHUB_TOKEN" to be set in the environment variables.')
	}

	// See https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#configuring-the-default-github_token-permissions
	console.log(
		'Checking if the current setup has the permission to push to the remote repository...'
	)
	await run(`git push --dry-run ${remote}`)
	console.log('  OK')

	console.log('Getting the current package version...')
	const currentVersion = await getCurrentPackageVersion()
	console.log('  version =', currentVersion ?? JSON.stringify(currentVersion))

	if (!currentVersion) {
		throw new Error('Expected "version" field to exist in package.json.')
	}

	console.log('Getting the commit history since the current version...')
	const commits = await getGitHistory(currentVersion)
	if (commits.length === 0) {
		console.log('  Found 0 commits.')
	} else {
		for (const commit of commits) {
			console.log(
				`  - ${commit.type}${commit.breaking ? '!' : ''}: ${commit.subject} (${commit.hash.substring(0, 7)})`
			)
		}
	}

	console.log('Determining the upcoming release type...')
	const releaseType = getReleaseType(commits)
	console.log('  ' + JSON.stringify(releaseType))

	if (!releaseType) {
		console.log('')
		console.log('Done without a new version.')
		return
	}

	console.log('Running `' + npm + ' version` command and its pre-post scripts...')
	await run(`${npm} version ${releaseType} --git-tag-version --no-commit-hooks`)
	console.log('  OK')

	console.log('Pushing the new version to the remote repository...')
	await run(`git push --follow-tags ${remote}`)
	console.log('  OK')

	console.log('Verifying the new version...')
	const latestVersion = await getCurrentPackageVersion()
	console.log('  version =', latestVersion ?? JSON.stringify(latestVersion))

	console.log('Creating a release note on GitHub...')
	const releaseNote = getReleaseNote(commits)

	// See https://octokit.github.io/rest.js/v19#repos-create-release
	const octokit = getOctokit(process.env.GITHUB_TOKEN)
	const releaseCreationRespond = await octokit.rest.repos.createRelease({
		...context.repo,
		tag_name: 'v' + latestVersion,
		body: releaseNote,
		make_latest: 'legacy',
	})
	console.log('  ' + releaseCreationRespond.data.html_url)

	console.log('')
	console.log('Done with the new version.')
})()
