import { describe, it, expect } from 'vitest'
import { getReleaseType } from './auto-npm-version'

describe(getReleaseType, () => {
	it('returns major, given at least one breaking', () => {
		expect(getReleaseType([
			{
				hash: 'hash1',
				type: 'feat',
				breaking: false,
				subject: 'subject',
			},
			{
				hash: 'hash2',
				type: 'fix',
				breaking: true,
				subject: 'subject',
			},
			{
				hash: 'hash3',
				type: 'build',
				breaking: true,
				subject: 'subject',
			},
		])).toBe('major')
	})

	it('returns minor, given at least one feat', () => {
		expect(getReleaseType([
			{
				hash: 'hash1',
				type: 'feat',
				breaking: false,
				subject: 'subject',
			},
			{
				hash: 'hash2',
				type: 'fix',
				breaking: false,
				subject: 'subject',
			},
			{
				hash: 'hash3',
				type: 'build',
				breaking: false,
				subject: 'subject',
			},
		])).toBe('minor')
	})

	it('returns patch, given at least one fix or build', () => {
		expect(getReleaseType([
			{
				hash: 'hash1',
				type: 'chore',
				breaking: false,
				subject: 'subject',
			},
			{
				hash: 'hash2',
				type: 'fix',
				breaking: false,
				subject: 'subject',
			},
		])).toBe('patch')

		expect(getReleaseType([
			{
				hash: 'hash1',
				type: 'chore',
				breaking: false,
				subject: 'subject',
			},
			{
				hash: 'hash2',
				type: 'build',
				breaking: false,
				subject: 'subject',
			},
		])).toBe('patch')
	})

	it('returns null, given none of the above', () => {
		expect(getReleaseType([
			{
				hash: 'hash1',
				type: 'chore',
				breaking: false,
				subject: 'subject',
			},
		])).toBeNull()

		expect(getReleaseType([])).toBeNull()
	})
})
