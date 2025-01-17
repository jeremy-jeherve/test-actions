/* global GitHub */
const { debug } = require('@actions/core');

// Cache for getFiles.
const cache = {};

/**
 * Get list of files modified in PR.
 *
 * @param {GitHub} octokit - Initialized Octokit REST client.
 * @param {string} owner   - Repository owner.
 * @param {string} repo    - Repository name.
 * @param {string} number  - PR number.
 * @return {Promise<Array>} Promise resolving to an array of all files modified in  that PR.
 */
async function getFiles( octokit, owner, repo, number ) {
	const fileList = [];
	const cacheKey = `${ owner }/${ repo } #${ number }`;
	if ( cache[ cacheKey ] ) {
		debug( `get-files: Returning list of files modified ${ cacheKey } from cache.` );
		return cache[ cacheKey ];
	}

	debug( `get-files: Get list of files modified in ${ cacheKey }.` );

	for await ( const response of octokit.paginate.iterator( octokit.rest.pulls.listFiles, {
		owner,
		repo,
		pull_number: +number,
		per_page: 100,
	} ) ) {
		for ( const file of response.data ) {
			fileList.push( file.filename );
			if ( file.previous_filename ) {
				fileList.push( file.previous_filename );
			}
		}
	}

	cache[ cacheKey ] = fileList;
	return fileList;
}

module.exports = getFiles;
