const express = require('express');
const pool = require('./db');
const redis = require('redis');
const redisClient = redis.createClient(6379, 'redis');

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

app.use(express.static(__dirname));

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

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
        client.release();
        res.send(rows);
      })
      .catch((err) => {
        client.release();
        res.sendStatus(404);
      });
  });
});

app.get('/products/:productId', (req, res) => {
  redisClient.get('product' + req.params.productId, (err, redisRes) => {
    console.log('redis res for /products/:productId:', redisRes);
    if (!redisRes) {
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
                  console.log('productInfo:', productInfo);
                  redisClient.set(
                    'product' + req.params.productId,
                    JSON.stringify(productInfo)
                  );
                  res.send(productInfo);
                })
                .catch((err) => {
                  client2.release();
                  res.sendStatus(404);
                });
            });
          })
          .catch((err) => {
            client.release();
            res.sendStatus(404);
          });
      });
    } else {
      console.log('redisRes:', redisRes);
      res.send(JSON.parse(redisRes));
    }
  });
});

app.get('/products/:productId/styles', (req, res) => {
  console.log('/products/:productId/styles');
  const productId = req.params.productId;
  let response = {};
  response.productId = productId;
  redisClient.get('styles' + productId, (err, redisRes) => {
    if (!redisRes) {
      console.log('not cached in redis');
      pool.connect().then((client1) => {
        const stylesPromises = [];
        client1
          .query(
            'SELECT style_id, name, sale_price, original_price, "default?" FROM styles where product_id = $1',
            [productId]
          )
          .then(({ rows }) => {
            client1.release();
            response.styles = rows;
            response.styles.forEach((style) => {
              const style_id = style.style_id;
              let stylePromises = [];
              stylePromises.push(
                pool
                  .connect()
                  .then((client2) => {
                    return client2
                      .query(
                        'SELECT url, thumbnail_url FROM photos WHERE style_id = $1',
                        [style_id]
                      )
                      .then(({ rows }) => {
                        client2.release();
                        return rows;
                      })
                      .catch((err) => {
                        client2.release();
                        res.sendStatus(500);
                      });
                  })
                  .then((result) => {
                    return result;
                  })
                  .catch((err) => {
                    res.sendStatus(500);
                  })
              );
              stylePromises.push(
                pool
                  .connect()
                  .then((client2) => {
                    return client2
                      .query(
                        'SELECT size, quantity FROM skus WHERE style_id = $1',
                        [style_id]
                      )
                      .then(({ rows }) => {
                        client2.release();
                        return rows;
                      })
                      .catch((err) => {
                        client2.release();
                        res.sendStatus(500);
                      });
                  })
                  .then((result) => {
                    return result;
                  })
                  .catch((err) => {
                    res.sendStatus(500);
                  })
              );
              stylesPromises.push(
                Promise.all(stylePromises).then((results) => {
                  style.photos = results[0];
                  style.skus = results[1];
                  console.log('response.styles:', response.styles);
                })
              );
            });
          })
          .then(() => {
            Promise.all(stylesPromises).then(() => {
              console.log(response);
              redisClient.set('styles' + productId, JSON.stringify(response));
              res.send(response);
            });
          })
          .catch((err) => {
            client1.release();
            res.sendStatus(404);
          });
      });
    } else {
      console.log('cached in redis');
      res.send(JSON.parse(redisRes));
    }
  });
});

app.get('/products/:productId/related', (req, res) => {
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
