const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const { SYSTEMS, createStore } = require("../lib/store");

const dbPath = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(__dirname, "..", "campus.db");
const store = createStore({ dbPath });
const inserted = store.initialSeedInserted;

console.log(`${inserted ? "Loaded initial seed data into" : "Database already initialized; preserved all records and deletions in"} ${dbPath}:`);
for (const system of SYSTEMS) console.log(`- ${system}: ${store.list(system).length}`);
store.db.close();
