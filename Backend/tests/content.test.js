import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectTestDb, disconnectTestDb, createUser, auth } from './helpers.js';

describe('Videos, likes, views, notes and playlists', () => {
  let alice, bob, videoId, playlistId;

  const media = {
    videoFile: 'https://res.cloudinary.com/demo/video/upload/v1/sample.mp4',
    thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
  };

  const notificationTypes = async (user) => {
    const res = await request(app).get('/api/v1/notifications').set(auth(user.token));
    return res.body.data.notifications.map((n) => n.type);
  };

  beforeAll(async () => {
    await connectTestDb();
    alice = await createUser('alice');
    bob = await createUser('bob');
  });
  afterAll(disconnectTestDb);

  // ---- subscriptions ----
  it('stops you subscribing to yourself', async () => {
    const res = await request(app)
      .post(`/api/v1/subscriptions/c/${alice.user._id}`)
      .set(auth(alice.token));
    expect(res.status).toBe(400);
  });

  it('lets bob subscribe to alice', async () => {
    const res = await request(app)
      .post(`/api/v1/subscriptions/c/${alice.user._id}`)
      .set(auth(bob.token));
    expect(res.status).toBe(201);
  });

  // ---- videos ----
  it('publishes a video and optimizes its URLs', async () => {
    const res = await request(app)
      .post('/api/v1/videos/')
      .set(auth(alice.token))
      .send({ title: 'First video', description: 'Hello there', ...media });
    expect(res.status).toBe(201);
    expect(res.body.data.videoFile).toContain('q_auto,f_auto');
    videoId = res.body.data._id;
  });

  it('rejects a video with no title', async () => {
    const res = await request(app)
      .post('/api/v1/videos/')
      .set(auth(alice.token))
      .send({ description: 'No title', ...media });
    expect(res.status).toBe(400);
  });

  it('notifies subscribers about the new video', async () => {
    expect(await notificationTypes(bob)).toContain('new_video');
  });

  it('shows the video on the public feed without logging in', async () => {
    const res = await request(app).get('/api/v1/videos/public');
    expect(res.status).toBe(200);
    expect(res.body.data.videos).toHaveLength(1);
  });

  // ---- likes / dislikes ----
  it('keeps likes and dislikes mutually exclusive', async () => {
    const like = await request(app).post(`/api/v1/likes/toggle/v/${videoId}`).set(auth(bob.token));
    expect(like.body.data).toMatchObject({ isLiked: true, isDisliked: false, likeCount: 1 });

    const dislike = await request(app)
      .post(`/api/v1/likes/toggle/dislike/v/${videoId}`)
      .set(auth(bob.token));
    expect(dislike.body.data).toMatchObject({
      isLiked: false,
      isDisliked: true,
      likeCount: 0,
      dislikeCount: 1,
    });

    const undo = await request(app)
      .post(`/api/v1/likes/toggle/dislike/v/${videoId}`)
      .set(auth(bob.token));
    expect(undo.body.data).toMatchObject({ isLiked: false, isDisliked: false, dislikeCount: 0 });
  });

  // ---- views ----
  it('counts a view only once per user', async () => {
    const first = await request(app).post(`/api/v1/videos/${videoId}/view`).set(auth(bob.token));
    expect(first.body.data.view).toBe(1);

    const again = await request(app).post(`/api/v1/videos/${videoId}/view`).set(auth(bob.token));
    expect(again.body.data.view).toBe(1);

    const other = await request(app).post(`/api/v1/videos/${videoId}/view`).set(auth(alice.token));
    expect(other.body.data.view).toBe(2);
  });

  it('does not count a view just for opening the video page', async () => {
    await request(app).get(`/api/v1/videos/${videoId}`).set(auth(bob.token));
    const res = await request(app).get(`/api/v1/videos/${videoId}`).set(auth(bob.token));
    expect(res.body.data.view).toBe(2);
  });

  // ---- notes ----
  it('rejects a note over 60 characters', async () => {
    const res = await request(app)
      .post('/api/v1/notes')
      .set(auth(alice.token))
      .send({ content: 'x'.repeat(61) });
    expect(res.status).toBe(400);
  });

  it('posts a note that subscribers can see', async () => {
    const post = await request(app).post('/api/v1/notes').set(auth(alice.token)).send({ content: 'first note' });
    expect(post.status).toBe(200);

    const res = await request(app).get('/api/v1/notes/subscribed').set(auth(bob.token));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].content).toBe('first note');
  });

  it('replaces the note instead of adding a second one', async () => {
    await request(app).post('/api/v1/notes').set(auth(alice.token)).send({ content: 'second note' });
    const res = await request(app).get('/api/v1/notes/subscribed').set(auth(bob.token));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].content).toBe('second note');
  });

  it('notifies subscribers about the note', async () => {
    expect(await notificationTypes(bob)).toContain('new_note');
  });

  // ---- playlists ----
  it('returns an empty list, not an error, when a user has no playlists', async () => {
    const res = await request(app)
      .get(`/api/v1/playlist/user/${alice.user._id}`)
      .set(auth(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('creates a playlist without a description', async () => {
    const res = await request(app)
      .post('/api/v1/playlist/')
      .set(auth(bob.token))
      .send({ name: 'Favourites' });
    expect(res.status).toBe(201);
    playlistId = res.body.data._id;
  });

  it('adds and removes a video', async () => {
    const add = await request(app)
      .patch(`/api/v1/playlist/add/${videoId}/${playlistId}`)
      .set(auth(bob.token));
    expect(add.status).toBe(200);

    const after = await request(app).get(`/api/v1/playlist/${playlistId}`).set(auth(bob.token));
    expect(after.body.data.videos).toHaveLength(1);

    const remove = await request(app)
      .patch(`/api/v1/playlist/remove/${videoId}/${playlistId}`)
      .set(auth(bob.token));
    expect(remove.status).toBe(200);

    const empty = await request(app).get(`/api/v1/playlist/${playlistId}`).set(auth(bob.token));
    expect(empty.body.data.videos).toHaveLength(0);
  });
});