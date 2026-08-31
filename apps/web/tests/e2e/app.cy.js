describe('EduBoard Gesture Recognition', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('loads the splash screen', () => {
    cy.contains('EduBoard').should('exist');
  });

  it('navigates to dashboard', () => {
    cy.visit('http://localhost:3000/dashboard');
    cy.contains('Dashboard').should('exist');
  });

  it('opens collaboration page', () => {
    cy.visit('http://localhost:3000/collaboration');
    cy.contains('Collaboration').should('exist');
  });

  it('opens analytics page', () => {
    cy.visit('http://localhost:3000/analytics');
    cy.contains('Analytics').should('exist');
  });

  it('opens export center', () => {
    cy.visit('http://localhost:3000/export');
    cy.contains('Export Center').should('exist');
  });

  it('opens settings page', () => {
    cy.visit('http://localhost:3000/settings');
    cy.contains('Settings').should('exist');
  });

});
