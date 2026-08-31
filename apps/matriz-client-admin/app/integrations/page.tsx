import { loadDashboardPageData } from "../../src/server/page-data"
import { ResilientDashboard } from "../../src/ui/ResilientDashboard"
export const dynamic = "force-dynamic"
export default async function Page() { return <ResilientDashboard initial={await loadDashboardPageData()} section="integrations" path="/integrations"/> }
