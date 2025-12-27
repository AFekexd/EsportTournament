Dim shell, command
Set shell = CreateObject("WScript.Shell")

' Path to the PowerShell script - ADJUST THIS TO YOUR ACTUAL PATH
' Current relative path assumption: watchdog.ps1 is in the same folder
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""d:\Codes\EsportTournament\Desktop\watchdog.ps1"""

shell.Run command, 0, False
