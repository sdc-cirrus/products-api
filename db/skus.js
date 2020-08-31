const path = require('path');
const fs = require('fs');
const readline = require('readline');

const readStream = fs.createReadStream(path.join(__dirname, './csv/skus.csv'));
const rl = readline.createInterface({
  input: readStream,
});

const writeStream = fs.createWriteStream(
  path.join(__dirname, './csv/skus2.csv')
);

rl.on('line', (line) => {
  let row = line.split(',');
  writeStream.write(row.join(',') + '\n');
});
