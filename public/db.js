let db;
let budgetVersion;

// Create a new db request for a "budget" database.
const request = indexedDB.open('BudgetDB', budgetVersion || 21);

request.onupgradeneeded = function (event) {
  console.log('Upgrade needed in IndexDB');

  const { oldVersion } = event;
  const newVersion = event.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  db = event.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('BudgetStore', { autoIncrement: true });
  }
};

request.onerror = function (event) {
  console.log(`Woops! ${event.target.errorCode}`);
};

function checkDatabase() {
  console.log('Check db invoked!');

  // Open a transaction on your BudgetStore db
  let transaction = db.transaction(['BudgetStore'], 'readwrite');

  // access your BudgetStore object
  const store = transaction.objectStore('BudgetStore');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
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
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with the ability to read and write
            transaction = db.transaction(['BudgetStore'], 'readwrite');

            // Assign the current store to a variable
            const currentStore = transaction.objectStore('BudgetStore');

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log('Clearing Store 🧹');
          }
        });
    }
  };
}

request.onsuccess = function (event) {
  console.log('Success!');
  db = event.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend Online! 🗄️');
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log('Save Record Invoked!');
  // Create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(['BudgetStore'], 'readwrite');

  // Access your BudgetStore object store
  const store = transaction.objectStore('BudgetStore');

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);