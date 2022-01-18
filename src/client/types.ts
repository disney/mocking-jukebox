import { HttpMethod } from '../shared/enums';

import type { MockedRequest, setupWorker } from 'msw';
import type { RouteMatch } from '../shared/types';


export interface Route {
	url: string;
	method: HttpMethod;

	// Define values that you want to be matched when determining whether or not to return a recording for a particular request (url and method are always matched)
	// For example, if a header should be considered when choosing which recording to return, include it (and the value to match) in the headers property
	// For multiple potential matches (such as several potential body values) define an array of match objects
	match?: RouteMatch | RouteMatch[];

	transformRequest?(request: MockedRequest, context: RouteHandlerContext): Promise<MockedRequest>;
	transformResponseStatus?(status: number, request: MockedRequest, response: Response, context: RouteHandlerContext): Promise<number>;
	transformResponseHeaders?(headers: Record<string, string>, request: MockedRequest, response: Response,
		context: RouteHandlerContext): Promise<Record<string, string>>;
	transformResponseBodyText?(body: string, request: MockedRequest, response: Response, context: RouteHandlerContext): Promise<string>;
	transformResponseBodyJson?(body: Record<string, unknown>, request: MockedRequest, response: Response, context: RouteHandlerContext): Promise<Record<string, unknown>>;
}

export type RouteHandlerContext = Record<string, unknown>;

export interface EnableMockingOptions {
	album: string;
	routes: Route[];
	routeHandlerContext?: RouteHandlerContext;
	startMockServiceWorkerOptions?: StartMockServiceWorkerOptions;
}

export type StartMockServiceWorkerOptions = Parameters<ReturnType<typeof setupWorker>['start']>[0];
