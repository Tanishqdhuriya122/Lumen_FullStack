# Lumen_FullStack
 Lumen
A full-stack, YouTube-inspired video platform built with the MERN stack — video hosting with adaptive streaming, authentication, and a real-time social layer (friends, chat, notifications, notes).
> Originally built as "Twidio," renamed to **Lumen**.
---
✨ Features
Videos
Signed, direct-to-Cloudinary uploads (browser → Cloudinary, bypassing the backend for file bytes)
Adaptive bitrate streaming (HLS) via Cloudinary
Custom video player built on `hls.js` — manual quality selector, keyboard shortcuts, fullscreen
Auto-thumbnail generation or capture-current-frame from the preview player
Idempotent view counting (a view only counts once per user, triggered on video completion)
Mutually exclusive like/dislike system
Search across title, description, and tags
Comments (add/edit/delete)
Social
Friends — send/accept/reject/remove requests
Real-time 1-on-1 chat (Socket.io) with typing indicators, online status, GIF support (Giphy), and emoji picker
Shared videos render as clickable preview cards inside chat
Real-time notifications — new videos from subscriptions, friend requests, new notes
Notes — a short, persistent status visible to your subscribers (Instagram Notes-style)
Subscriptions with subscriber counts
Platform
Playlists with custom cover images, displayed in a 3D circular carousel
Watch History and Watch Later
Creator dashboard with charts (views, likes, engagement over time)
Light/dark theme, fully token-based (one-file re-theming)
Custom, user-uploadable page backgrounds
JWT access/refresh token auth with automatic silent renewal
OTP email verification and OTP-based passwordless login
---
🛠️ Tech Stack
Frontend: React, React Router, Tailwind CSS v4, Axios, Socket.io-client, Headless UI, Recharts, hls.js, emoji-picker-react, Lucide icons
Backend: Node.js, Express, MongoDB + Mongoose, Socket.io, JWT, bcrypt, Multer, Cloudinary SDK, Nodemailer
Testing: Jest, Supertest, mongodb-memory-server
External services: MongoDB Atlas, Cloudinary, Giphy, Gmail SMTP
---
📁 Project Structure
```
Lumen/
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── utils/
│   │   ├── socket.js
│   │   ├── app.js
│   │   └── index.js
│   └── tests/
└── frontend/
    └── src/
        ├── component/
        ├── page/
        └── assets/
```
---
🚀 Getting Started
Prerequisites
Node.js (v18+)
A MongoDB Atlas account (or local MongoDB)
A Cloudinary account
A Giphy API key
A Gmail account with an App Password (for OTP emails)
1. Clone the repo
```bash
git clone https://github.com/Tanishqdhuriya122/Lumen.git
cd Lumen
```
2. Backend setup
```bash
cd Backend
npm install
```
Create a `.env` file in `Backend/` with the following:
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GIPHY_API_KEY=your_giphy_api_key

SMTP_USER=your_gmail_address
SMTP_PASS=your_gmail_app_password
```
Run the backend:
```bash
npm run dev
```
3. Frontend setup
```bash
cd ../frontend
npm install
npm run dev
```
The app should now be running at `http://localhost:5173`, with the API at `http://localhost:8000`.
4. Run tests (backend)
```bash
cd Backend
npm test
```
---
🏗️ Architecture Highlights
Direct-to-Cloudinary signed uploads — the backend issues a short-lived, JWT-gated signature; the browser uploads directly to Cloudinary, and the backend only ever saves the resulting URLs. This removes the server as a bottleneck for large file uploads.
Socket.io alongside REST, not instead of it — chat messages and notifications are always persisted via REST first; Socket.io is used only for instant delivery to users who are currently online.
One `Like` model with a `reactionType` field (not separate Like/Dislike models), with a partial unique index enforcing one reaction per user per video.
Token-based theming — every component reads from CSS custom properties, so the whole app re-themes from a single file.
---
📄 License
This project is for educational/portfolio purposes.
---
👤 Author
Tanishq Singh Dhuriya
B.Tech Computer Science, Vellore Institute of Technology
