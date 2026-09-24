/*
    author: ricksrick
    version: 0.1
    file: background.js
    description: service worker that receives proxy requests and executes them
                 in the selected Dataverse tab.
*/

/*
    Returns the selected Dataverse tab from extension storage.
*/
async function get_tab() {
    const { crmtabid } = await chrome.storage.local.get("crmtabid");
    if (!crmtabid) { throw new Error("Url non correttamente inserito all'interno del sistema") } //TODO: trovare un modo migliore di scriverlo

    const tab = await chrome.tabs.get(Number(crmtabid));
    if (!tab) {
        await chrome.storage.local.remove("crmtabid");
        throw new Error("La tab CRM selezionata è stata chiusa: selezionane un'altra");
    }
    return tab;
}

/*
    Receives proxy requests and executes the mirrored Xrm operation in the CRM page.
*/
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg.type === "XRM_CALLBACK") return void chrome.tabs.sendMessage(sender.tab.id, msg);
    if (msg.type !== "XRM_CALL") return;
    
    (async () => {
        try {
            const tab = await get_tab();

            // Execute the requested Xrm path in the selected CRM tab.
            const [{ result }] = await chrome.scripting.executeScript({
                target : { tabId : tab.id },
                world  : "MAIN",
                args   : [msg.path],
                func   : async (path) => {
                    let value = window.Xrm;
                    let context = window;
                    const restore = value => Array.isArray(value) ? value.map(restore) : value && typeof value === "object" ? value.__xrmFunction ? (...args) => window.postMessage({ type: "XRM_CALLBACK", id: value.__xrmFunction, args }) : Object.hasOwn(value, "__xrmFunctionResult") ? () => restore(value.__xrmFunctionResult) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restore(item)])) : value;

                    for (const [operation, argument] of path) {
                        if (operation === "get") {
                            context = value;
                            value = value[argument];
                        } else {
                            value = await value.apply(context, restore(argument));
                        }
                    }
                    return typeof value?.json === "function" ? { __xrmResponse: await value.json(), ok: value.ok, status: value.status, statusText: value.statusText } : value;
                }
            })
            reply({ result });
        } catch(error) { reply({error : error.message }) }
    })();

    return true;
})