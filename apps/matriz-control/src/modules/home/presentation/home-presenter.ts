import type { GitOverviewViewModel } from "../../git/presentation/git-presenter"

type Provider<T> = { readonly status: "fulfilled"; readonly value: T } | { readonly status: "rejected"; readonly reason: string }
export interface HomeInput {
  readonly git: Provider<GitOverviewViewModel>
  readonly projects: Provider<readonly { readonly id: string; readonly name: string; readonly port: number | null }[]>
  readonly doctor: Provider<unknown>
}

export function presentHome(input: HomeInput) {
  const unavailable = (Object.entries(input) as Array<[keyof HomeInput, Provider<unknown>]>).filter(([, provider]) => provider.status === "rejected").map(([key]) => key)
  return {
    git: input.git.status === "fulfilled" ? input.git.value : null,
    projects: input.projects.status === "fulfilled" ? input.projects.value : [],
    doctor: input.doctor.status === "fulfilled" ? input.doctor.value : null,
    unavailable,
  }
}
