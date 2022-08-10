/* global process, github, core */

/**
 * Update our test reminder comment with more detailed testing instructions.
 *
 * @param {github} github  - Pre-authenticated octokit/rest.js client with pagination plugins
 * @param {Object} context - Context of the workflow run
 * @param {core}   core    - A reference to the @actions/core package
 *
 * @returns {Promise<number>} Promise resolving to a comment ID, or 0 if no comment is found.
 */
async function updateTestReminderComment(github, context, core) {
	const { repo: { owner, repo: repoName } } = context;
	const { BRANCH_NAME, COMMENT_ID, TEST_COMMENT_INDICATOR } = process.env;

	core.debug( `Build: now updating the test reminder comment, ${ COMMENT_ID }, to mention how to test the PR on a WordPress.com sandbox with the script and the branch name, ${ BRANCH_NAME}.` );

	const commentBody = `${TEST_COMMENT_INDICATOR}
Are you an Automattician? You can now test your Pull Request on WordPress.com. On your sandbox, run \`bin/jetpack-downloader test jetpack ${BRANCH_NAME}\` to get started.`;
	
	await github.rest.issues.updateComment({
		owner: owner,
		repo: repoName,
		body: commentBody,
		comment_id: +COMMENT_ID,
	});
}

module.exports = updateTestReminderComment;
