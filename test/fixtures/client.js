// This function need not be included in application code; it’s only here to make tests more streamlined. Application code could either include an optional dynamic import(), to conditionally provide mocking for development, or the test runner can inject custom JavaScript to load mocking support before application code loads.
window.initializeMocking = async function initializeMocking(method = 'play', mockingOptions = {}) {

	// Define default values
	mockingOptions.album ??= 'clock';
	mockingOptions.routes ??= window.routes;

	const { MockingJukebox } = await import('/mocking-jukebox.js');
	window.mockingJukebox = new MockingJukebox();

	window.mockingJukebox[method](mockingOptions);
}

// Attach to window for tests to use as a starting point for defining custom routes
window.routes = [
	{
		method: 'GET',
		url: '/timestamp'
	},
];


// Application logic
window.updateTimestamp = async function updateTimestamp() {
	const serverResponse = await fetch('/timestamp');
	const serverTimestamp = await serverResponse.text();
	const element = document.getElementById('timestamp');
	element.dataset.timestamp = serverTimestamp;
	element.innerText = new Date(Number(serverTimestamp)).toISOString();
};


(async () => {
	// Load the site via http://localhost:4000/#mocking to start with mocking playback mode enabled at startup
	if (window.location.hash === '#mocking') {
		await window.initializeMocking();
	}
	await window.updateTimestamp();
	document.getElementById('refresh').addEventListener('click', window.updateTimestamp);
})();
