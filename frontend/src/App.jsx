// App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './component/navbar';
import BottomDock from './component/bottomdock';
import Login from './component/login';
import Signup from './component/signup';
import Profile from './component/profile';
import EditProfile from './page/edit';
import Account from './page/account';
import AvatarAndCover from './page/avatarandcover';
import Password from './page/password';
import UploadVideo from './component/uploadvideo';
import WatchVideo from './component/watchvideo';
import UpdateVideo from './page/updatevideo';
import DeleteVideo from './page/deletevideo';
import OtherProfile from './page/otheruserprofile';
import Playlist from './component/playlist';
import ParticularPlaylist from './component/displayplaylist';
import AddToPlaylist from './page/addtoplaylist';
import HomePage from './component/home';
import LikedVideos from './component/likevideos';
import EditPlaylist from './page/updateplaylist';
import History from './component/history';
import Tweet from './component/tweet';
import Dashboard from './component/dashboard';
import SearchResults from './component/search';
import VerifyEmailOtp from './component/verifyemailotp';
import LoginWithOtp from './component/loginwithotp';
import Friends from './component/friends';
import ChatWindow from './component/chatwindow';
import WatchLater from './component/watchlater';


import './index.css';

export default function App() {
  return (
    <>
      <Navbar />
      {/* <NotesBar /> */}
      <BottomDock />

      <div className="pb-24">
        <Routes>
          {/* Default route to homepage */}
          <Route path="/" element={<HomePage />} />

          {/* Other routes */}
          <Route path="/home" element={<Navigate to="/" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login-otp" element={<LoginWithOtp />} />
          <Route path="/verify-email" element={<VerifyEmailOtp />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit" element={<EditProfile />} />
          <Route path="/edit/account" element={<Account />} />
          <Route path="/edit/photo" element={<AvatarAndCover />} />
          <Route path="/edit/password" element={<Password />} />
          <Route path="/upload" element={<UploadVideo />} />
          <Route path="/like" element={<LikedVideos />} />
          <Route path="/watch/:videoId" element={<WatchVideo />} />
          <Route path="/delete-video/:videoId" element={<DeleteVideo />} />
          <Route path="/edit-video/:videoId" element={<UpdateVideo />} />
          <Route path="/channel/:userName" element={<OtherProfile />} />
          <Route path="/watch-later" element={<WatchLater />} />

          <Route path="/create-playlist" element={<Playlist />} />
          <Route path="/playlist/:playlistId" element={<ParticularPlaylist />} />
          <Route path="/history" element={<History />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tweet" element={<Tweet />} />
          <Route path="/search" element={<SearchResults />} />
          {/* <Route path="/chat/:friendId" element={<ChatWindow />} /> */}
          <Route path="/add-to-playlist/:videoId" element={<AddToPlaylist />} />
          <Route path="/edit-playlist/:playlistId" element={<EditPlaylist />} />
          {/* <Route path="/friends" element={<Friends />} /> */}
          <Route path="/chat" element={<ChatWindow />} />
          {/* <Route path="/chat/:friendId" element={<ChatWindow />} /> */}

          <Route path="/chat" element={<ChatWindow />} />
          <Route path="/chat/:friendId" element={<ChatWindow />} />
          <Route path="/friends" element={<Navigate to="/chat" replace />} />
        </Routes>
      </div>
    </>
  );
}