import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [likeTimeline, setLikeTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const [statsRes, videosRes, likesTimeRes] = await Promise.all([
          axios.get(`${API_BASE}/api/v1/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/v1/dashboard/videos`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/v1/dashboard/timeline`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStats(statsRes.data.data);
        setVideos(videosRes.data.data);
        setLikeTimeline(
          likesTimeRes.data.data.map((entry) => ({
            time: new Date(entry.time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            Likes: 1,
          }))
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const barData = videos.map((video) => ({
    name: video.title,
    Views: video.view,
    Likes: video.likeCount || 0,
  }));
  if (loading) {
    return (
      <div className="text-text-primary p-4 text-left text-lg font-semibold">
        Loading dashboard...
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="text-danger p-4 text-left text-lg font-semibold">
        Please login to view dashboard
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 md:px-8 py-6">
      <h1 className="text-4xl font-extrabold mb-8 text-center">Channel Insights</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        <StatCard title="Total Videos" value={stats.totalVideos} />
        <StatCard title="Subscribers" value={stats.totalSubscribers} />
        <StatCard title="Video Likes" value={stats.totalVideoLikes} />
        <StatCard title="Tweet Likes" value={stats.totalTweetLikes} />
        <StatCard title="Total Views" value={stats.totalViews} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ChartCard title="Most Viewed & Liked Videos">
          <BarChart layout="vertical" data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" stroke="var(--color-text-secondary)" />
            <YAxis dataKey="name" type="category" width={150} stroke="var(--color-text-secondary)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <Legend />
            <Bar dataKey="Views" fill="var(--color-text-primary)">
              <LabelList dataKey="Views" position="right" fill="var(--color-text-primary)" />
            </Bar>
            <Bar dataKey="Likes" fill="var(--color-text-muted)">
              <LabelList dataKey="Likes" position="right" fill="var(--color-text-primary)" />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title=" Views by Publish Date">
          <LineChart
            data={videos.map((video) => ({
              date: new Date(video.createdAt).toLocaleDateString(),
              Views: video.view,
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-text-secondary)" />
            <YAxis stroke="var(--color-text-secondary)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <Line type="monotone" dataKey="Views" stroke="var(--color-text-primary)" strokeWidth={2} />
          </LineChart>
        </ChartCard>

        <ChartCard title=" Views Distribution">
          <PieChart>
            <Pie
              data={barData}
              dataKey="Views"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent, x, y }) => (
                <text
                  x={x}
                  y={y}
                  fill="#ffffff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                >
                  {`${name} ${(percent * 100).toFixed(0)}%`}
                </text>
              )}
            >
              {barData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={["#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080"][index % 5]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              labelStyle={{ color: "var(--color-text-primary)" }}
              itemStyle={{ color: "var(--color-text-primary)" }}
            />
          </PieChart>
        </ChartCard>

        <ChartCard title=" Engagement Over Time">
          <AreaChart
            data={videos.map((video) => ({
              date: new Date(video.createdAt).toLocaleDateString(),
              Engagement: video.view + (video.likeCount || 0),
            }))}
          >
            <defs>
              <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-text-primary)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--color-text-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="var(--color-text-secondary)" />
            <YAxis stroke="var(--color-text-secondary)" />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <Area
              type="monotone"
              dataKey="Engagement"
              stroke="var(--color-text-primary)"
              fillOpacity={1}
              fill="url(#colorEngagement)"
            />
          </AreaChart>
        </ChartCard>

   
        {/* ⬇️ Paste your histogram and table below this */}



{/* Table - Video Summary */}
<div className="bg-surface text-text-primary rounded-xl shadow p-6 mt-10 overflow-x-auto">
  <h2 className="text-2xl font-semibold mb-4">Video Summary Table</h2>
  <table className="min-w-full text-sm text-left">
    <thead>
      <tr className="bg-surface-light text-text-primary">
        <th className="py-2 px-4">Title</th>
        <th className="py-2 px-4">Likes</th>
        <th className="py-2 px-4">Views</th>
      </tr>
    </thead>
    <tbody>
      {videos.map((video) => (
        <tr key={video._id} className="border-t border-border hover:bg-surface-light">
          <td className="py-2 px-4">{video.title}</td>
          <td className="py-2 px-4">{video.likeCount || 0}</td>
          <td className="py-2 px-4">{video.view}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="p-4 rounded-xl shadow-md text-text-primary bg-surface border border-border">
    <p className="text-sm font-medium text-text-secondary">{title}</p>
    <p className="text-3xl font-bold mt-1">{value}</p>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-surface rounded-2xl p-4 shadow-lg h-[400px] w-full">
    <h2 className="text-xl font-semibold text-text-primary mb-4">{title}</h2>
    <ResponsiveContainer width="100%" height="85%">{children}</ResponsiveContainer>
  </div>
);

const aggregateLikesByTime = (data) => {
  const map = new Map();
  for (const item of data) {
    map.set(item.time, (map.get(item.time) || 0) + 1);
  }
  return Array.from(map, ([time, Likes]) => ({ time, Likes }));
};
const ChartSection = ({ title, children, height }) => (
  <div className="mt-12">
    <h2 className="text-2xl font-semibold mb-4">{title}</h2>
    <div className={`w-full h-[${height}px] bg-surface rounded-xl p-4`}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);
export default Dashboard;