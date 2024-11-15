const { getInput, debug } = require( '@actions/core' );
const getIssueType = require( '../../utils/labels/get-issue-type' );

/**
 * Assigns any issues that are being worked to the author of the matching PR.
 *
 * @param {WebhookPayloadPullRequest} payload - Pull request event payload.
 * @param {GitHub}                    octokit - Initialized Octokit REST client.
 */
async function triageIssues( payload, octokit ) {
	const { issue: { number, type = {} }, repository: { owner, name } } = payload;
	const ownerLogin = owner.login;

	const issueType = await getIssueType( octokit, ownerLogin, name, number );

	if ( issueType ) {
		debug( `Issue type (from any existing label) is: ${ issueType }` );
	}

	// Let's check if the issue has a type set (the type const is an object that is not empty).
	if ( type ) {
		debug( `Issue type is: ${ JSON.stringify(type) }` );
	}
}

module.exports = triageIssues;
