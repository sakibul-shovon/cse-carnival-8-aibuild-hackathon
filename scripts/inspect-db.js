const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { SYSTEMS, createStore } = require("../lib/store");

const dbPath = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(__dirname, "..", "campus.db");
const store = createStore({ dbPath });

console.log(`CampusOS SQLite database: ${dbPath}`);
for (const system of SYSTEMS) {
  const records = store.list(system);
  console.log(`\n${system.toUpperCase()} (${records.length})`);
  console.table(records.map((record) => {
    const printable = { ...record };
    for (const [key, value] of Object.entries(printable)) if (Array.isArray(value)) printable[key] = JSON.stringify(value);
    return printable;
  }));
}
store.db.close();
