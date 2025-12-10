describe('Application Routing', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should not navigate on init', () => {
    cy.url().should('include', '/');
  });
});
