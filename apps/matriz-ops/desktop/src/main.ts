import "./styles.css"
const target = import.meta.env.VITE_MATRIZ_OPS_URL || "http://127.0.0.1:3009"
const url = new URL(target)
if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new Error("Matriz Ops desktop requires HTTPS outside loopback")
window.location.replace(url.toString())
