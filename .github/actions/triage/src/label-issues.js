const { debug } = require( '@actions/core' );

/* global WebhookPayloadIssue, GitHub */

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
 * Find list of components impacted by issue, based off issue contents.
 *
 * @param {string} body - The issue content.
 * @returns {Array} Components concerned by issue.
 */
function findComponents( body ) {
	const regex = /###\sImpacted\scomponent\n\n([a-zA-Z\s\(\),]*)\n\n/gm;

	const match = regex.exec(body);
	if ( match ) {
		const [, components] = match;
		return components.split(', ').filter(v => v.trim() !== '');
	}

	// Fallback.
	debug( 'Triage: No components found.' );
	return [];
}

/**
 * 
 * @param {WebhookPayloadIssue} payload - The payload from the Github Action.
 * @param {GitHub}              octokit - Initialized Octokit REST client.
 * @returns {Promise<void>}
 */
async function labelIssues( payload, octokit ) {
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

	// Look for a component indicator in the issue body.
	const impactedComponents = findComponents( body );
	if ( impactedComponents.length > 0 ) {
		impactedComponents.map( component => labels.push( `[Component] ${ component }` ) );
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

module.exports = labelIssues;
