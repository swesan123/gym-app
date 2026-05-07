import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR when opening the dev server via LAN IP (e.g. phone on same network).
  allowedDevOrigins: ["172.25.6.134"],
};

export default nextConfig;
