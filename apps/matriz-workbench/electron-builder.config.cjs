module.exports = {
  appId: "com.matriz.workbench",
  productName: "Matriz Workbench",
  asar: true,
  directories: {
    output: "release",
  },
  files: [
    "dist/native-desktop/**/*",
    ".next/standalone/**/*",
    "!.next/standalone/**/.matriz{,/**}",
    "!.next/standalone/**/.env*",
    "!.next/standalone/**/src{,/**}",
    "!.next/standalone/**/docs{,/**}",
    "!.next/standalone/**/logs{,/**}",
    "!.next/standalone/**/.next/cache{,/**}",
  ],
  extraMetadata: {
    main: "dist/native-desktop/main.js",
  },
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    artifactName: "matriz-workbench-${version}-windows-x64-setup.${ext}",
    certificateFile: process.env.WORKBENCH_WINDOWS_SIGNING_CERTIFICATE,
    forceCodeSigning: true,
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
  },
  publish: process.env.WORKBENCH_RELEASE_BASE_URL
    ? [{ provider: "generic", url: process.env.WORKBENCH_RELEASE_BASE_URL }]
    : null,
}
