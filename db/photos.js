const path = require('path');
const fs = require('fs');
const readline = require('readline');

const readStream = fs.createReadStream(
  path.join(__dirname, './csv/photos.csv')
);
const rl = readline.createInterface({
  input: readStream,
});

const writeStream = fs.createWriteStream(
  path.join(__dirname, './csv/photos2.csv')
);

rl.on('line', (line) => {
  let row = line.split(',');

  let thumbnail = row[3];
  if (thumbnail[thumbnail.length - 1] !== '"') {
    row[3] += '"';
  }
  writeStream.write(row.join(',') + '\n');
});
