const { setFailed, getInput, debug } = require( '@actions/core' );
const { context } = require( '@actions/github' );

( async function main() {
	const token = getInput( 'github_token' );
	if ( ! token ) {
		setFailed( 'Input `github_token` is required' );
		return;
	}

	// Get info about the event.
	const { payload, eventName } = context;
	const { action } = payload;

	debug( `Received event = '${ eventName }', action = '${ action }'` );

	debug( 'Done.' );
} )();
