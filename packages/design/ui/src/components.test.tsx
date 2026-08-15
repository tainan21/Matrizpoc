import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { afterEach, describe, expect, it } from "vitest"

import { Alert, Button, FormField, InfoHint, Input } from "./index"

afterEach(cleanup)

describe("Button", () => {
  it("does not submit a form unless a consumer explicitly requests it", () => {
    render(<Button>Continue</Button>)

    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute(
      "type",
      "button",
    )
  })

  it("preserves the native disabled state", () => {
    render(<Button disabled>Continue</Button>)

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()
  })
})

describe("FormField", () => {
  it("connects a label and helper text to its input", () => {
    render(
      <FormField id="company" label="Company" helper="Use the legal name">
        <Input />
      </FormField>,
    )

    expect(screen.getByRole("textbox", { name: "Company" })).toHaveAccessibleDescription(
      "Use the legal name",
    )
  })

  it("keeps the field id authoritative when an input supplies a conflicting id", () => {
    render(
      <FormField id="company" label="Company" helper="Use the legal name">
        <Input id="legal-company" />
      </FormField>,
    )

    const input = screen.getByRole("textbox", { name: "Company" })
    expect(input).toHaveAttribute("id", "company")
    expect(input).toHaveAccessibleDescription("Use the legal name")
  })

  it("connects a field error to its input and announces the error", () => {
    render(
      <FormField id="company" label="Company" error="Enter the company">
        <Input />
      </FormField>,
    )

    const input = screen.getByRole("textbox", { name: "Company" })
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAccessibleDescription("Enter the company")
    expect(screen.getByRole("status")).toHaveTextContent("Enter the company")
  })
})

describe("Alert", () => {
  it("exposes informational feedback as status text", () => {
    render(<Alert>Settings saved</Alert>)

    expect(screen.getByRole("status")).toHaveTextContent("Settings saved")
  })
})

describe("InfoHint", () => {
  it("opens from click and closes after an outside click", async () => {
    const user = userEvent.setup()
    render(
      <div>
        <InfoHint label="About this field">Supporting information</InfoHint>
        <button type="button">Outside</button>
      </div>,
    )

    await user.click(screen.getByRole("button", { name: "About this field" }))
    expect(screen.getByRole("tooltip")).toHaveTextContent("Supporting information")

    await user.click(screen.getByRole("button", { name: "Outside" }))
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("opens on keyboard focus and Escape closes it with focus on the trigger", async () => {
    const user = userEvent.setup()
    render(<InfoHint label="About this field">Supporting information</InfoHint>)

    await user.tab()
    const trigger = screen.getByRole("button", { name: "About this field" })
    expect(trigger).toHaveFocus()
    expect(screen.getByRole("tooltip")).toHaveTextContent("Supporting information")

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
