import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function patchFile(relativePath, replacers) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    return { file: relativePath, changed: false, reason: "missing" };
  }

  let content = fs.readFileSync(fullPath, "utf8");
  const original = content;

  for (const [from, to] of replacers) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, "utf8");
    return { file: relativePath, changed: true, reason: "patched" };
  }

  return { file: relativePath, changed: false, reason: "already-patched" };
}

const results = [
  patchFile(
    "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/plugin/SystemBars.java",
    [["Build.VERSION_CODES.VANILLA_ICE_CREAM", "35"]],
  ),
  patchFile(
    "node_modules/@capacitor/status-bar/android/src/main/java/com/capacitorjs/plugins/statusbar/StatusBar.java",
    [
      [
        "if (deviceApi < Build.VERSION_CODES.VANILLA_ICE_CREAM)",
        "if (deviceApi < 35)",
      ],
      [
        "} else if (deviceApi == Build.VERSION_CODES.VANILLA_ICE_CREAM) {",
        "} else if (deviceApi == 35) {",
      ],
      [
        "if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {",
        "if (Build.VERSION.SDK_INT >= 35) {",
      ],
      [
        "window.getContext().getTheme().resolveAttribute(android.R.attr.windowOptOutEdgeToEdgeEnforcement, value, true);",
        'int attrId = window.getContext().getResources().getIdentifier("windowOptOutEdgeToEdgeEnforcement", "attr", "android");\n            if (attrId == 0) {\n                return false;\n            }\n            window.getContext().getTheme().resolveAttribute(attrId, value, true);',
      ],
    ],
  ),
];

for (const result of results) {
  console.log(`[patch-capacitor] ${result.file}: ${result.reason}`);
}
