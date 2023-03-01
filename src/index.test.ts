import { allowedTypes, checkConventionalMessage } from './index'

const debug = jest.fn()

it('does not return any error, given a valid pattern', () => {
	for (const type of allowedTypes) {
		expect(checkConventionalMessage(type + ': xxx', { debug })).toEqual({
			type: type,
			breaking: false,
			subject: 'xxx',
			errors: []
		})
	}

	expect(checkConventionalMessage('chore!: xxx', { debug })).toEqual({
		type: 'chore',
		breaking: true,
		subject: 'xxx',
		errors: []
	})
})

it('returns the error, given an invalid pattern', () => {
	expect(checkConventionalMessage('xxx', { debug })).toMatchObject({
		errors: [
			'The pull request title must match the pattern of "<type>[!]: <subject>" which is a reduced set of https://www.conventionalcommits.org/en/v1.0.0/'
		]
	})
})

it('returns the error, given an unknown type', () => {
	expect(checkConventionalMessage('unknown: xxx', { debug })).toMatchObject({
		type: 'unknown',
		errors: [
			'The type in a pull request title must be one of \"feat\", \"fix\", \"test\", \"refactor\", \"chore\".'
		]
	})
})

it('returns the error, given a non-lower-case type', () => {
	expect(checkConventionalMessage('CHORE: xxx', { debug })).toMatchObject({
		errors: [
			'The type in a pull request title must be in lower case only.'
		]
	})
})

it('returns the error, given a scope', () => {
	expect(checkConventionalMessage('chore(scope): xxx', { debug })).toMatchObject({
		errors: [
			'A scope in a pull request title is never allowed.'
		]
	})
})

it('returns the error, given zero or more-than-one spaces after ":" symbol', () => {
	expect(checkConventionalMessage('chore:xxx', { debug })).toMatchObject({
		subject: 'xxx',
		errors: [
			'A single space must be after ":" symbol.'
		]
	})

	expect(checkConventionalMessage('chore:  xxx', { debug })).toMatchObject({
		subject: 'xxx',
		errors: [
			'A single space must be after ":" symbol.'
		]
	})
})

it('returns the error, given the first word in non-lower-case for the subject', () => {
	expect(checkConventionalMessage('chore: Xxx', { debug })).toMatchObject({
		errors: [
			'The subject must start with a lower case latin alphabet.'
		]
	})
})
