import { rest, restContext, MockedRequest } from 'msw';

import { routeMatches } from './interception';
import { MockingMode } from '../shared/enums';

import type { Route, RouteHandlerContext } from './types';
import type { MockingState } from '../shared/types';


/**
 * Handle intercepted network requests: either proxy them (as if they weren’t actually intercepted, if the matching criteria are unmet); respond with a prerecorded mock; or respond with a freshly-created mock saved on the server.
 *
 * @param input - Input arguments (see below)
 */
const getMockedResponse = ({
	fetch, // A reference to the `fetch` function provided by MSW, which is just like window.fetch but won’t be intercepted by MSW
	mockingState, // The current state of the instantiated Mocking Jukebox
	request, // The intercepted network request
	route, // The intercepted route definition
}: {
	fetch: typeof restContext.fetch;
	mockingState: MockingState;
	request: MockedRequest;
	route: Route;
}): Promise<Response> => {
	// https://github.com/mswjs/msw/issues/77#issue-585535574
	return fetch('/mock', {
		body: JSON.stringify({
			album: mockingState.album,
			match: route.match,
			mockingMode: mockingState.mode,
			request: {
				body: request.body,
				bodyUsed: request.bodyUsed,
				// cache: skip
				cookies: request.cookies,
				credentials: request.credentials,
				destination: request.destination,
				headers: request.headers.all(),
				// integrity: skip
				keepalive: request.keepalive,
				method: request.method,
				mode: request.mode, // For example: 'cors'
				redirect: request.redirect,
				// referrer: skip
				// referrerPolicy: skip
				url: request.url
			}
		}),
		cache: 'no-cache',
		headers: {
			'content-type': 'application/json'
		},
		method: 'POST'
	});
};


/**
 * Get the callbacks to register for all network requests we’re configuring MSW to intercept. In our case all routes get the same handler that simply behaves differently based on the configuration values present in the route.
 *
 * @param routes - Definitions of network requests to intercept, including how to determine whether the request should be intercepted as well as hooks to transform the request or response
 * @param routeHandlerContext - A persistent object that allows passing references to objects (such as a Redux store) that might be undefined at startup when this function is run, but will be defined by the time the route handlers eventually run
 */
export function getHandlers (options: {
	mockingState: MockingState; // The current state of the instantiated Mocking Jukebox
	routes: Route[]; // Definitions of network requests to intercept, including how to determine whether the request should be intercepted as well as hooks to transform the request or response
	routeHandlerContext: RouteHandlerContext; // A persistent object that allows passing references to objects (such as a Redux store) that might be undefined at startup when this function is run, but will be defined by the time the route handlers eventually run
}): ReturnType<typeof rest.get>[] {
	const {
		mockingState,
		routes,
		routeHandlerContext,
	} = options;

	return routes.map(route => {
		const handlerCallback: Parameters<typeof rest.get>[1] = async function (req, res, context) {
			const mockingEnabled = mockingState.mode !== MockingMode.Disabled;
			let request: MockedRequest = req as MockedRequest;

			if (mockingEnabled && route.transformRequest) {
				request = await route.transformRequest(request, routeHandlerContext);
			}

			let response: Response;
			let responseStatus: number;
			let responseHeaders: Record<string, string> = {};
			let responseBody: string;

			const interceptRequest = mockingEnabled && routeMatches(route, request);

			if (interceptRequest) {
				response = await getMockedResponse({
					fetch: context.fetch,
					mockingState,
					request,
					route,
				});

				responseStatus = (route.transformResponseStatus) ?
					await route.transformResponseStatus(response.status, request, response, routeHandlerContext) :
					response.status;

				if (route.transformResponseBodyJson) {
					const responseBodyJson = await response.json();
					const responseBodyObject =
						await route.transformResponseBodyJson(responseBodyJson, request, response, routeHandlerContext);

					responseBody = JSON.stringify(responseBodyObject);
				} else {
					const responseBodyText = await response.text();

					responseBody = (route.transformResponseBodyText) ?
						await route.transformResponseBodyText(responseBodyText, request, response, routeHandlerContext) :
						responseBodyText;
				}
			} else {
				response = await context.fetch(request); // https://github.com/mswjs/msw/issues/77#issue-585535574
				responseStatus = response.status;
				responseBody = await response.text();
			}

			// Convert Headers (https://developer.mozilla.org/en-US/docs/Web/API/Headers) into plain object
			response.headers.forEach((headerValue: string, headerKey: string) => { // Yes, value before key. Aren’t Web APIs great?
				responseHeaders[headerKey] = headerValue;
			});
			if (route.transformResponseHeaders) {
				responseHeaders = await route.transformResponseHeaders(responseHeaders, request, response, routeHandlerContext);
			}

			// All responses have bodies, yes, but some are empty (like what would come back from a status 201 response)
			if (responseBody && responseBody !== '') {
				return res(
					context.status(responseStatus),
					context.set(responseHeaders),
					context.body(responseBody) as Parameters<typeof res>[0],
				);
			} else {
				return res(
					context.status(responseStatus),
					context.set(responseHeaders),
				);
			}
		};

		return rest[route.method.toLowerCase() as keyof typeof rest](route.url, handlerCallback);
	});
}
