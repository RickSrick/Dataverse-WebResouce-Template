# XRM Proxy
Use the Dataverse `Xrm` client API from a web resource running locally.
Born from the need to test web resources locally without uploading them to Dataverse, the extension stays intentionally small: its implementation is under 150 lines of code.

## Installation

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Select the `extension/ProxyXrm` folder.

## Usage

1. Open the Dataverse or Power Apps tab that the local web resource must use.
2. Open the extension popup from the local web resource tab.
3. Select the Dataverse tab from the list and save it.
4. Reload the selected Dataverse tab when prompted.
5. Use `window.Xrm` in the local application as usual.

The local application must run on `http://localhost`. The manifest currently injects the proxy only on that host.

## Limitations

- Keep the selected Dataverse tab open. Its tab ID is stored by the extension; closing it invalidates the connection.
- The extension runs Xrm calls in the selected tab, using its current authenticated user and environment.
- Calls made through the proxy must be awaited. The bridge is asynchronous even when the corresponding Xrm API is synchronous in Dataverse.
- Functions cannot cross browser execution contexts directly. The proxy serializes supported arguments and forwards callbacks through extension messages.
- `Xrm.WebApi.execute` responses are transferred as data. The returned proxy response supports `ok`, `status`, `statusText`, and `json()`.