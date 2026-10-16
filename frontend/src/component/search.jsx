import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';

export default function SearchResults() {
  const { search } = useLocation();
  const query = new URLSearchParams(search).get('q');
  const [results, setResults] = useState({ users: [], videos: [] });

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/v1/search?q=${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data.data);
      } catch (err) {
        console.error('Error fetching search results:', err);
      }
    };

    if (query) fetchResults();
  }, [query]);

  return (
    <div className="p-6 text-text-primary 	bg-background min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Search Results for "{query}"</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold">Users</h2>
        {results.users.length === 0 ? (
          <p className="text-text-secondary">No users found.</p>
        ) : (
            <ul className="mt-2 space-y-2">
           {results.users.map((searchedUser) => (
  <li key={searchedUser._id}>
    <Link
      to={`/channel/${searchedUser.userName}`}
      className="flex items-center gap-2 hover:underline"
    >
      <img
        src={searchedUser.avatar || 'https://via.placeholder.com/32'}
        alt={searchedUser.fullName}
        className="h-8 w-8 rounded-full object-cover border border-white"
      />
      <span>{searchedUser.fullName}</span>
    </Link>
  </li>
))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold">Videos</h2>
        {results.videos.length === 0 ? (
          <p className="text-text-secondary">No videos found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            {results.videos.map((video) => (
              <Link
                to={`/watch/${video._id}`}
                key={video._id}
                className="bg-surface-light p-3 rounded hover:bg-surface-light"
              >
                <img src={video.thumbnail} alt={video.title} className="w-full h-40 object-cover rounded" />
                <p className="mt-2 font-medium">{video.title}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}