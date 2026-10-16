import React, { useEffect, useState } from 'react';
import PixelSwap from './PixelSwap';

export default function SplashScreen({ onFinish }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setActive(true), 1200);
    return () => clearTimeout(startTimer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      <PixelSwap
        firstContent={
          <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
              Lumen
            </h1>
            <p className="text-neutral-400 text-sm sm:text-base mt-3">
              Light up what matters to you
            </p>
          </div>
        }
        secondContent={
          <div className="w-full h-full flex flex-col items-center justify-center bg-white">
            <h1 className="text-4xl sm:text-6xl font-bold text-black tracking-tight">
              Lumen
            </h1>
            <p className="text-neutral-600 text-sm sm:text-base mt-3">
              Light up what matters to you
            </p>
          </div>
        }
        pixelSize={48}
        gap={4}
        pixelRadius={10}
        pixelSpin={0}
        pixelScale={0.35}
        duration={1400}
        pixelDuration={450}
        pattern="random"
        randomness={0.3}
        fade
        trigger="auto"
        active={active}
        aspectRatio="auto"
        style={{ width: '100%', height: '100%' }}
        onComplete={() => {
          // Hold on the revealed (inverted-color) logo for a moment so it's
          // actually seen, before handing off to the real app.
          setTimeout(onFinish, 600);
        }}
      />
    </div>
  );
}