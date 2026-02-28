# Setup Ollama for Windows
# Run this script in PowerShell to set up Ollama and required models

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Ollama Setup for Campus Smart Guide" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Ollama is installed
Write-Host "Checking Ollama installation..." -ForegroundColor Yellow
$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue

if (-not $ollamaPath) {
    Write-Host "Ollama is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Ollama first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://ollama.ai" -ForegroundColor White
    Write-Host "   OR" -ForegroundColor White
    Write-Host "2. Run: winget install Ollama.Ollama" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Ollama is installed" -ForegroundColor Green
Write-Host ""

# Check if Ollama is running
Write-Host "Checking if Ollama is running..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction Stop
    Write-Host "✓ Ollama is running" -ForegroundColor Green
} catch {
    Write-Host "Ollama is not running. Starting Ollama..." -ForegroundColor Yellow
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Write-Host "Waiting for Ollama to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction Stop
        Write-Host "✓ Ollama started successfully" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to start Ollama. Please start it manually: ollama serve" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Pull required models
Write-Host "Pulling required models..." -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Pulling llama3.2 (main LLM model, ~2GB)..." -ForegroundColor Cyan
ollama pull llama3.2

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ llama3.2 installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to pull llama3.2" -ForegroundColor Red
}

Write-Host ""

Write-Host "2. Pulling nomic-embed-text (embedding model, ~274MB)..." -ForegroundColor Cyan
ollama pull nomic-embed-text

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ nomic-embed-text installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to pull nomic-embed-text" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# List installed models
Write-Host "Installed models:" -ForegroundColor Yellow
ollama list

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create or update .env.local in your project root:" -ForegroundColor White
Write-Host "   VITE_USE_LOCAL_AI=true" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run the setup verification:" -ForegroundColor White
Write-Host "   npm run ai:setup" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start your development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "For more information, see ai-model/README.md" -ForegroundColor Yellow
Write-Host ""
