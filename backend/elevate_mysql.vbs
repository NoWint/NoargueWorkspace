Set objShell = CreateObject("Shell.Application")
objShell.ShellExecute "cmd.exe", "/c echo UAC elevation test > C:\Users\HUAWEI\Desktop\test_uac.txt", "", "runas", 0
