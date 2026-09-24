/*
    author: ricksrick
    version: 0.1
    file: relay.js
    description: forwards proxy messages between the page and the extension.
*/

addEventListener("message", async ({ source, data }) => {
    if (source !== window || data?.type !== "XRM_CALL") return;
    // Forward the request to the extension service worker.
    const result = await chrome.runtime.sendMessage(data);

    // Return the result to the page proxy.
    postMessage({ type: "XRM_RESULT", id: data.id, ...result });
});