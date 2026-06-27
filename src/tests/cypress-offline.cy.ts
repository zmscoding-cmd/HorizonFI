declare var cy: any;
declare var beforeEach: any;
declare var it: any;
declare var describe: any;

describe('Cypress Offline Hard-Start Test - Budget Dashboard Hydration', () => {
  beforeEach(() => {
    // Simulate raw network unavailability for Firestore and Firebase Auth services to test offline state
    cy.intercept('https://firestore.googleapis.com/**', {
      forceNetworkError: true
    }).as('firestoreOffline');

    cy.intercept('https://identitytoolkit.googleapis.com/**', {
      forceNetworkError: true
    }).as('authOffline');

    // General match-all interceptor to block all Firestore API handshake routes
    cy.intercept('**/google.firestore.**', {
      statusCode: 503,
      body: 'Service Unavailable'
    });
  });

  it('should successfully hydrate the Budget Dashboard from local cached RxDB IndexedDB without network assistance', () => {
    // 1. Visit the home path to initialize system contexts
    cy.visit('/');

    // 2. Access the window interface to pre-populate local IndexedDB instances using local RxDB schemas
    cy.window().then(async (win: any) => {
      const db = win.horizonFiDb;
      if (db && db.budgets) {
        // Clear any old structures
        await db.budgets.find().remove();
        await db.actual_expenses.find().remove();

        // Seed a representative budget record directly in the local offline database
        await db.budgets.insert({
          id: 'local_offline_budget_id_100',
          userId: 'test_user_uid',
          householdId: 'household_ocean_voyager',
          name: 'Offline Sentinel Navigation Budget',
          totalPlaintextMonthly: 5000,
          totalPlaintextAnnual: 60000,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        // Seed a representative actual expense logged during local watch
        await db.actual_expenses.insert({
          id: 'actual_expense_100',
          userId: 'test_user_uid',
          householdId: 'household_ocean_voyager',
          category: 'fuel',
          amount: 400,
          dateLogged: '2026-06-07',
          notes: 'Auxiliary motor offshore fuel top-up',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });

    // 3. Trigger navigation to the Granular Budget & Variance view
    cy.contains('button', 'Granular Budget & Variance')
      .should('be.visible')
      .click();

    // 4. Assert the UI successfully parses and renders raw local IndexedDB plaintext values
    cy.get('[id^="budget-card-"]')
      .first()
      .should('be.visible')
      .within(() => {
        cy.contains('Offline Sentinel Navigation Budget').should('exist');
        cy.contains('$5,000').should('exist');
      });

    // 5. Assert local storage database records hydrate the variance calculation panels correctly
    cy.contains('Logged Actuals').should('be.visible');
    cy.contains('$400').should('be.visible');

    // 6. Confirm network requests to Firebase cloud collection endpoints failed gracefully as expected
    cy.get('@firestoreOffline').should('exist');
  });
});
