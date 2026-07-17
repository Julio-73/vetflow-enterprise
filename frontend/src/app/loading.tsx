import React from "react";

export default function Loading() {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-transparent z-[9999] overflow-hidden">
      <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 loading-bar-inner" />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading-slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .loading-bar-inner {
          width: 100%;
          animation: loading-slide 1.5s infinite ease-in-out;
        }
      `}} />
    </div>
  );
}
