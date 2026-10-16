import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ListVideo, Users, UploadCloud } from 'lucide-react';

const items = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: ListVideo, label: 'Playlist', href: '/create-playlist' },
    { icon: Users, label: 'Chats', href: '/chat' },
  { icon: UploadCloud, label: 'Upload', href: '/upload' },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function BottomDock() {
  const location = useLocation();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 bg-surface/90 backdrop-blur-md border border-border rounded-full px-2 py-2 shadow-xl shadow-black/40">
        {items.map((item) => {
                    const isActive =
            item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.href}
              className="group relative flex items-center justify-center w-11 h-11 rounded-full transition-colors"
            >
              <span
                className={classNames(
                  'absolute inset-0 rounded-full transition-colors',
                  isActive ? 'bg-primary' : 'group-hover:bg-surface-light'
                )}
              />
              <Icon
                className={classNames(
                  'relative w-5 h-5 transition-colors',
                  isActive ? 'text-on-primary' : 'text-text-secondary group-hover:text-text-primary'
                )}
              />
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-surface-light text-text-primary text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}