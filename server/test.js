const fs = require('fs');
const readline = require('readline');
const path = require('path');
const request = require('supertest');
const app = require('./app');

describe('Route Handler', () => {
  it('should get text when getting /', () => {
    return request('http://127.0.0.1:80')
      .get('/')
      .expect(200)
      .then(({ text }) => {
        expect(text).toMatch(/^.*atelier.*$/i);
      });
  });
});

describe('Database API', () => {
  it('should get an array of object when getting /products/list', () => {
    return request('http://127.0.0.1:80')
      .get('/products/list?page=2&count=10')
      .expect(200)
      .then((result) => {
        expect(Array.isArray(result.body)).toBeTruthy();
        expect(result.body).toHaveLength(10);
      });
  });
  it('should get an array of object with the correct properties when getting /products/list', () => {
    return request('http://127.0.0.1:80')
      .get('/products/list?page=2&count=10')
      .expect(200)
      .then(({ body }) => {
        for (let product of body) {
          expect(product).toHaveProperty('id');
          expect(product).toHaveProperty('name');
          expect(product).toHaveProperty('slogan');
          expect(product).toHaveProperty('description');
          expect(product).toHaveProperty('category');
          expect(product).toHaveProperty('default_price');
        }
      });
  });
  it('should get back an array of object with nonempty values when getting /products/list', () => {
    return request('http://127.0.0.1:80')
      .get('/products/list?page=2&count=10')
      .expect(200)
      .then(({ body }) => {
        for (let product of body) {
          expect(product.id).toBeTruthy();
          expect(product.name).toBeTruthy();
          expect(product.slogan).toBeTruthy();
          expect(product.description).toBeTruthy();
          expect(product.category).toBeTruthy();
          expect(product.default_price).toBeTruthy();
        }
      });
  });
  it('should get an array of object with nonempty values with correct types when getting /products/list', () => {
    return request('http://127.0.0.1:80')
      .get('/products/list?page=2&count=10')
      .expect(200)
      .then(({ body }) => {
        for (let product of body) {
          expect(typeof product.id).toBe('number');
          expect(typeof product.name).toBe('string');
          expect(typeof product.slogan).toBe('string');
          expect(typeof product.description).toBe('string');
          expect(typeof product.category).toBe('string');
          expect(typeof product.default_price).toBe('string');
        }
      });
  });
  it('should get an object with correct properties when getting /products/:productId', () => {
    return request('http://127.0.0.1:80')
      .get('/products/2')
      .expect(200)
      .then(({ body }) => {
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('name');
        expect(body).toHaveProperty('slogan');
        expect(body).toHaveProperty('description');
        expect(body).toHaveProperty('category');
        expect(body).toHaveProperty('default_price');
        expect(body).toHaveProperty('features');
      });
  });
  it('should get an object with nonempty values when getting /products/:productId', () => {
    return request('http://127.0.0.1:80')
      .get('/products/2')
      .expect(200)
      .then(({ body }) => {
        expect(body.id).toBeTruthy();
        expect(body.name).toBeTruthy();
        expect(body.slogan).toBeTruthy();
        expect(body.description).toBeTruthy();
        expect(body.category).toBeTruthy();
        expect(body.default_price).toBeTruthy();
        expect(body.features).toBeTruthy();
      });
  });
});
