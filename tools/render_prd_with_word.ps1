$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path -LiteralPath 'docs\Motionly_AI_PRD_v1_3_Review_Copy.docx').Path
$outputDir = Join-Path (Resolve-Path -LiteralPath '.').Path 'tools\prd_render'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$pdfPath = Join-Path $outputDir 'Motionly_AI_PRD_v1_3_Review_Copy.pdf'

Write-Output 'Starting Word'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.Options.SaveNormalPrompt = $false
try {
    Write-Output 'Opening document'
    $document = $word.Documents.Open($inputPath, $false, $true)
    try {
        Write-Output 'Saving PDF'
        $document.SaveAs2($pdfPath, 17)
        Write-Output 'PDF export completed'
    }
    finally {
        Write-Output 'Closing document'
        $document.Close($false)
    }
}
finally {
    Write-Output 'Closing Word'
    $word.Quit()
}

Write-Output $pdfPath
