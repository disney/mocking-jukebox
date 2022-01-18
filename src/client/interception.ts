import { context, MockedRequest } from 'msw';

import type { Route } from './types';


/**
 * Test whether an intercepted network request should be mocked, per an array of keys.
 *
 * @param reqArray - The keys of the intercepted network request
 * @param routeArray - The keys of the definition of the route, to determine whether or not we should mock this request
 * @returns True if the request *should* be mocked, false if not
 */
const arrayMatches = (reqArray: string[], routeArray: string[]): boolean => {
	// The route array elements must all be present within the request array
	return routeArray.every(el => reqArray.includes(el));
};


/**
 * Test whether an intercepted network request should be mocked, per an object of key-value pairs.
 *
 * @param reqObject - The intercepted network request
 * @param routeObject - The definition of the route, to determine whether or not we should mock this request
 * @returns True if the request *should* be mocked, false if not
 */
const objectMatches = (reqObject: Record<string, string>, routeObject: Record<string, string>): boolean => {
	// The route object must be a subset of the request object
	// If `reqObject` fully contains `routeObject`, we have a match and this request should be mocked
	// This check takes advantage of the fact that routeObject must be a dictionary of key-value pairs, where the values must be strings and not child objects
	return Object.entries(routeObject).every(([key, value]) => reqObject[key] === value);
};


/**
 * Test whether an intercepted network request should be mocked, per its headers. Supports `routeMatches`.
 *
 * @param reqHeaders - The headers of the intercepted network request
 * @param routeHeaders - The headers of the definition of the route, to determine whether or not we should mock this request
 * @returns True if the request *should* be mocked, false if not
 */
const headersMatch = (reqHeaders: Record<string, string>, routeHeaders?: Record<string, string> | string[]): boolean => {
	// If there are no headers defined for this route configuration, then any headers in the request can be considered a match
	if (!routeHeaders) {
		return true;
	}

	// In a route configuration, headers can be defined as an array of strings that must be present in the request headers (something like ['content-type']) where presence alone, regardless of value, constitutes a match; or the route headers can be defined as an object where the keys and values must be present within the request headers objects
	if (Array.isArray(routeHeaders)) {
		return arrayMatches(Object.keys(reqHeaders), routeHeaders);
	} else {
		return objectMatches(reqHeaders, routeHeaders);
	}
};


/**
 * Test whether an intercepted network request should be mocked, per its body. Supports `routeMatches`.
 *
 * @param reqBody - The body of the intercepted network request
 * @param routeBody - The body of the definition of the route, to determine whether or not we should mock this request
 * @returns True if the request *should* be mocked, false if not
 */
const bodyMatches = (reqBody: typeof context.body, routeBody?: Record<string, unknown> | string): boolean => {
	// If there is no body defined for this route configuration, then any body in the request can be considered a match
	if (!routeBody) {
		return true;
	}

	// In a route configuration, body can be defined as a string or an object that must be *contained within* the request body
	// “Contained within” for an object is whether a JSON stringified route body object appears within the request body string
	const routeBodyString = (typeof routeBody === 'string') ? routeBody : JSON.stringify(routeBody);
	const reqBodyString = (typeof reqBody === 'string') ? reqBody : JSON.stringify(reqBody);

	return reqBodyString.includes(routeBodyString);
};


/**
 * Test whether an intercepted network request should be mocked. MSW will intercept all network requests that match the registered URL pattern and HTTP method, but we might want some such intercepted requests to pass through (in effect, to not have been intercepted) depending on the intercepted requests’ headers or bodies.
 *
 * @param route - The intercepted route as defined in `scripts/mocking/routes`
 * @param req - The intercepted network request
 * @returns Whether or not the request matches the criteria defined in the route; if true, we intercept it and respond with mock data
 */
export const routeMatches = (route: Route, req: MockedRequest): boolean => {
	if (!route.match) {
		// No `match` property means we match only based on url and method, which MSW has already matched for us by this point
		return true;
	}

	const matchConditions = (Array.isArray(route.match)) ? route.match : [route.match];
	const reqHeaders = req.headers.all();

	// All match conditions that are defined need to match—so if both headers and body are defined in the route config, a request much match on *both* of them (not either of them) in order for the route to be mocked

	// Short circuit as soon as we know we *don’t* have a match
	return matchConditions.every(match => {
		return headersMatch(reqHeaders, match.headers) &&
		bodyMatches((req.body as typeof context.body), match.body);
	});
};
