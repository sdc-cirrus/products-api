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

let lc = 0;
rl.on('line', (line) => {
  let row = line.split(',');
  let thumbnail = row[3];
  let newRow = [];
  for (let i = 0; i < row.length; i++) {
    let cat = row[i].trim().replace(/"/g, '');
    if (i === 3) {
      if (cat[0] === 'u') {
        cat = cat.slice(1);
      }
    }
    newRow.push(cat);
  }
  lc++;
  writeStream.write(newRow.join(',') + '\n');
});
