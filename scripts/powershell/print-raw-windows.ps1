param(
  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [Parameter(Mandatory = $true)]
  [string]$Base64Data
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFO
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFO di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
}
"@

try {
  $bytes = [Convert]::FromBase64String($Base64Data)
  $handle = [IntPtr]::Zero

  if (-not [RawPrinterHelper]::OpenPrinter($PrinterName, [ref]$handle, [IntPtr]::Zero)) {
    throw "Nao foi possivel abrir a impressora '$PrinterName'"
  }

  try {
    $docInfo = New-Object RawPrinterHelper+DOCINFO
    $docInfo.pDocName = 'Fomy Print Job'
    $docInfo.pDataType = 'RAW'

    if (-not [RawPrinterHelper]::StartDocPrinter($handle, 1, $docInfo)) {
      throw "Nao foi possivel iniciar o trabalho de impressao"
    }

    try {
      if (-not [RawPrinterHelper]::StartPagePrinter($handle)) {
        throw "Nao foi possivel iniciar a pagina de impressao"
      }

      try {
        $unmanaged = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
        try {
          [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $unmanaged, $bytes.Length)
          $written = 0
          if (-not [RawPrinterHelper]::WritePrinter($handle, $unmanaged, $bytes.Length, [ref]$written)) {
            throw "Falha ao enviar dados para a impressora"
          }
        }
        finally {
          [System.Runtime.InteropServices.Marshal]::FreeHGlobal($unmanaged)
        }
      }
      finally {
        [void][RawPrinterHelper]::EndPagePrinter($handle)
      }
    }
    finally {
      [void][RawPrinterHelper]::EndDocPrinter($handle)
    }
  }
  finally {
    [void][RawPrinterHelper]::ClosePrinter($handle)
  }

  @{ ok = $true } | ConvertTo-Json -Compress
}
catch {
  @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
  exit 1
}
