const { setFailed, getInput, debug } = require( '@actions/core' );
const { context, getOctokit } = require( '@actions/github' );

/* global WebhookPayloadPullRequest, GitHub */

/**
 * Determine the priority of the issue based on severity and workarounds info from the issue contents.
 * This uses the priority matrix defined in this post: https://jeremy.hu/github-actions-build-javascript-action-part-2/
 *
 * @param {string} severity - How many users are impacted by the problem.
 * @param {string} workaround - Are there any available workarounds for the problem.
 * @returns {string} Priority of issue. High, Medium, Low, or empty string.
 */
function definePriority( severity = '', workaround = '' ) {
	const labels = {
		high: '🏔 High',
		medium: '🏕 Medium',
		low: '🏝 Low',
	};
	const { high, medium, low } = labels;

	if ( workaround === 'No and the platform is unusable' ) {
		return severity === 'One' ? medium : high;
	} else if ( workaround === 'No but the platform is still usable' ) {
		return medium;
	} else if ( workaround !== '' && workaround !== '_No response_' ) { // "_No response_" is the default value.
		return severity === 'All' || severity === 'Most (> 50%)' ? medium : low;
	}

	// Fallback.
	return '';
}

/**
 * Handle automatic triage of Pull Requests into a Github Project board.
 * 
 * @param {WebhookPayloadPullRequest} payload - The payload from the Github Action.
 * @param {GitHub}                    octokit - Initialized Octokit REST client.
 *
 * @returns {Promise<void>}
 */
async function triagePullRequest( payload, octokit ) {
	// Extra data from the event, to use in API requests.
	const { action, pull_request: { number, draft, state }, repository: { owner, name } } = payload;
	const isDraft = !! draft;

	// If the PR is closed, let's move it to the Done column.
	if ( state === 'closed' ) {
		debug( `Triage: Pull Request #${ number } is closed. Nothing to do here, GitHub projects already handles moving cards for merged PRs.` );

		return;
	}

	// If a PR is reopened, let's move it back to the In Progress column.
	if ( action === 'reopened' ) {
		debug( `Triage: Pull Request #${ number } has been reopened. Move it back to the In Progress column.` );

	}

	// If a PR is opened but not ready for review yet, add it to the In Progress column.
	if ( isDraft ) {
		debug( `Triage: Pull Request #${ number } is a draft. Add it to the In Progress column.` );

		return;
	}

	// If the PR is ready for review, let's add it to the Needs Review column.
	debug( `Triage: Pull Request #${ number } is ready for review. Add it to the Needs Review column.` );

	return;
}

( async function main() {
	debug( 'Our action is running' );

	const token = getInput( 'github_token' );
	if ( ! token ) {
		setFailed( 'Input `github_token` is required' );
		return;
	}

	// Get the Octokit client.
	const octokit = new getOctokit( token );

	// Get info about the event.
	const { payload, eventName } = context;

	debug( `Received event = '${ eventName }', action = '${ payload.action }'` );

	// Let's monitor changes to Pull Requests.
	const projectToken = getInput( 'triage_projects_token' );

	if ( eventName === 'pull_request_target' && projectToken !== '' ) {
		debug( `Triage: now processing a change to a Pull Request` );

		// For this task, we need octokit to have extra permissions not provided by the default GitHub token.
		// Let's create a new octokit instance using our own custom token.
		const projectOctokit = new getOctokit( projectToken );
		await triagePullRequest( payload, projectOctokit );
	}

	// We only want to proceed if this is a newly opened issue.
	if ( eventName === 'issues' && payload.action === 'opened' ) {
		// Extra data from the event, to use in API requests.
		const { issue: { number, body }, repository: { owner, name } } = payload;

		// List of labels to add to the issue.
		const labels = [ 'Issue triaged' ];

		// Look for priority indicators in body.
		const priorityRegex = /###\sSeverity\n\n(?<severity>.*)\n\n###\sAvailable\sworkarounds\?\n\n(?<workaround>.*)\n/gm;
		let match;
		while ( ( match = priorityRegex.exec( body ) ) ) {
			const [ , severity = '', workaround = '' ] = match;

			const priorityLabel = definePriority( severity, workaround );
			if ( priorityLabel !== '' ) {
				labels.push( priorityLabel );
			}
		}

		debug(
			`Add the following labels to issue #${ number }: ${ labels
				.map( ( label ) => `"${ label }"` )
				.join( ', ' ) }`
		);

		// Finally make the API request.
		await octokit.rest.issues.addLabels( {
			owner: owner.login,
			repo: name,
			issue_number: number,
			labels,
		} );
	}
} )();