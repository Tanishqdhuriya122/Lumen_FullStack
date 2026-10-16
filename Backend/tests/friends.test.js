import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectTestDb, disconnectTestDb, createUser, auth } from './helpers.js';

describe('Friends flow', () => {
  let alice, bob, requestId;

  beforeAll(async () => {
    await connectTestDb();
    alice = await createUser('alice');
    bob = await createUser('bob');
  });
  afterAll(disconnectTestDb);

  it('stops you friending yourself', async () => {
    const res = await request(app)
      .post(`/api/v1/friends/request/${alice.user._id}`)
      .set(auth(alice.token));
    expect(res.status).toBe(400);
  });

  it('sends a friend request', async () => {
    const res = await request(app)
      .post(`/api/v1/friends/request/${bob.user._id}`)
      .set(auth(alice.token));
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  it('notifies the recipient', async () => {
    const res = await request(app).get('/api/v1/notifications').set(auth(bob.token));
    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(1);
    expect(res.body.data.notifications[0].type).toBe('friend_request');
  });

  it('shows the request to the recipient only', async () => {
    const res = await request(app).get('/api/v1/friends/requests/pending').set(auth(bob.token));
    expect(res.body.data).toHaveLength(1);
    requestId = res.body.data[0]._id;

    const aliceView = await request(app).get('/api/v1/friends/requests/pending').set(auth(alice.token));
    expect(aliceView.body.data).toHaveLength(0);
  });

  it('does not let the sender accept their own request', async () => {
    const res = await request(app).post(`/api/v1/friends/accept/${requestId}`).set(auth(alice.token));
    expect(res.status).toBe(403);
  });

  it('lets the recipient accept', async () => {
    const res = await request(app).post(`/api/v1/friends/accept/${requestId}`).set(auth(bob.token));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  it('lists each other as friends', async () => {
    const a = await request(app).get('/api/v1/friends').set(auth(alice.token));
    const b = await request(app).get('/api/v1/friends').set(auth(bob.token));
    expect(a.body.data.map((f) => f._id)).toContain(bob.user._id);
    expect(b.body.data.map((f) => f._id)).toContain(alice.user._id);
  });

  it('removes a friend', async () => {
    const res = await request(app).delete(`/api/v1/friends/${bob.user._id}`).set(auth(alice.token));
    expect(res.status).toBe(200);
    const list = await request(app).get('/api/v1/friends').set(auth(alice.token));
    expect(list.body.data).toHaveLength(0);
  });
});