const express = require('express');
const pool = require('../db');

// (async () => {
//   let retries = 5;
//   while (retries) {
//     try {
//       pool.connect();
//     } catch (err) {
//       console.log(err);
//       retries--;
//       console.log('retries left:', retries);
//       await new Promise((resolve) => {
//         setTimeout(resolve, 5000);
//       });
//     }
//   }
// })();

const app = express();
const bodyParser = require('body-parser');
const path = require('path');

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>ATELIER API</h1>');
});

app.get('/products/list', (req, res) => {
  const page = req.query.page || 1;
  const count = req.query.count || 5;
  pool.connect().then((client) => {
    client
      .query('SELECT * FROM products WHERE id >= $1 AND id <= $2', [
        (page - 1) * count + 1,
        count * page,
      ])
      .then(({ rows }) => {
        console.log('result from get(/products/list):', rows);
        client.release();
        res.send(rows);
      });
  });
});

app.get('/products/:productId', (req, res) => {
  pool.connect().then((client) => {
    client
      .query('SELECT * from products where id = $1', [req.params.productId])
      .then(({ rows }) => {
        pool.connect().then((client2) => {
          client2
            .query(
              'SELECT feature, value from features WHERE product_id = $1',
              [req.params.productId]
            )
            .then((result) => {
              let productInfo = rows[0];
              productInfo.features = result.rows;
              res.send(productInfo);
            });
        });
      });
  });
});

app.get('/products/:productId/styles', (req, res) => {
  pool.connect().then((client) => {
    return client
      .query('SELECT * FROM styles WHERE product_id = $1', [
        req.params.productId,
      ])
      .then(({ rows }) => {
        console.log('stylesResults', rows);
      });
  });
});

app.get('/products/:productId/related', (req, res) => {});

app.listen(PORT, () => {
  console.log(`listening on PORT: ${PORT}`);
});
