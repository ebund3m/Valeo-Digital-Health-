# Valeo Digital Health Platform — Folder Setup Script
# Run this from inside your valeo-digital-health project folder

$folders = @(
  "src/app/(auth)/login",
  "src/app/(auth)/register",
  "src/app/(auth)/forgot-password",
  "src/app/(dashboard)/client/appointments",
  "src/app/(dashboard)/client/assessments",
  "src/app/(dashboard)/client/messages",
  "src/app/(dashboard)/client/payments",
  "src/app/(dashboard)/client/profile",
  "src/app/(dashboard)/doctor/clients",
  "src/app/(dashboard)/doctor/schedule",
  "src/app/(dashboard)/doctor/assessments",
  "src/app/(dashboard)/doctor/notes",
  "src/app/(dashboard)/doctor/analytics",
  "src/app/(dashboard)/admin/users",
  "src/app/(dashboard)/admin/financials",
  "src/app/(dashboard)/admin/analytics",
  "src/app/(dashboard)/admin/settings",
  "src/app/api/wipay/create-payment",
  "src/app/api/wipay/webhook",
  "src/app/api/appointments",
  "src/app/api/assessments",
  "src/app/api/ai/analyze",
  "src/app/api/set-role",
  "src/components/ui",
  "src/components/layout",
  "src/components/forms",
  "src/components/dashboards",
  "src/components/shared",
  "src/lib",
  "src/hooks",
  "src/context",
  "src/types"
)

foreach ($folder in $folders) {
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  Write-Host "Created: $folder" -ForegroundColor Green
}

Write-Host ""
Write-Host "All folders created successfully!" -ForegroundColor Cyan
