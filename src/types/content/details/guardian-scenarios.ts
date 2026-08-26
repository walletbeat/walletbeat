/**
 * One tested guardian scenario and what it means for the user.
 *
 * The `consequence` is the reason the scenario failed on the dimension the
 * attribute reports on: why recovery is impossible for account recovery, or
 * how the account can be taken over for account unruggability. A scenario that
 * passes has no consequence, so adapters have nothing to introduce and cannot
 * leave a dangling colon behind.
 */
export interface GuardianScenarioOutcomeDetail {
	id: string

	/** Plain templated text, such as `User forgets their wallet password`. */
	scenario: string

	consequence?: string
}
