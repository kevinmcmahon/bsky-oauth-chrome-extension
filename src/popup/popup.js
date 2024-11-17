document.getElementById('logout').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logout' });
    document.getElementById('profile').classList.remove('visible');
    document.getElementById('login').classList.remove('hidden');
    document.getElementById('logout').classList.add('hidden');
    document.getElementById('error-message').textContent = '';
});

document.getElementById('login').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'authenticate' });
});

function processSessionStatusMessage(message) {
    console.log('Processing session-status message:', message);
    if (message.authenticated) {
        document.getElementById('profile').classList.add('visible');
        document.getElementById('user-handle').textContent = message.profile.handle;
        document.getElementById('user-displayName').textContent = message.profile.displayName;
        document.getElementById('user-avatar').src = message.profile.avatar;
        document.getElementById('login').classList.add('hidden');
        document.getElementById('logout').classList.remove('hidden');
    } else {
        document.getElementById('profile').classList.remove('visible');
        document.getElementById('error-message').textContent = message.error || '';
        document.getElementById('login').classList.remove('hidden');
        document.getElementById('logout').classList.add('hidden');
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Popup received message:', message);
    if (message.action === 'session-status') {
        processSessionStatusMessage(message);
        return true;
    }
});

// Request session status when popup is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('calling get-session-status');
    chrome.runtime.sendMessage({ action: 'get-session-status' }, (response) => {
        console.log('Received response from background:', response);
        if (response) {
            processSessionStatusMessage(response);
        }
    });
});
