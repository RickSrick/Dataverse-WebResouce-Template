/*
    author: ricksrick
    version: 0.1
    file: popup.js
    description: lets the user select the Dataverse tab stored by the extension.
*/

function get_input() {
    const input_field = document.querySelector("#crmurl");
    if (!input_field) {
        console.error("input field not found");
        return null;
    }
    return input_field;
}
async function get_tabs() {
    return await chrome.tabs.query({
        url: ["https://*.dynamics.com/*", "https://*.powerapps.com/*"]
    });
}

/*
    Populate the tab selector and restore the saved selection when available.
*/
document.addEventListener("DOMContentLoaded", async () => {
    const input_field = get_input();
    if (!input_field) { return; }
    const tabs = await get_tabs();

    input_field.replaceChildren(
        ...tabs.map((tab, index) => new Option( "[" + (index+1) + "] " + tab.title, String(tab.id)))
    );

    const result = await chrome.storage.local.get("crmtabid");
    input_field.value = result.crmtabid ?? "";
});

/*
    Save the selected Dataverse tab ID.
*/
document.querySelector("#save").addEventListener("click", async () => {
    const input_field = get_input();
    if (!input_field) { return; }
    
    const status_text = document.querySelector("#status");
    try {        
        await chrome.storage.local.set({ "crmtabid" : input_field.value });
        status_text.textContent = "URL salvato correttamente";
        status_text.style.color = 'green';
        status_text.style.display = "block";
        await chrome.tabs.reload();
    } catch {
        status_text.textContent = "Errore durante il salvataggio dell'url";
        status_text.style.color = 'red';
        status_text.style.display = "block";
    }
});