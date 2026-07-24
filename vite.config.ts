import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// GitHub Pages 프로젝트 사이트로 배포되므로 리포지토리 이름을 base로 사용.
// 로컬 dev(base '/')에서도 정상 동작하도록 프로덕션 빌드시에만 서브패스 적용.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/kbo-graph/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
