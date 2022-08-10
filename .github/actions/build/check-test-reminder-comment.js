const getCheckComments = require('./get-check-comments.js');

/* global process, github, core */

/**
 * Check if there is already a test reminder comment on the PR.
 * If there is, delete it if it is not needed anymore.
 * If there isn't, create one if it is needed.
 *
 * @param {github} github  - Pre-authenticated octokit/rest.js client with pagination plugins
 * @param {Object} context - Context of the workflow run
 * @param {core}   core    - A reference to the @actions/core package
 *
 * @returns {Promise<number>} Promise resolving to a comment ID, or 0 if no comment is found.
 */
async function checkTestReminderComment( github, context, core ) {
	const { repo, issue } = context;
	const { owner, repo: repoName } = repo;
	const { TOUCHED_PROJECTS, TEST_COMMENT_INDICATOR } = process.env;
	const touchesJetpack = TOUCHED_PROJECTS.includes('plugins/jetpack');

	// Get all the test reminder comments in our PR.
	const testCommentIDs = await getCheckComments(github, owner, repoName, issue.number, TEST_COMMENT_INDICATOR, core);

	// This PR does not touch Jetpack.
	if (!touchesJetpack) {
		// If it previously touched Jetpack, delete the comments that were created then.
		if (testCommentIDs.length > 0) {
			core.debug( `Build: this PR previously touched Jetpack, but does not anymore. Deleting previous test reminder comments.` );

			await Promise.all(
				testCommentIDs.map(async commentID => {
					await github.rest.issues.deleteComment({
						owner,
						repo: repoName,
						comment_id: commentID,
					});
				})
			);
		}

		return 0;
	}

	// If our PR touches Jetpack, and there was previously a test reminder comment, return it.
	// There should normally only be one comment, but we need to handle the case where there would be more.
	// If so, we'll only take care of the first one.
	if (testCommentIDs.length > 0) {
		core.debug(`Build: this PR touches Jetpack, and there was previously a test reminder comment, ${testCommentIDs[0] }.` );
		return testCommentIDs[0];
	}

	// If our PR touches Jetpack, and there has been no test reminder comment yet, create one.
	if (testCommentIDs.length === 0 ) {
		core.debug(`Build: this PR touches Jetpack, and there has been no test reminder comment yet. Creating one.` );
		const body = `${TEST_COMMENT_INDICATOR }Are you an Automattician? The PR will need to be tested on WordPress.com. This comment will be updated with testing instructions as soon the build is complete.`;
		const { data: { id } } = await github.rest.issues.createComment({
			issue_number: issue.number,
			owner,
			repo: repoName,
			body
		});
		core.debug( `Build: created test reminder comment with ID ${id}.` );
		return id;
	}

	// Fallback. No comment exists, or was created.
	core.debug( `Build: final fallback. No comment exists, or was created. We should not get here.` );
	return 0;
}

module.exports = checkTestReminderComment;
