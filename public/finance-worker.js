/*
  2022-05-23

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This is a JS Worker file for the main sqlite3 api. It loads
  sqlite3.js, initializes the module, and postMessage()'s a message
  after the module is initialized:

  {type: 'sqlite3-api', result: 'worker1-ready'}

  This seemingly superfluous level of indirection is necessary when
  loading sqlite3.js via a Worker. Instantiating a worker with new
  Worker("sqlite.js") will not (cannot) call sqlite3InitModule() to
  initialize the module due to a timing/order-of-operations conflict
  (and that symbol is not exported in a way that a Worker loading it
  that way can see it).  Thus JS code wanting to load the sqlite3
  Worker-specific API needs to pass _this_ file (or equivalent) to the
  Worker constructor and then listen for an event in the form shown
  above in order to know when the module has completed initialization.

  This file accepts a URL arguments to adjust how it loads sqlite3.js:

  - `sqlite3.dir`, if set, treats the given directory name as the
    directory from which `sqlite3.js` will be loaded.
*/
'use strict';
{
  const urlParams = globalThis.location
    ? new URL(globalThis.location.href).searchParams
    : new URLSearchParams();
  let theJs = 'sqlite3.js';
  if (urlParams.has('sqlite3.dir')) {
    theJs = urlParams.get('sqlite3.dir') + '/' + theJs;
  }

  importScripts(theJs);
}
const config = {
  print: console.log,
  printErr: console.error,
  locateFile: (file) => '/' + file
};

// Queue messages that arrive before the library is ready
const messageQueue = [];
self.onmessage = function (e) {
  console.log('Worker: Queuing early message:', e.data);
  messageQueue.push(e);
};

console.log('Worker: Calling sqlite3InitModule...');
sqlite3InitModule(config).then((sqlite3) => {
  console.log('Worker: Module Loaded. Calling initWorker1API...');
  try {
    sqlite3.initWorker1API();
    console.log('Worker: initWorker1API returned.');

    // The library has now set its own onmessage handler.
    // We capture it, wrap it, and replay our queue.
    const libraryOnMessage = self.onmessage;

    // Define our proxy
    self.onmessage = function (e) {
      console.log('Worker: Received message:', e.data);
      if (libraryOnMessage) libraryOnMessage.call(this, e);
    };

    // Replay queued messages
    if (messageQueue.length > 0) {
      console.log(`Worker: Replaying ${messageQueue.length} queued messages...`);
      messageQueue.forEach(e => {
        // Determine if we should call the library handler or our proxy
        // Calling library handler directly avoids double-logging since we logged usage "Queuing"
        if (libraryOnMessage) libraryOnMessage.call(self, e);
      });
      messageQueue.length = 0;
    }

  } catch (e) {
    console.error('Worker: initWorker1API threw error:', e);
  }
});
