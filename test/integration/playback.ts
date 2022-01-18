describe('Playback mode', () => {
	it('works', () => {
		cy.visit('/');
		cy.window().then(window => {
			return window.initializeMocking('play', {
				album: 'clock',
				routes: window.routes, // See test/fixtures/client.js
			});
		});
		cy.get('#refresh').click();
		cy.get('#timestamp').click()
			.should('contain', '2020-12-15T17:00:00.000Z');
	});
});
