const express = require('express');
const pool = require('./db');

(async () => {
  let retries = 5;
  while (retries) {
    try {
      console.log('attempting to connect');
      await pool.connect();
      console.log('connected');
      break;
    } catch (err) {
      console.log('failed to connect');
      retries--;
      console.log('retries left:', retries);
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }
})();

const app = express();

const path = require('path');

const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/', (req, res) => {
  res.send('<h1>ATELIER API</h1>');
});

app.get('/products/list', (req, res) => {
  console.log('/products/list');
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
        console.log('response:', rows);
        res.send(rows);
      })
      .catch((err) => {
        res.sendStatus(404);
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
              client2.release();
              let productInfo = rows[0];
              productInfo.features = result.rows;
              console.log('response:', productInfo);
              res.send(productInfo);
            })
            .catch((err) => {
              res.sendStatus(404);
            });
        });
      });
  });
});

app.get('/products/:productId/styles', (req, res) => {
  const response = {};
  response['product_id'] = req.params.productId;
  pool.connect().then((client) => {
    return client
      .query('SELECT * FROM styles WHERE product_id = $1', [
        req.params.productId,
      ])
      .then(({ rows }) => {
        client.release();
        console.log('stylesResults', rows);
        let skuPromises = [];
        let photoPromises = [];
        let styles = [];
        for (let row of rows) {
          styles.push({
            style_id: row.style_id,
            name: row.name,
            original_price: row.original_price,
            sale_price: row.sale_price,
            'default?': row['default?'],
            photos: [],
            skus: {},
          });
          let styleId = row.style_id;
          skuPromises.push(
            pool.connect().then((client) => {
              return client
                .query('SELECT size, quantity FROM skus WHERE style_id = $1', [
                  styleId,
                ])
                .then((results) => {
                  console.log('results.rows', results.rows);
                  client.release();
                  return results.rows;
                })
                .catch((err) => {
                  client.release();
                  console.log(err);
                  res.sendStatus(404);
                });
            })
          );
          photoPromises.push(
            pool.connect().then((client) => {
              return client
                .query(
                  'SELECT url, thumbnail_url from photos where style_id = $1',
                  [styleId]
                )
                .then((results) => {
                  client.release();
                  return results.rows;
                })
                .catch((err) => {
                  console.log(err);
                  client.release();
                  res.sendStatus(404);
                });
            })
          );
        }
        Promise.all(skuPromises)
          .then((skusArray) => {
            for (let i = 0; i < skusArray.length; i++) {
              for (let j = 0; j < skusArray[i].length; j++) {
                let skuRow = skusArray[i][j];
                styles[i]['skus'][skuRow.size] = Number(skuRow.quantity);
              }
            }
          })
          .then(() => {
            Promise.all(photoPromises).then((photosArray) => {
              for (let i = 0; i < photosArray.length; i++) {
                for (let j = 0; j < photosArray[i].length; j++) {
                  let photoRow = photosArray[i][j];
                  styles[i].photos.push({
                    thumbnail_url: photoRow.thumbnail_url,
                    url: photoRow.url,
                  });
                }
              }
              response.results = styles;
              res.send(response);
              console.log('response:', response);
            });
          });
      });
  });
});

app.get('/products/:productId/related', (req, res) => {
  console.log(`/products/${productId}/related`);
  pool.connect().then((client) => {
    client
      .query('SELECT * from related WHERE current_product_id = $1', [
        req.params.productId,
      ])
      .then(({ rows }) => {
        let response = [];
        for (const row of rows) {
          response.push(row.related_product_id);
        }
        console.log('response:', response);
        res.send(response);
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(404);
      });
  });
});

app.listen(PORT, () => {
  console.log(`listening on PORT: ${PORT}`);
});

module.exports = app;
