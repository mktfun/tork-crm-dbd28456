# 🪐 Antigravity Config Kit — Setup Script (Windows)
# Usage: .\setup.ps1 -TargetDir "C:\path\to\my-project"
# If no target directory is specified, uses current directory.

param(
    [string]$TargetDir = "."
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🪐 Antigravity Config Kit — Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Target: $TargetDir"
Write-Host ""

# Create directories
$dirs = @(
    "$TargetDir\.agent\skills\ux-ui-architect-2026",
    "$TargetDir\.agent\workflows",
    "$TargetDir\.antigravity",
    "$TargetDir\specs"
)

foreach ($dir in $dirs) {
    New-Item -Path $dir -ItemType Directory -Force | Out-Null
}

# Copy skill
Copy-Item "$ScriptDir\.agent\skills\ux-ui-architect-2026\SKILL.md" `
          "$TargetDir\.agent\skills\ux-ui-architect-2026\SKILL.md" -Force
Write-Host "✅ Skill: ux-ui-architect-2026" -ForegroundColor Green

# Copy workflows
Get-ChildItem "$ScriptDir\.agent\workflows\*.md" | ForEach-Object {
    Copy-Item $_.FullName "$TargetDir\.agent\workflows\" -Force
    Write-Host "✅ Workflow: $($_.BaseName)" -ForegroundColor Green
}

# Copy rules
Copy-Item "$ScriptDir\.antigravity\rules.md" "$TargetDir\.antigravity\rules.md" -Force
Write-Host "✅ Rules: rules.md" -ForegroundColor Green

# Copy templates
if (Test-Path "$ScriptDir\templates") {
    Copy-Item -Path "$ScriptDir\templates" -Destination "$TargetDir\templates" -Recurse -Force
    Write-Host "✅ Templates copied" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Yellow
Write-Host "   Open $TargetDir in your editor with Antigravity."
Write-Host "   Use /vibe-proposal to start planning your first feature."
