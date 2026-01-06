import * as sqlite from '@sqlite.org/sqlite-wasm';
console.log('All exports:', Object.keys(sqlite));
try {
    console.log('sqlite.default type:', typeof sqlite.default);
} catch (e) {
    console.log('No default export');
}

try {
    const { sqlite3Worker1Promiser } = sqlite;
    console.log('sqlite3Worker1Promiser type:', typeof sqlite3Worker1Promiser);
} catch (e) {
    console.log('Error accessing named export');
}
