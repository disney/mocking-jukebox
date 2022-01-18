import { setupWorker } from 'msw';

import { MockingMode } from '../shared/enums';
import { getHandlers } from './handlers';

import type { MockingState } from '../shared/types';
import type { EnableMockingOptions, RouteHandlerContext, StartMockServiceWorkerOptions } from './types';


const defaultState: MockingState = {
	album: undefined,
	mode: MockingMode.Disabled
};

/**
 * Mocking Jukebox class for encapsulating state and providing methods.
 */
export class MockingJukebox {
	readonly routeHandlerContext: RouteHandlerContext;
	readonly startMockServiceWorkerOptions: StartMockServiceWorkerOptions;

	#state: MockingState = defaultState;
	worker: ReturnType<typeof setupWorker> | undefined;

	/**
	 * Instantiate Mocking Jukebox, including setting up internal state.
	 *
	 * @param options - Input arguments (see below); both are optional, and merged with identically named objects that could be passed in as options to `play` or `record`; they can be defined here to set them globally, without needed to be repeated on each call to `play` or `record`
	 */
	constructor({
		routeHandlerContext = {}, // A persistent object that allows passing references to objects (such as a Redux store) that might be undefined at startup when this function is run, but will be defined by the time the route handlers eventually run
		startMockServiceWorkerOptions = {}, // Options to pass into Mock Service Worker’s `worker.start` call; see https://mswjs.io/docs/api/setup-worker/start
	}: {
		routeHandlerContext?: RouteHandlerContext;
		startMockServiceWorkerOptions?: StartMockServiceWorkerOptions;
	} = {}) {
		this.routeHandlerContext = routeHandlerContext;
		this.startMockServiceWorkerOptions = startMockServiceWorkerOptions;
	}


	/**
	 * Enable playback mode, where network requests for specified routes are intercepted and mock recordings returned.
	 *
	 * @param options Input arguments to pass to `setMode`
	 */
	play(options: EnableMockingOptions): void {
		this.setMode(MockingMode.Playback, options);
	}


	/**
	 * Enable recording mode, where network requests for specified routes are intercepted and recordings saved for future playback, and returned.
	 *
	 * @param options Input arguments to pass to `setMode`
	 */
	record(options: EnableMockingOptions): void {
		this.setMode(MockingMode.Recording, options);
	}


	/**
	 * Disable mocking.
	 */
	stop(): void {
		this.setMode(MockingMode.Disabled);
	}


	/**
	 * Abstract common code between `play`, `record` and `stop`.
	 *
	 * @param newMode Which mode to set
	 * @param options Input arguments for enabling playback or recording modes (see below)
	 */
	private setMode(newMode: MockingMode, options?: EnableMockingOptions) {
		if (newMode === MockingMode.Disabled) {
			this.#state = defaultState;
			if (this.worker) {
				this.worker.resetHandlers();
				this.worker.stop();
			}
		} else {
			if (!options || !options.album || !options.routes) {
				const method = (newMode === MockingMode.Playback) ? 'play' : 'record';
				throw new Error(`Missing input: ${method} requires an album and routes`);
			}

			const {
				album, // A name that groups together a set of recordings
				routes, // Definitions of network requests to intercept, including how to determine whether the request should be intercepted as well as hooks to transform the request or response
				routeHandlerContext = {}, // A persistent object that allows passing references to objects (such as a Redux store) that might be undefined at startup when this function is run, but will be defined by the time the route handlers eventually run; merged with an identically named object that could be passed into the MockingJukebox constructor
				startMockServiceWorkerOptions = {}, // Options to pass into Mock Service Worker’s `worker.start` call; see https://mswjs.io/docs/api/setup-worker/start; merged with an identically named object that could be passed into the MockingJukebox constructor
			} = options;
			const oldMode = this.#state.mode;

			this.#state = {
				album,
				mode: newMode,
			};

			if (!this.worker) {
				// Initialize Mock Service Worker
				// Rather than define “permanent” route handlers here, define them via `worker.use` when we enable mocking, so that route handlers can vary between calls to `play`/`record`/`stop`
				// We don’t do this initialization in the constructor because we want to avoid registering the service worker unless it will be used
				this.worker = setupWorker();
			}

			// Handle going from `play` to `record` or vice versa
			if (oldMode !== MockingMode.Disabled) {
				this.worker.stop();
				this.worker.resetHandlers();
			}

			// Tell Mock Service Worker to register its service worker with the browser
			this.worker.start({
				// Merge “global” options with options specific to this `play` or `record` call
				...this.startMockServiceWorkerOptions,
				...startMockServiceWorkerOptions,
			});

			// Define routes to use during this playback or recording session, which tells MSW to start intercepting
			this.worker.use(...getHandlers({
				mockingState: this.#state,
				routeHandlerContext: {
					// Merge “global” options with options specific to this `play` or `record` call
					...this.routeHandlerContext,
					...routeHandlerContext,
				},
				routes,
			}));
		}
	}
}
