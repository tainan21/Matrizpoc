import { SharedLoginFlow } from "@matriz/flows-auth"
import { seumeiLoginSkin } from "../../src/auth/config"

export default function LoginPage() { return <SharedLoginFlow skin={seumeiLoginSkin} /> }
