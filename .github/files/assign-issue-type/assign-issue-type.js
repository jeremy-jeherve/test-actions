/* global GitHub, Core */

/**
 * Loop through all open Issues in our repo.
 * If some of them have labels that match an issue type in use in our organization,
 * automatically add the issue type to the issue.
 *
 * @param {GitHub} github  - Pre-authenticated octokit/rest.js client with pagination plugins
 * @param {object} context - Context of the workflow run
 * @param {Core}   core    - A reference to the @actions/core package
 * @return {Promise} Promise resolving to an object with the following properties:
 * - {commentId} - a comment ID, or 0 if no comment is found.
 * - {projects} - an array of project strings needing testing.
 */
async function assignTypeToIssues( github, context, core ) {
	const { organization, repository } = context;

	// Labels that currently match our org issue types.
	const supportedTypeLabels = {
		task: {
			name: '[Type] Task',
		},
		bug: {
			name: '[Type] Bug',
		},
		enhancement: {
			name: '[Type] Enhancement',
		},
		epic: {
			name: 'Epic',
		},
	};

	// Get IDs of all the different issue types available in the organization.
	const issueTypes = await github.graphql(
		`query {
			organization(login: "${ organization }") {
				issueTypes(first: 100) {
					nodes {
						id
						name
					}
				}
			}
		}`
	);

	// If an issue type's name matches one of our labels, edit our supportedTypeLabels object to add the issue type ID.
	for ( const issueType of issueTypes.data.organization.issueTypes.nodes ) {
		if ( supportedTypeLabels[ issueType.name ] ) {
			supportedTypeLabels[ issueType.name ].id = issueType.id;
		}
	}

	core.info( JSON.stringify( supportedTypeLabels, null, 2 ) );

	// Loop through each supported type label.
	// For each label, loop through all open issues/PRs that have that label.
	// For each issue, check if it is an issue or a PR.
	// If it is an issue, add an issue type matching the found label.
	for ( const supportedType of Object.keys( supportedTypeLabels ) ) {
		for await ( const response of github.paginate.iterator( github.rest.issues.listForRepo, {
			owner: organization,
			repo: repository,
			state: 'open',
			labels: supportedTypeLabels[ supportedType ].name,
			per_page: 100,
		} ) ) {
			for ( const issue of response.data ) {
				// Do not attempt to add issue type to PRs.
				if ( issue.pull_request ) {
					continue;
				}

				// Add an issue type matching the found label.
				const isUpdatedIssue = await github.graphql(
					`mutation {
						updateIssue(input: {
							issueId: ${ issue.id },
							issueTypeId: ${ supportedTypeLabels[ supportedType ].id }
						}) {
							issue {
								id
							}
						}
					}`
				);

				core.info(
					`Issue ${ issue.id } has been updated. The response from the API is ${ JSON.stringify(
						isUpdatedIssue
					) }`
				);
			}
		}
	}
}

export default assignTypeToIssues;
