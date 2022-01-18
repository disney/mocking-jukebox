// Confirm that the server is running and the site is up
describe('The site', () => {
	it('successfully loads', () => {
		cy.visit('/');
	});

	it('contains a message', () => {
		cy.visit('/');
		cy.get('body').should('contain.text', 'The current time is');
	});

	// Confirm that the frontend is receiving data from the backend
	it('contains a timestamp (any timestamp)', () => {
		cy.visit('/');
		cy.get('#timestamp').should($el => {
			const timestampStr = $el.text();
			expect(timestampStr).to.have.length(24); // ISO date string length
			expect(new Date(timestampStr).getTime()).to.not.be.NaN;
		});
	});
});
