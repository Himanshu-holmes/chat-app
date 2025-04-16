import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    https: {
      key: fs.readFileSync(path.join(__dirname,"cert","cert.key")),
       cert: fs.readFileSync(path.join(__dirname,"cert","cert.crt")),
       ca: fs.readFileSync(path.join(__dirname,"cert","ca.crt")),
    },
    // Make sure the server is accessible over the local network
    host: "0.0.0.0",
  },
});
