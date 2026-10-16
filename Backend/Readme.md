# 🛠️ Twidio Backend – RESTful API for Video Platform

This is the backend repository for **Twidio**, a full-stack video sharing and social interaction platform. The backend is built using 
**Node.js**,
**Express**, 
and **MongoDB**,
offering complete support for user management, video uploads, playlists, comments, subscriptions, tweet-style posts, and detailed analytics.

---

## 🚀 Features

### 🔐 Authentication & Users
- Signup/Login with JWT
- Edit user profile (name, avatar, cover image)
- Follow/Unfollow (Subscribe/Unsubscribe)
- View other users' public channels

### 🎬 Video Management
- Upload video with title, description, thumbnail
- View video with incremented views
- Like/Unlike videos
- Fetch public videos or creator-specific videos
- Maintain and update **watch history**

### 📃 Playlists
- Create playlists
- Add/remove videos from playlists
- View user-specific playlists

### 💬 Comments
- Add, edit, and delete comments
- Get all comments for a video (with user info)

### 🐦 Tweets (Mini-Blogs)
- Create, edit, and delete tweets
- Like/Unlike tweets
- View all tweets or user-specific tweets

### 📈 Dashboard Analytics
- Get total views, likes, followers
- Line, bar, pie, and area chart data aggregation
- Track video engagement and history

---

## ⚙️ Tech Stack

- **Node.js** & **Express** – server framework
- **MongoDB** & **Mongoose** – database and ORM
- **JWT** – secure authentication
- **Multer** – file uploads (videos, images)
- **Cloudinary** – media storage (videos, avatars, thumbnails)
- **Aggregation Pipelines** – complex MongoDB data aggregation

---

