const fs = require("fs");
const path = require("path");

const map = {
  "#0b5fa5": "#137b72",
  "#0a2f63": "#0c3b38",
  "#ffc92e": "#fbab15",
  "#084f8b": "#0e625b",
  "#f6bc15": "#e89a06",
  "#ffdf73": "#ffd27a",
  "#ffdc67": "#ffd27a",
  "#435f79": "#4a6663",
  "#d8e8eb": "#d5e6e3",
  "#334f69": "#35524f",
  "#08274f": "#0a2f2c",
  "#e3eff8": "#e4f1ef",
  "#cbdbe7": "#c3d9d6",
  "#d5e3e8": "#d3e5e2",
  "%230a2f63": "%230c3b38",
  "#d99c00": "#e6970a",
  "#58738c": "#55726f",
  "#c5ebf2": "#c6ece8",
  "#d9f1e4": "#dbf2e6",
  "#f4df9b": "#fbe3a6",
  "#e6f3f7": "#e4f3f1",
  "#ffd75b": "#fbbd3e",
  "#a8e2ef": "#a9e5e0",
  "#d8f0dc": "#dcf1df",
  "#67c0b3": "#5cc2b8",
  "#137aa0": "#137b72",
  "#a2def0": "#a6e4de",
  "#64bcb0": "#5bc0b5",
  "#0d7399": "#0f6e66",
  "#a7c7d3": "#a9cbc7",
  "#e9f5f7": "#e6f4f2",
  "#9bb4c2": "#a3bdb9",
  "#e3f2f7": "#e2f3f1",
  "#fff2c9": "#fff1d0",
  "#e1eff8": "#e0f0ee",
  "#4db0cc": "#12b0a8",
  "#bfdde5": "#c0dcd9",
  "#f0f9fa": "#eff9f8",
  "#dbeef2": "#dbeeeb",
  "#b9d3e0": "#b8d6d2",
  "#526e83": "#53706d",
  "#536d82": "#53706d",
  "#d2e4e8": "#d3e5e2",
  "#e9f4f5": "#e7f4f2",
  "#e6f3f8": "#e3f3f1",
  "#acd2dc": "#aad3cd",
  "#d4e4e8": "#d3e5e2",
  "#294960": "#2b4a47",
  "#bfd3dd": "#bdd5d1",
  "#587185": "#58736f",
  "#d2e1e6": "#d1e3e0",
  "#eaf5f8": "#e6f4f2",
  "#d6e5e8": "#d5e6e3",
  "#e3f3f7": "#dff2ef",
  "#dce8eb": "#dbe9e6",
  "#e9f5f6": "#e7f4f2",
  "#cfe2e6": "#cfe3e0",
  "#d3e2e7": "#d2e4e1",
  "#eaf5f6": "#e7f4f2",
  "#e8eff1": "#e6eeed",
  "#d5e1e5": "#d3e2df",
  "#f7fafb": "#f6faf9",
  "#e1eaed": "#e0eae8",
  "#28485e": "#2a4a47",
  "#718696": "#728a87",
  "#c5e1e9": "#c2e0dc",
  "#e8f5f8": "#e4f4f1",
  "#e2ebee": "#e1ebe9",
  "#cbdce2": "#c9ddd9",
  "#647d8e": "#647f7b",
  "#d7e4e9": "#d6e5e2",
  "#e3ecef": "#e2ece9",
  "#f8fbfc": "#f7fbfa",
  "#e4ecef": "#e3ece9",
  "#607789": "#5f7a76",
  "#788e9d": "#798f8c",
  "#f4f8fa": "#f3f8f7",
  "#dbe7ed": "#dae8e5",
  "#eaf4f7": "#e6f4f1",
  "#d8e5eb": "#d7e6e3",
  "#e8f3f6": "#e5f3f0",
  "#5e7484": "#5f7773",
  "#e5edf0": "#e4eeeb",
  "#cbdce3": "#c9ddd9",
  "#5c7489": "#5c7773",
  "#edf1f3": "#ecf1f0",
  "#475e6e": "#496260",
  "#e4f2f8": "#e0f2ef",
  "#f5f8f9": "#f4f8f7",
  "#36546b": "#385653",
  "#123": "#0f2b29"
};

const rgbMap = [
  ["rgb(10 47 99", "rgb(12 59 56"],
  ["rgb(11 95 165", "rgb(19 123 114"],
  ["rgb(4 18 32", "rgb(4 28 26"]
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keys = Object.keys(map).sort((a, b) => b.length - a.length);
const re = new RegExp("(" + keys.map(esc).join("|") + ")(?![0-9a-fA-F])", "gi");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(css|tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const left = {};
for (const file of walk("src")) {
  const before = fs.readFileSync(file, "utf8");
  let after = before.replace(re, (m) => map[m.toLowerCase()]);
  for (const [a, b] of rgbMap) after = after.split(a).join(b);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log("updated", file);
  }
  for (const c of after.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []) {
    const k = c.toLowerCase() + "  " + file;
    left[k] = (left[k] || 0) + 1;
  }
}
console.log("REMAINING HEX:");
for (const k of Object.keys(left).sort()) console.log(k);
