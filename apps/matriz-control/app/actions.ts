"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { configuredToken, CONTROL_SESSION_COOKIE, createSessionValue, verifySessionValue } from "../src/auth/local-access"

export async function unlockAction(formData: FormData) {
  const submitted = String(formData.get("token") ?? "")
  let expected: string
  try { expected = configuredToken() } catch { redirect("/unlock?error=configuration") }
  if (!verifySessionValue(expected, createSessionValue(submitted))) redirect("/unlock?error=invalid")
  const jar = await cookies()
  jar.set(CONTROL_SESSION_COOKIE, createSessionValue(expected), { httpOnly: true, sameSite: "strict", secure: process.env.MATRIZ_CONTROL_COOKIE_SECURE === "true", path: "/", maxAge: 60 * 60 * 12 })
  redirect("/apps")
}
