import { DEFAULT_PRACTICE_APPS } from "@matriz/flows-praticies"
import { PraticiesLauncher } from "../../../src/ui/components/praticies-launcher"
import { toWorkbenchPracticeVM } from "../../../src/ui/presenters/praticies-presenter"

export default function PraticiesPage() {
  return <PraticiesLauncher apps={DEFAULT_PRACTICE_APPS.map(toWorkbenchPracticeVM)} />
}
