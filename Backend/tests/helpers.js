import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';

let mongod;

export const connectTestDb = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

export const disconnectTestDb = async () => {
  await mongoose.disconnect();
  await mongod.stop();
};

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

let counter = 0;

// Registers a user through the real endpoint, logs in, and returns what tests need
export const createUser = async (name = 'user') => {
  counter += 1;
  const userName = `${name}${counter}`;
  const creds = {
    fullName: `${name} ${counter}`,
    userName,
    email: `${userName}@test.com`,
    password: 'Passw0rd!',
  };

  await request(app).post('/api/v1/users/register').field(creds);
  const login = await request(app)
    .post('/api/v1/users/login')
    .send({ email: creds.email, password: creds.password });

  return {
    ...creds,
    token: login.body.data.accessToken,
    refreshToken: login.body.data.refreshToken,
    user: login.body.data.user,
  };
};