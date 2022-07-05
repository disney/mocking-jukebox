// Setup adapted from https://github.com/Netflix/pollyjs/blob/master/examples/rest-persister/tests/setup.js
const PollyJS = window['@pollyjs/core'];
const { Polly } = PollyJS;

Polly.register(window['@pollyjs/adapter-fetch']);
Polly.register(window['@pollyjs/persister-rest']);


window.polly = new Polly('Simple Example', {
	logLevel: 'debug',
	adapters: ['fetch'],
	persister: 'rest',
	matchRequestsBy: {
		order: false,
	},
});


// Application logic
window.updateTimestamp = async function updateTimestamp() {
	const serverResponse = await fetch('/timestamp');
	const serverTimestamp = await serverResponse.text();
	const element = document.getElementById('timestamp');
	element.dataset.timestamp = serverTimestamp;
	element.innerText = new Date(Number(serverTimestamp)).toISOString();
};


await window.updateTimestamp();
document.getElementById('refresh').addEventListener('click', window.updateTimestamp);


window.savePollyRecording = () => window.polly.stop();
