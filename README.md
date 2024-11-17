# Bluesky OAuth Implementation for Chrome Extensions

An example implementation for handling OAuth in a Chrome extension. Included is a Chrome extension specific implementation of [@atproto/oauth-client](https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client).

## Chrome Extension Implementation Notes

Your OAuth client metadata should be hosted at a URL that corresponds to the client_id of your application. This URL should return a JSON object with the client metadata. The client metadata should be configured according to the needs of your application and must respect the [ATPROTO](https://atproto.com/) spec. One of the requirements for the ```redirect_uri``` is that the URL origin must match that of the ```client_id```.

The Chrome extension example included leverages the [chrome.identiy.launchWebAuthFlow](https://developer.chrome.com/docs/extensions/reference/api/identity#method-launchWebAuthFlow) method.

From the docs:

> This method enables auth flows with non-Google identity providers by launching a web view and navigating it to the first URL in the provider's auth flow. When the provider redirects to a URL matching the pattern https://<app-id>.chromiumapp.org/*, the window will close, and the final redirect URL will be passed to the callback function.

We need to reconcile the spec calling for the URL origin for the ```redirect_uri``` URL to match the ```client_id``` and having the provider redirecting to the extension that matches the ```https://.chromiumapp.org/*``` pattern. This is accomplished by standing up a callback URL from the origin URL and having that callback redirect to the extension. 

An example express app implementation may look like this:

```javascript
const express = require('express');
const path = require('path');
const app = express();

const EXTENSION_ID = 'YOUR_EXT_ID_HERE';

// Define the route to serve the static JSON file
app.get('/oauth/client-metadata.json', (req, res) => {
    const filePath = path.join(__dirname, 'oauth', 'client-metadata.json');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving client-metadata.json:', err);
            res.status(500).send('Server error');
        }
    });
});

// OAuth callback route (from the earlier example)
app.get('/oauth/callback', async (_, res) => {
    res.redirect(`https://${EXTENSION_ID}.chromiumapp.org/oauth-success`);
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
```
