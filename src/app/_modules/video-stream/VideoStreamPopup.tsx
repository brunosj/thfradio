"use client";

import { useState, useEffect, useRef } from "react";
import { IoClose, IoMove, IoExpand, IoContract } from "react-icons/io5";
import { useTranslations } from "next-intl";

interface StreamStatus {
  live: boolean;
  hlsUrl?: string;
}

interface Position {
  x: number;
  y: number;
}

export default function VideoStreamPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  const [hlsUrl, setHlsUrl] = useState<string>("");
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isFullPage, setIsFullPage] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();

  const STORAGE_KEY = "video-stream-popup-position";

  // Check streaming status
  const checkStreamStatus = async () => {
    try {
      // First try the backend API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/health/stream`,
        {
          cache: "no-store",
        },
      );

      if (response.ok) {
        const data: StreamStatus = await response.json();
        setIsLive(data.live);
        if (data.hlsUrl) {
          setHlsUrl(data.hlsUrl);
        }
      } else {
        // Fallback: always show the popup if we can't check status
        // Adjust this based on your actual streaming setup
        setIsLive(false);
      }
    } catch (error) {
      console.error("Error checking stream status:", error);
      setIsLive(false);
    }
  };

  // Check status on mount and set up polling
  useEffect(() => {
    checkStreamStatus();

    // Poll for stream status every 10 seconds
    pollIntervalRef.current = setInterval(() => {
      checkStreamStatus();
    }, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Load position from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedPosition = localStorage.getItem(STORAGE_KEY);
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (error) {
        console.error("Error loading popup position:", error);
        // Set default position (bottom left)
        setPosition({ x: 16, y: window.innerHeight - 500 });
      }
    } else {
      // Set default position (bottom left)
      setPosition({ x: 16, y: window.innerHeight - 500 });
    }
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  // Handle mouse down on header to start dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window === "undefined") return;
    if (isFullPage) return; // Don't allow dragging in full page mode

    setIsDragging(true);
    const rect = popupRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Handle mouse move while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (typeof window === "undefined") return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep popup within viewport bounds
      const maxX = window.innerWidth - 400; // Approximate width
      const maxY = window.innerHeight - 100;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle popup visibility
  useEffect(() => {
    if (isLive && !hasBeenDismissed) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isLive, hasBeenDismissed]);

  const handleClose = () => {
    setIsOpen(false);
    setHasBeenDismissed(true);
  };

  const videoUrl = hlsUrl || "https://video.thfradio.space/hls/live/index.m3u8";

  return (
    <>
      {isOpen && (
        <div
          ref={popupRef}
          className={`${isFullPage ? "fixed inset-0 z-50" : "fixed z-40"} flex flex-col overflow-hidden ${isFullPage ? "" : "rounded-lg"} bg-black shadow-2xl`}
          style={
            isFullPage
              ? {}
              : {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: "500px",
                  cursor: isDragging ? "grabbing" : "auto",
                }
          }
        >
          {/* Drag Handle / Header */}
          <div
            ref={headerRef}
            onMouseDown={handleMouseDown}
            className="flex items-center justify-between gap-2 bg-thf-blue-500 px-3 py-2 text-white"
            style={{
              cursor: isDragging && !isFullPage ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            <div className="flex items-center gap-2">
              {/* <IoMove className="h-4 w-4 flex-shrink-0" /> */}
              <span className="text-sm font-semibold">
                🔴 {t("nowPlaying")} - Video Stream
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Expand/Contract Button */}
              <button
                onClick={() => setIsFullPage(!isFullPage)}
                className="flex-shrink-0 rounded-full bg-black/50 p-1 hover:bg-black/70"
                aria-label={
                  isFullPage ? "Exit full page" : "Expand to full page"
                }
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isFullPage ? (
                  <IoContract className="h-5 w-5 text-white" />
                ) : (
                  <IoExpand className="h-5 w-5 text-white" />
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="flex-shrink-0 rounded-full bg-black/50 p-1 hover:bg-black/70"
                aria-label="Close video stream"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <IoClose className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Video Container */}
          <div
            className={`relative w-full flex-grow ${!isFullPage ? "" : "h-full"}`}
            style={!isFullPage ? { aspectRatio: "16/9" } : {}}
          >
            <video
              controls
              autoPlay
              playsInline
              className="h-full w-full bg-black"
              src={videoUrl}
              crossOrigin="anonymous"
            >
              <source src={videoUrl} type="application/x-mpegURL" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </>
  );
}
