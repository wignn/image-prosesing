/// <reference types="vite/client" />

declare module '*.wasm' {
    const content: WebAssembly.Module
    export default content
}

declare module '*?init' {
    const initWasm: () => Promise<WebAssembly.Instance>
    export default initWasm
}
