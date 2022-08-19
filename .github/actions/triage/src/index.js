const { setFailed, getInput, debug } = require( '@actions/core' );
const { context, getOctokit } = require( '@actions/github' );
const triagePrToProject = require( './triage-pr-to-project' );
const labelIssues = require( './label-issues' );

( async function main() {
	debug( 'Triage: our action is running' );

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
		await triagePrToProject( payload, projectOctokit );
	}

	// We only want to proceed if this is a newly opened issue.
	if ( eventName === 'issues' && payload.action === 'opened' ) {
		debug( 'Triage: now processing newly opened issues' );
		await labelIssues( payload, octokit );
	}

	debug( `Triage: we're done triaging.` );
} )();
