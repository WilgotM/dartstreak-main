const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const CDP = require('chrome-remote-interface');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const CDP_PORT = 9000;

app.use(express.static(path.join(__dirname, 'public')));

let lastHtml = '';
let cssSent = false;

async function getChatSnapshot() {
    let client;
    try {
        client = await CDP({ port: CDP_PORT });
        const { DOM, Runtime, Page } = client;

        await DOM.enable();
        await Runtime.enable();
        await Page.enable();

        // Get all stylesheets only once
        let css = '';
        if (!cssSent) {
            const { result } = await Runtime.evaluate({
                expression: `
                    Array.from(document.styleSheets)
                        .map(sheet => {
                            try {
                                return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\\n');
                            } catch (e) { return ''; }
                        }).join('\\n')
                `,
                returnByValue: true
            });
            css = result.value;
            cssSent = true;
        }

        // Get the chat container HTML
        // We'll look for a common chat container or just take the body for simplicity
        const { result: htmlResult } = await Runtime.evaluate({
            expression: `document.body.innerHTML`,
            returnByValue: true
        });

        const currentHtml = htmlResult.value;

        if (currentHtml !== lastHtml || css) {
            lastHtml = currentHtml;
            return { html: currentHtml, css };
        }
        return null;
    } catch (err) {
        console.error('CDP Error:', err.message);
        return { error: 'Could not connect to Antigravity. Make sure it is running with --remote-debugging-port=9000' };
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function sendMessage(text) {
    let client;
    try {
        client = await CDP({ port: CDP_PORT });
        const { Runtime } = client;
        await Runtime.enable();

        // This selector depends on the Antigravity UI. 
        // Based on typical "chat" apps, we look for contenteditable or textarea.
        const expression = `
            (function(msg) {
                const draftEditor = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
                if (draftEditor) {
                    if (draftEditor.tagName === 'TEXTAREA') {
                        draftEditor.value = msg;
                        draftEditor.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        draftEditor.textContent = msg;
                        draftEditor.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    
                    // Try to find and click the send button
                    const sendButton = document.querySelector('button[type="submit"]') || 
                                     Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('send') || b.querySelector('svg'));
                    
                    if (sendButton) {
                        sendButton.click();
                    } else {
                        // Fallback: trigger Enter key
                        const event = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        });
                        draftEditor.dispatchEvent(event);
                    }
                    return true;
                }
                return false;
            })(${JSON.stringify(text)})
        `;

        const { result } = await Runtime.evaluate({ expression, returnByValue: true });
        return result.value;
    } catch (err) {
        console.error('Send Error:', err.message);
        return false;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

wss.on('connection', (ws) => {
    console.log('Mobile client connected');

    // Initial sync
    getChatSnapshot().then(data => {
        if (data) ws.send(JSON.stringify({ type: 'update', ...data }));
    });

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        if (data.type === 'send') {
            const success = await sendMessage(data.text);
            ws.send(JSON.stringify({ type: 'send_status', success }));
        }
    });
});

// Poll every 3 seconds
setInterval(async () => {
    const data = await getChatSnapshot();
    if (data && wss.clients.size > 0) {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'update', ...data }));
            }
        });
    }
}, 3000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Access from mobile via your local IP at port ${PORT}`);
});
