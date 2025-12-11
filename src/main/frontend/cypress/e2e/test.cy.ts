describe('Application Routing', () => {
  beforeEach(() => {
    cy.visit('/studio');
  });

  it('should went to studio', () => {
    cy.url().should('include', '/studio');
  });
});
