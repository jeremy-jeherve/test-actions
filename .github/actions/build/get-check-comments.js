/**
 * Get a list of all test reminder comments in an issue.
 *
 * @param {github} github               - Pre-authenticated octokit/rest.js client with pagination plugins.
 * @param {string} owner                - The owner of the repository.
 * @param {string} repo                 - The name of the repository.
 * @param {number} number               - The number of the PR.
 * @param {string} testCommentIndicator - A piece of text unique to all test reminder comments.
 *
 * @returns {Promise<Array>} Promise resolving to an array of comment IDs.
 */
async function getCheckComments(github, owner, repo, number, testCommentIndicator) {
	// Get all the comments in our PR.
	const query = `query($owner:String!, $name:String!, $number:Int!) {
			repository(owner:$owner, name:$name){
			pullRequest(number:$number) {
				comments(first: 100) {
				nodes {
					body,
					databaseId
				}
				}
			}
			}
		}`;
	const variables = {
		owner: owner,
		name: repo,
		number: number,
	};
	
	const comments = await github.graphql(query, variables);

	// Get an array of all comment IDs that are test reminder comments.
	const testCommentIDs = comments.repository.pullRequest.comments.nodes
		.filter(
			comment => comment.body.includes(testCommentIndicator)
		)
		.map(comment => comment.databaseId);

	return testCommentIDs;
}

module.exports = getCheckComments;
