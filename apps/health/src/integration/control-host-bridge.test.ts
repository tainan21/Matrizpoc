import { describe, expect, it } from "vitest"
import { readControlHostHealthMessage } from "./control-host-bridge"

const parent = {}
const message = {
  type: "matriz.control.health.v1",
  payload: { version: "v1", sampledAt: "2026-08-25T12:00:00.000Z", openTabs: 3, suspendedTabs: 1 },
}

describe("Control host health receiver", () => {
  it("accepts only a valid message from the parent at an exact current Control origin", () => {
    expect(readControlHostHealthMessage({
      origin: "http://127.0.0.1:3009",
      source: parent,
      data: message,
    }, parent)).toEqual(message.payload)
  })

  it("accepts the valid localhost alias for the Control origin", () => {
    expect(readControlHostHealthMessage({
      origin: "http://localhost:3009",
      source: parent,
      data: message,
    }, parent)).toEqual(message.payload)
  })

  it("rejects another origin, source, message type, or malformed payload", () => {
    expect(readControlHostHealthMessage({ origin: "http://127.0.0.1:3008", source: parent, data: message }, parent)).toBeNull()
    expect(readControlHostHealthMessage({ origin: "http://localhost:3009", source: {}, data: message }, parent)).toBeNull()
    expect(readControlHostHealthMessage({ origin: "http://localhost:3009", source: parent, data: { ...message, type: "matriz.control.health.v2" } }, parent)).toBeNull()
    expect(readControlHostHealthMessage({ origin: "http://localhost:3009", source: parent, data: { ...message, payload: { ...message.payload, openTabs: -1 } } }, parent)).toBeNull()
  })
})
