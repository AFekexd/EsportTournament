Dim shell, command
Set shell = CreateObject("WScript.Shell")

Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Path to the PowerShell script (Assume it is in the same folder)
psPath = fso.BuildPath(currentDir, "watchdog.ps1")

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psPath & """"

shell.Run command, 0, False
