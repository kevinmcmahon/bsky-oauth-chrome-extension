import { Agent } from '@atproto/api';
import { ChromeExtensionOAuthClient } from '../oauth/chrome-extension-oauth-client';

const serverUrl = process.env.SERVER_URL;
const redirectUri = process.env.REDIRECT_URI;
const clientId = process.env.CLIENT_ID;
const handleResolver = process.env.HANDLE_RESOLVER;

/**
 * Initializes a new ChromeExtensionOAuthClient instance with the provided configuration.
 * This client is used to handle the OAuth authentication flow for the Bluesky platform
 * within a Chrome extension.
 *
 * The configuration includes the client ID, handle resolver, and various metadata
 * about the OAuth client, such as the client name, URI, redirect URIs, grant types,
 * response types, and scope.
 */
const oauthClient = new ChromeExtensionOAuthClient({
    clientId,
    handleResolver,
    clientMetadata: {
        client_id: clientId,
        client_name: 'OAuth Example',
        client_uri: serverUrl,
        redirect_uris: [redirectUri],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        application_type: 'native',
        scope: 'atproto transition:generic',
        dpop_bound_access_tokens: true,
    },
});

/**
 * Fetches the user's profile data from the Bluesky platform using the provided session.
 *
 * @param {Session} session - The authenticated session to use for fetching the profile.
 * @returns {Promise<any>} - A Promise that resolves to the user's profile data.
 */
async function fetchProfile(session) {
    const agent = new Agent(session);
    const profile = await agent.getProfile({ actor: agent.assertDid });
    return profile.data;
}

/**
 * Handles the OAuth callback after the user has completed the authentication flow.
 * This function extracts the session and state information from the redirect URL
 * and returns them.
 *
 * @param {string} redirectUrl - The redirect URL containing the OAuth callback parameters.
 * @returns {Promise<{ session: Session, state: any }>} - A Promise that resolves to the session and state information.
 * @throws {Error} - If the redirect URL is not present or the URL search params are invalid.
 */
async function handleOAuthCallback(redirectUrl) {
    if (!redirectUrl) {
        throw new Error('no redirect url present');
    }

    const hashParams = new URLSearchParams(new URL(redirectUrl).hash.substring(1));

    if (!hashParams) {
        throw new Error('invalid URL search params');
    }

    const { session, state } = await oauthClient.callback(hashParams);

    return { session, state };
}

/**
 * Initiates the OAuth authentication flow by requesting an authorization URL from the OAuth client,
 * launching the web authentication flow, and handling the OAuth callback to retrieve the session and state.
 *
 * @returns {Promise<{ session: Session, state: any }>} - A Promise that resolves to the authenticated session and state information.
 * @throws {Error} - If an error occurs during the OAuth flow.
 */
async function startOAuthFlow() {
    console.log('startOAuthFlow');

    try {
        const authUrl = await oauthClient.authorize(handleResolver, {
            scope: 'atproto transition:generic',
            responseMode: 'fragment',
        });

        const authResult = await chrome.identity.launchWebAuthFlow({
            url: authUrl.toString(),
            interactive: true,
        });

        const result = await handleOAuthCallback(authResult);

        return result;
    } catch (error) {
        console.error('OAuth Error:', error);
    }
}

/**
 * Handles incoming messages from the Chrome extension, processing authentication, logout, and session status requests.
 *
 * @param {Object} request - The incoming message request.
 * @param {Object} sender - Information about the sender of the message.
 * @param {function} sendResponse - A function to send a response back to the sender.
 * @returns {boolean} - Indicates whether the message channel should be kept open for an asynchronous response.
 */
function messageHandler(request, sender, sendResponse) {
    if (request.action === 'authenticate') {
        startOAuthFlow()
            .then(async (result) => {
                const profile = await fetchProfile(result.session);
                sendResponse({ success: true, profile });
            })
            .catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }
    if (request.action === 'logout') {
        oauthClient.init().then(async (result) => {
            if (result && result.session) {
                await result.session.signOut();
            }
            sendResponse({
                action: 'session-status',
                authenticated: false,
            });
        });
        return true;
    }

    if (request.action === 'get-session-status') {
        console.log('Background received get-session-status request');

        oauthClient.init().then(async (result) => {
            if (result && result.session) {
                const profile = await fetchProfile(result.session);
                sendResponse({
                    action: 'session-status',
                    authenticated: true,
                    profile,
                });
            } else {
                console.log('No active session found');
                sendResponse({
                    action: 'session-status',
                    authenticated: false,
                });
            }
        });
        return true; // Keep channel open for async response
    }
}

chrome.runtime.onMessage.addListener(messageHandler);
