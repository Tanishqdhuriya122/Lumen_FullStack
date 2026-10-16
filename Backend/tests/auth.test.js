import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectTestDb, disconnectTestDb, auth } from './helpers.js';

describe('Auth', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  const payload = {
    fullName: 'Test User',
    userName: 'testuser',
    email: 'test@example.com',
    password: 'Passw0rd!',
  };

  it('registers a user without an avatar and never returns the password', async () => {
    const res = await request(app).post('/api/v1/users/register').field(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(payload.email);
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.avatar).toBeTruthy(); // falls back to the default avatar
  });

  it('rejects a duplicate user', async () => {
    const res = await request(app).post('/api/v1/users/register').field(payload);
    expect(res.status).toBe(409);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .field({ ...payload, userName: 'other', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects empty required fields', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .field({ ...payload, userName: 'empty', email: 'empty@example.com', fullName: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: payload.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown user', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'ghost@example.com', password: 'whatever' });
    expect(res.status).toBe(404);
  });

  it('logs in and returns both tokens', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: payload.email, password: payload.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('blocks protected routes without a token', async () => {
    const res = await request(app).get('/api/v1/users/current-user');
    expect(res.status).toBe(401);
  });

  it('allows protected routes with a token', async () => {
    const login = await request(app)
      .post('/api/v1/users/login')
      .send({ email: payload.email, password: payload.password });
    const res = await request(app)
      .get('/api/v1/users/current-user')
      .set(auth(login.body.data.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(payload.email);
  });

  it('issues a new access token from a refresh token', async () => {
    const login = await request(app)
      .post('/api/v1/users/login')
      .send({ email: payload.email, password: payload.password });
    const res = await request(app)
      .post('/api/v1/users/refresh-token')
      .send({ refreshToken: login.body.data.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });
});