import React from "react";

export const AnimatedBlobLoader: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[255px] h-[255px]">
      <div className="ball" style={{ "--color": "#01de82ff", "--i": "50px", "--d": "6s" } as React.CSSProperties}></div>
      <div className="ball" style={{ "--color": "#66e98dff", "--i": "80px", "--d": "5s" } as React.CSSProperties}></div>
      <div className="ball" style={{ "--color": "#754fa8", "--i": "110px", "--d": "4s" } as React.CSSProperties}></div>

      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          width: 100vw;
          height: 100vh;
        }

        .ball {
          position: absolute;
          width: calc(255px + var(--i));
          height: calc(255px + var(--i));
          background-color: var(--color);
          border-radius: 50%;
          animation: move 5s linear infinite;
          transform-origin: 127.5px 127.5px;
          mix-blend-mode: screen;
          animation-duration: var(--d);
          filter: blur(60px);
          top: 0;
          left: 0;
          opacity: 1;
        }

        .ball:nth-child(even) {
          animation-direction: reverse;
        }

        @keyframes move {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
