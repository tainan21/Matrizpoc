/// <reference types="vite/client" />

import type { NaeviaBridge } from "./shared"

declare global { interface Window { naevia: NaeviaBridge } }
