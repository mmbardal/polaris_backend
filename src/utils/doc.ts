import assert from "node:assert";
import type { Server } from "hyper-express";

export async function initApiDoc(server: Server, openApi: string, useSSL: boolean): Promise<void> {
  assert.ok(openApi.endsWith(".json"), "openApi should have json format");

  const { LiveFile } = await import("@paratco/live-file");

  const redocIndex = `<!doctype html>
<html>
  <body>
    <redoc spec-url="openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
    </body>
</html>
`;

  const scalarIndex = `<!doctype html>
<html>
  <head>
    <title>Paziresh API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference"> </script>

    <script>
        var configuration = {
    defaultHttpClient: {
      targetKey: 'js',
      clientKey: 'axios',
    },
    hideDownloadButton: true,
    spec: {
        url: 'openapi.json'
      }
  }

      document.getElementById('api-reference').dataset.configuration = JSON.stringify(configuration)
    </script>

    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  const oasFile = new LiveFile({ path: openApi, watch: true, onDemand: true });

  server.get("/scalar/*", async (req, res) => {
    const path = req.path.slice("/scalar".length);

    if (path === "" || path === "/" || path === "scalarIndex.html") {
      res.html(scalarIndex);

      return;
    }

    if (path === "/openapi.json") {
      const rowBody = await oasFile.body;
      const body = JSON.parse(rowBody.toString("utf8")) as Record<string, unknown>;

      if (body.servers === undefined || !Array.isArray(body.servers)) {
        throw new Error(`${openApi} should have servers`);
      }

      const url = new URL((body.servers as { url: string; description: string }[])[0].url);
      url.host = `${req.hostname}:${req.app.port}`;
      url.protocol = useSSL ? "https:" : "http:";

      body.servers = [{ url: url.toString(), description: "Server" }];

      res.json(body);
    }

    res.status(404).send();
  });

  server.get("/scalar", (_, res) => {
    res.html(`<html><body><script>window.location += "/"</script></body></html>`);
  });

  server.get("/redoc/*", async (req, res) => {
    const path = req.path.slice("/redoc".length);

    if (path === "" || path === "/" || path === "index.html") {
      res.html(redocIndex);

      return;
    }

    if (path === "/openapi.json") {
      const rowBody = await oasFile.body;
      const body = JSON.parse(rowBody.toString("utf8")) as Record<string, unknown>;

      if (body.servers === undefined || !Array.isArray(body.servers)) {
        throw new Error(`${openApi} should have servers`);
      }

      const url = new URL((body.servers as { url: string; description: string }[])[0].url);
      url.host = `${req.hostname}:${req.app.port}`;
      url.protocol = useSSL ? "https:" : "http:";

      body.servers = [{ url: url.toString(), description: "Server" }];

      res.json(body);
    }

    res.status(404).send();
  });

  server.get("/redoc", (_, res) => {
    res.html(`<html><body><script>window.location += "/"</script></body></html>`);
  });
}
