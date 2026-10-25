const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3000";
const out = process.argv[2] || "snapshot.json";
const qs = ["react tutorial","docker guide","postgresql basics","redis project","typescript tips",
  "kubernetes tutorial","graphql guide","prisma basics","ffmpeg tips","node.js project",
  "dockr tutorial","reakt guide"];
(async () => {
  const snap = {};
  for (const q of qs) {
    const r = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
    snap[q] = await r.json();
  }
  fs.writeFileSync(out, JSON.stringify(snap, null, 1));
  console.log("wrote", out);
})();