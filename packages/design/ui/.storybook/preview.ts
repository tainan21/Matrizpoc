import { createElement } from "react"
import type { Decorator, Preview } from "@storybook/react-vite"
import { addons } from "storybook/preview-api"

import "@matriz/design-system/css"
import "@matriz/design-ui/styles.css"
import "./catalog.css"
import {
  CatalogDocsContainer,
  CatalogEnvironment,
  publishCatalogGlobals,
} from "./catalog-environment"

const initialCatalogGlobals = {
  theme: "light",
  density: "comfortable",
  motion: "full",
}

publishCatalogGlobals(initialCatalogGlobals)
addons.getChannel().on("globalsUpdated", ({ globals }: { globals: Record<string, unknown> }) => {
  publishCatalogGlobals(globals)
})

const withCatalogEnvironment: Decorator = (Story, context) => {
  return createElement(
    CatalogEnvironment,
    {
      className: "matriz-catalog",
      globals: context.globals,
    },
    createElement("div", { className: "matriz-catalog__stage" }, createElement(Story)),
  )
}

const preview: Preview = {
  decorators: [withCatalogEnvironment],
  globalTypes: {
    theme: {
      name: "Tema",
      description: "Modo de cor aplicado à superfície da story.",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Claro" },
          { value: "dark", title: "Escuro" },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      name: "Densidade",
      description: "Ritmo espacial do conteúdo operacional.",
      defaultValue: "comfortable",
      toolbar: {
        icon: "component",
        items: [
          { value: "comfortable", title: "Confortável" },
          { value: "compact", title: "Compacta" },
        ],
        dynamicTitle: true,
      },
    },
    motion: {
      name: "Movimento",
      description: "Contrato de movimento da interface.",
      defaultValue: "full",
      toolbar: {
        icon: "lightning",
        items: [
          { value: "full", title: "Completo" },
          { value: "reduced", title: "Reduzido" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: initialCatalogGlobals,
  parameters: {
    layout: "fullscreen",
    docs: {
      container: CatalogDocsContainer,
    },
    controls: {
      expanded: true,
      sort: "requiredFirst",
    },
    options: {
      storySort: {
        order: ["MatrizLib", ["Overview", "Foundations", "Components", "Migration"]],
      },
    },
    viewport: {
      options: {
        mobile: {
          name: "Mobile · 390 × 844",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        tablet: {
          name: "Tablet · 768 × 1024",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop: {
          name: "Desktop · 1440 × 900",
          styles: { width: "1440px", height: "900px" },
          type: "desktop",
        },
      },
    },
  },
}

export default preview
