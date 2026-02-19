@echo off
rem OpenClaw Gateway (v2026.2.17)
set PATH=C:\WINDOWS\system32;C:\WINDOWS;C:\WINDOWS\System32\Wbem;C:\WINDOWS\System32\WindowsPowerShell\v1.0\;C:\WINDOWS\System32\OpenSSH\;C:\Program Files\Git\cmd;C:\Program Files\nodejs\;C:\Users\MSI\AppData\Local\Microsoft\WindowsApps;C:\Users\MSI\AppData\Local\Programs\Microsoft VS Code\bin;C:\Users\MSI\AppData\Roaming\npm;C:\Users\MSI\AppData\Local\Programs\Antigravity\bin;C:\Users\MSI\AppData\Local\Programs\Ollama
set OPENCLAW_GATEWAY_PORT=18789
set OPENCLAW_SYSTEMD_UNIT=openclaw-gateway.service
set OPENCLAW_SERVICE_MARKER=openclaw
set OPENCLAW_SERVICE_KIND=gateway
set OPENCLAW_SERVICE_VERSION=2026.2.17
"C:\Program Files\nodejs\node.exe" C:\Users\MSI\AppData\Roaming\npm\node_modules\openclaw\dist\index.js gateway --port 18789
