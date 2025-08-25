import { getCSpellWords, writeCSpellWords } from '../utils/cspell'

const cSpellWords = getCSpellWords()

const cSpellWordsSorted = cSpellWords.toSorted((a, b) => {
	const lowercaseA = a.toLowerCase()
	const lowercaseB = b.toLowerCase()

	if (lowercaseA < lowercaseB) {
		return -1
	}

	if (lowercaseA > lowercaseB) {
		return 1
	}

	return 0
})

const cSpellWordsFinal = cSpellWordsSorted.reduce<string[]>(
	(prev, cur) => (prev.includes(cur) ? prev : prev.concat([cur])),
	[],
)

const needsUpdate =
	cSpellWordsFinal.length !== cSpellWords.length ||
	cSpellWords.map((word, index) => word !== cSpellWordsFinal[index]).includes(true)

if (!needsUpdate) {
	process.exit(0)
}

writeCSpellWords(cSpellWordsFinal)

// Exit code 55 indicates that we changed the list of words.
process.exit(55)
