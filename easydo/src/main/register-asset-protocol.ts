import { protocol } from "electron";

export function registerAssetProtocol(): void {
  protocol.registerFileProtocol("easydo-asset", (request, callback) => {
    const url = new URL(request.url);
    const encodedPath = `${url.hostname}${url.pathname}`.replace(/^local\/?/, "");
    const absolutePath = decodeURIComponent(
      encodedPath.startsWith("/") ? encodedPath : `/${encodedPath}`
    );
    callback(absolutePath);
  });
}
