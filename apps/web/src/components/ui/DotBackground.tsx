import React, { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';

const DotBackground: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const dots = useMemo(() => {
    return Array.from({ length: 40 }).map((_, index) => ({
      id: `dot-${index}`,
      size: Math.random() * 200 + 200,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 7,
    }));
  }, []); // ← Only run this once

  return (
    <>
      <div
        className="fixed inset-0 z-0 overflow-hidden"
        style={{ backgroundColor: isDark ? '#070e1bff' : '#e2e2e2ff' }}
      >
        {dots.map((dot) => (
          <div
            key={dot.id}
            className={`absolute rounded-full animate-dot-float ${
              isDark ? 'mix-blend-screen' : ''
            }`}
            style={{
              top: `${dot.y}vh`,
              left: `${dot.x}vw`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              backgroundColor: isDark ? '#000705ff' : '#e1f3e7ff',
              filter: 'blur(100px)',
              opacity: isDark ? 0.35 : 0.6,
              animationDelay: `${-dot.delay}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dot-float {
          0% { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(-100px); opacity: 0.5; }
        }
        .animate-dot-float {
          animation: dot-float 7s ease-in-out infinite alternate;
        }
      `}</style>
    </>
  );
};

export default DotBackground;
