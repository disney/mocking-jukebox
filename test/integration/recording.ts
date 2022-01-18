describe('Recording mode', () => {
	const temporaryAlbum = `cypress${Date.now()}`;
	const recordingPath = `mock-recordings/recordings/${temporaryAlbum}/localhost/timestamp/get/99914b932bd37a50b983c5e7c90ae93b.yaml`;

	it('works', () => {
		cy.visit('/');
		cy.window().then(window => {
			return window.initializeMocking('record', {
				album: temporaryAlbum,
				routes: window.routes,
			});
		});
		cy.get('#refresh').click();
		cy.readFile(recordingPath, 'utf-8').then(str => {
			const recordedTimestamp = Number(/\nresponse:\n {2}body: '(.*)'\n/.exec(str)[1]);
			// Check that the timestamp in the recording was made within the last minute
			expect(recordedTimestamp).to.be.above(Date.now() - 60000);
		});
	});

	after(() => {
		cy.task('cleanupRecordings');
	});
});
