let db;
let budgetVersion;

// Create a new db request for a "budget" database.
const request = window.indexedDB.open('BudgetDB', budgetVersion || 21);

request.onupgradeneeded = function (event) {
    console.log('Upgrade needed in IndexDb');

    const {oldVersion} = event;
    const newVersion = event.newVersion || db.version 

    console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

    db = event.target.result;

    if (db.obejectStoreNames.length === 0) {
        db.createObjectStore('BudgetPending', {autoIncrement: true});
    }
};

request.onerror = function (event) {
    console.log(`Woops! ${event.target.errorCode}`);
};

function checkDatabase() {
    console.log('Check db Invoked!');

     // Open a transaction on your BudgetPending db
    let transaction = db.transaction(['BudgetPending'], 'readwrite');

     // access your BudgetPending object
     const store = transaction.obejectStore('BudgetPending');

    // Get all records from store and set to a variable
     const getAll = store.getAll();

    // If the request was successful
    getAll.onsuccess = function() {
        // If there are items in the store, we need to bulk add them when we are back online     
        if (getAll.result.length > 0) {
            fetch('/api/transaction/bulk', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(res => {
                // If our returned response is not empty
                if (res.length !== 0) {
                    // Open another transaction to BudgetPending with the ability to read and write
                    transaction = db.transaction(['BudgetPending'], 'readwrite');

                    // Assign the current store to a variable
                    const currentStore = transaction.obejectStore('BudgetPending');

                    // Clear existing entries because our bulk add was successful
                    currentStore.clear();
                    console.log('Clearing Store')
                }
            });
        }
    };
}

request.onsuccess = function(event) {
    console.log('Success!');
    db = event.target.result;

    // Check if app is online before reading from db
    if (navigator.online) {
        console.log('Backend Online!');
        checkDatabase();
    }
};

const saveRecord = record => {
    console.log('Save Record Invoked!');

    // Create a transaction on the BudgetPending db with readwrite access
    const transaction = db.transaction(['BudgetPending'], 'readwrite');

    // Access your BudgetPending object store
    const store = transaction.obejectStore('BudgetPending');

    // Add record to your store with add method.
    store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);

