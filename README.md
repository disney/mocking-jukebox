# Mocking Jukebox

Mocking Jukebox is a library for recording and playing back network requests in order to mock backend services. This can be used both for streamlining development, in order to not rely upon live APIs that may change unexpectedly; and for automated testing, to isolate the variables being tested to only the application under test excluding backends beyond your control.

## Quickstart

Mocking Jukebox can be installed from npm:

```shell
npm install mocking-jukebox
```

> See [`test/fixtures`](./test/fixtures/) for a full, working example. Run it via `npm build && npm test` from the root of this repo.

### Client

On the client, the Mocking Jukebox library needs to be loaded and initialized; and then there needs to be some way for the user (whether a human developer or a test runner) to start Mocking Jukebox in recording or playback modes. Here is one example of how to do so; you can modify this to best suit your app.

```js
(async () => {
  // Load the Mocking Jukebox client library from your server or from CDN
  const { MockingJukebox } = await import('/mocking-jukebox.js');

  // Initialize
  const mockingJukebox = new MockingJukebox();

  // Define an album name to save mocks under,
  // and the HTTP methods and routes to intercept
  const options = {
    album: 'mocks',
    routes: [
      {
        method: 'GET',
        url: '/posts'
      }
    ]
  }

  // Provide a way to start recording via the JavaScript console
  window.recordMocks = () => mockingJukebox.record(options);

  // Provide a way to start playback via the JavaScript console
  window.playMocks = () => mockingJukebox.play(options);
})();
```

### Server

The server needs to serve the Mocking Jukebox client library and service worker (or you need to ensure those files are available from another source such as a CDN). The server also needs to provide a `/mock` endpoint for the client-side library to connect to the server to save and retrieve mock recordings.

```js
import { readFileSync } from 'fs';
import { join } from 'path';
import { cwd, env } from 'process';

import express from 'express';

import {
  mockServiceWorkerRouteHandler,
  proxyRouteHandler
} from 'mocking-jukebox';

// Cache the Mocking Jukebox client script source
const mockingJukeboxClientJs = readFileSync(
  join(cwd(), 'node_modules/mocking-jukebox/dist/client.js'), 'utf-8');

(() => {
  const server = express();
  const port = env.PORT || 3000;

  server.use(express.json()); // Support parsing JSON request bodies

  // Serve the Mocking Jukebox client library
  server.get('/mocking-jukebox.js', (req, res) => {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/javascript');
    res.send(mockingJukeboxClientJs);
  });

  // Serve the Mocking Jukebox service worker
  server.get('/mockServiceWorker.js', mockServiceWorkerRouteHandler);

  // Provide an endpoint for the Mocking Jukebox client library to use
  server.post('/mock', proxyRouteHandler);

  // Start the server
  server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
})();
```

## API

```js
new MockingJukebox({
  routeHandlerContext = {},
  startMockServiceWorkerOptions = {}
})
```

- `routeHandlerContext`: a persistent object that allows passing references to objects (such as application state) that might be undefined at startup when this function is run, but will be defined by the time the route handlers eventually intercept network requests.

- `startMockServiceWorkerOptions`: options to pass into Mocking Jukebox’s dependency, [Mock Service Worker](https://mswjs.io); specifically, to its `worker.start` call. See https://mswjs.io/docs/api/setup-worker/start.

```js
const playOrRecordOptions = {
  album: 'albumName',
  routes: [
    {
      url,
      method,
      match: {
        body,
        headers
      },
      transformRequest,
      transformResponseStatus,
      transformResponseHeaders,
      transformResponseBodyText,
      transformResponseBodyJson
    }
  ],
  routeHandlerContext,
  startMockServiceWorkerOptions
};

mockingJukebox.play(playOrRecordOptions);
mockingJukebox.record(playOrRecordOptions);
mockingJukebox.stop();
```

`play` turns on mocking: the routes defined in the options will be intercepted, and mocks returned for them (if mocks exist; otherwise an error response is returned).

`record` creates new mocks: for the routes defined in the options, real network calls will be made and the responses saved to disk before being returned to the client. The app behaves as normal, but the network traffic is saved for future use as mocks.

`stop` turns off Mocking Jukebox and returns the app to its normal state.

The options passed to `play` or `record` need at least `album` and `routes` properties. Each object in the `routes` array needs at least `url` and `method` properties.

- `playOrRecordOptions.album`: _string._ the folder name on disk where these mocks will be saved or retrieved.

- `playOrRecordOptions.routes`: an array of objects defining routes to intercept and possibly modify.

  - `routes.url`: _string._ The relative or absolute URL of the request to be intercepted and mocked.

  - `routes.method`: _string._ An uppercase HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`).

  - `routes.match`: _object._ An object to define additional properties to look at, beyond method and URL, to determine whether a request should be intercepted.

    - `match.body`: _string | object._ A request body that must be present for a particular request to be intercepted. (An object is interpreted as JSON.)

    - `match.headers`: _array | object._ Either an array of header keys or an object of key-value pairs of headers that must be present for a particular request to be intercepted.

  - `routes.transformRequest`: _function: (request, routeHandlerContext) => request._. A function to potentially change the request before Mocking Jukebox tries to match it. This could be used for purposes like normalizing authentication keys or removing passwords.

  - `routes.transformResponseStatus`: _function: (status, request, response, routeHandlerContext) => status_. A function to potentially change the status code of the mock response.

  - `routes.transformResponseHeaders`: _function: (responseHeaders, request, response, routeHandlerContext) => object_. A function to potentially edit some or all of the headers of the mock response, for example to include a particular authentication token.

  - `routes.transformResponseBodyText`: _function: (responseBodyText, request, response, routeHandlerContext) => string_. A function to potentially change the response contents for a string-returning mock. This could be used to selectively find-and-replace certain data while leaving the rest of the response defined by the recording.

  - `routes.transformResponseBodyJson`: _function: (responseBodyJson, request, response, routeHandlerContext) => object_. A function to potentially change the response contents for a JSON-returning mock. This could be used to selectively hand-mock certain data while leaving the rest of the response defined by the recording.

- `playOrRecordOptions.routeHandlerContext`: See `MockingJukebox` constructor.

- `playOrRecordOptions.startMockServiceWorkerOptions`: See `MockingJukebox` constructor.

## Notes

- The saved mocks are intended to be committed to source control. They are saved as YAML, with JSON responses converted to pretty JSON, to minimize diff noise.

- Mocks are only saved when the current working folder contains a folder named `.git`, as in, this is a project checked out via Git. This is to prevent Mocking Jukebox from being usable in recording mode in production. Mocking Jukebox will also not record if `NODE_ENV` is `'production'`.

- Even if `transformRequest` isn’t used, the headers `authorization` and `cookie` are always removed before a mock is saved to disk. This is to prevent authentication tokens from being accidentally saved and committed into source control.

## Similar Projects

- Mocking Jukebox builds on [Mock Service Worker](https://mswjs.io) to handle the network request interception. If you don’t need the recording and playback functionality that Mocking Jukebox adds, Mock Service Worker can be used on its own for handwritten mock responses to network calls.

- [Polly.js](https://netflix.github.io/pollyjs) is a similar library to Mocking Jukebox, also offering recording and playback functionality, though with a focus on testing. It also uses a different method for intercepting network calls that doesn’t involve a service worker and therefore doesn’t show the intercepted network requests in the Developer Tools Network tab. Unlike Mocking Jukebox, it has modes that run without needing a server (saving mocks in `localStorage`) and can mock Node.js server-to-server network requests (using [Nock](https://github.com/nock/nock)). Two versions of the same project using prerecorded mocks via Mocking Jukebox and via Polly.js are provided in this repo, under `test/fixtures` (Mocking Jukebox) and `comparisons/polly` (Polly.js).
