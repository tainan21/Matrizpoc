import { addons } from "storybook/manager-api"
import { create } from "storybook/theming/create"

addons.setConfig({
  theme: create({
    base: "dark",
    brandTitle: "MatrizLib",
    brandUrl: "/",
    brandTarget: "_self",
    colorPrimary: "#9b8cff",
    colorSecondary: "#7c3aed",
    appBg: "#090d14",
    appContentBg: "#0b111b",
    appPreviewBg: "#101824",
    appBorderColor: "#283246",
    appBorderRadius: 6,
    textColor: "#f4f6fb",
    textMutedColor: "#aeb7c7",
    barTextColor: "#aeb7c7",
    barSelectedColor: "#9b8cff",
    barHoverColor: "#f4f6fb",
    inputBg: "#101824",
    inputBorder: "#283246",
    inputTextColor: "#f4f6fb",
    inputBorderRadius: 6,
  }),
  sidebar: {
    showRoots: true,
  },
})
