const pdf = require('pdf-parse');
console.log('Type of export:', typeof pdf);
console.log('Is export a class?', pdf.toString().startsWith('class'));
console.log('Export keys:', Object.keys(pdf));
if (typeof pdf === 'function') {
    console.log('Prototype:', pdf.prototype);
}
