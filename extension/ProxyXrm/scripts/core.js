/*
    author: ricksrick
    version: 0.1
    file: core.js
    description: exposes a local proxy for the Dataverse Xrm client API.
*/

const pending_call = new Map();

/*
    Builds a proxy path for a remote Xrm operation.
    see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
*/
function remote(path = []) {
  return new Proxy(
    // Proxy target must be callable.
    () => {}, 
    // Proxy traps record property access and calls.
    {
        get: (_, key) => {
            if (key === "then") { // Send the request when the proxy is awaited.
                return (resolve, reject) => {
                    const id = crypto.randomUUID();
                    pending_call.set(id, { resolve, reject });
                    postMessage({ type: "XRM_CALL", id, path });
                }
            } else { // Record access to a nested property.
                return remote([...path, ["get", key]])
            }
        },
        apply: (_, __, args) => remote([...path, ["call", xrm_serialize(args)/*args*/]])
  });
}
window.Xrm = remote();

/*
    Resolve or reject the pending request when the CRM tab returns a result.
*/
addEventListener("message", ({ data }) => {
    if (data?.type !== "XRM_RESULT") return;

    const promise = pending_call.get(data.id);
    pending_call.delete(data.id);

    data.error
        ? promise?.reject(new Error(data.error))
        : promise?.resolve(data.result && Object.hasOwn(data.result, "__xrmResponse") ? { ...data.result, json: async () => data.result.__xrmResponse } : data.result);
});

addEventListener("message", ({ data }) => {
    if (data?.type === "XRM_CALLBACK") return;
    xrmCallbacks.get(data.id)?.(...data.args)    
});

/*
    Serialize arguments that cannot cross extension message boundaries directly.
*/
const xrmCallbacks = new Map();
function xrm_serialize(value) {
    if (typeof value === "function") {
        const id = crypto.randomUUID();
        xrmCallbacks.set(id, value);
        return { __xrmFunction: id };
    }
    if (Array.isArray(value)) { return value.map(xrm_serialize); }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => {
                if (key === "getMetadata" && typeof item === "function") {
                    return [key, {
                        __xrmFunctionResult: xrm_serialize(item.call(value))
                    }];
                }

                return [key, xrm_serialize(item)];
            })
        );
    }
    return value;
} 