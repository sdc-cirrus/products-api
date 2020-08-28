const pool = require('./');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

pool
  .connect()
  .then((client) => {
    client
      .query('DROP TABLE IF EXISTS products')
      .then(() => {
        client.release();
      })
      .catch((err) => {
        console.log('error dropping table products');
        process.exit(1);
      });
  })
  .then(() => {
    pool
      .connect()
      .then((client) => {
        return client
          .query(
            "CREATE TABLE products (id INTEGER PRIMARY KEY NOT NULL, name TEXT DEFAULT '', slogan TEXT DEFAULT '', description TEXT DEFAULT '', category TEXT DEFAULT '', default_price TEXT DEFAULT '0')"
          )
          .then((res) => {
            console.log('pool.idleCount', pool.idleCount);
            console.log('pool.waitingCount', pool.waitingCount);
            client.release();
          });
      })
      .then(() => {
        fsPromises
          .readFile(path.join(__dirname, './csv/product.csv'))
          .catch((err) => {
            console.log('error reading product.csv:', err);
            process.exit(1);
          })
          .then((data) => {
            let table = data.toString().split('\n');
            const numRows = table.length;
            const rows = table.slice(1);
            rows.forEach((row) => {
              // console.log(row);
              let cI = row.indexOf(',');
              const id = Number(row.slice(0, cI));
              let firstQI = row.indexOf('"');
              let secondQI = row.indexOf('"', firstQI + 1);
              const name = row.slice(firstQI + 1, secondQI);
              firstQI = row.indexOf('"', secondQI + 1);
              secondQI = row.indexOf('"', firstQI + 1);
              const slogan = row.slice(firstQI + 1, secondQI);
              firstQI = row.indexOf('"', secondQI + 1);
              secondQI = row.indexOf('"', firstQI + 1);
              const description = row.slice(firstQI + 1, secondQI);
              firstQI = row.indexOf('"', secondQI + 1);
              secondQI = row.indexOf('"', firstQI + 1);
              const category = row.slice(firstQI + 1, secondQI);
              const defaultPrice = row.slice(row.search(/\d+$/));
              pool.connect().then((client) => {
                console.log('pool.waitingCount', pool.waitingCount);
                client
                  .query(
                    'INSERT INTO products (id, name, slogan, description, category, default_price) values ($1, $2, $3, $4, $5, $6)',
                    [id, name, slogan, description, category, defaultPrice]
                  )
                  .then((data) => {
                    client.release();
                  })
                  .catch((err) => {
                    console.log(err);
                    client.release();
                    process.exit(1);
                  });
              });
            });
          });
      });
  });
