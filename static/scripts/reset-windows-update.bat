@echo off
:: ============================================================
:: Reset Windows Update components
:: Run this file as Administrator (right-click -> Run as administrator)
:: ============================================================

echo.
echo Stopping Windows Update related services...
net stop wuauserv
net stop cryptSvc
net stop bits
net stop msiserver

echo.
echo Renaming SoftwareDistribution and Catroot2 folders...
if exist "%windir%\SoftwareDistribution" (
    ren "%windir%\SoftwareDistribution" "SoftwareDistribution.old"
)
if exist "%windir%\System32\catroot2" (
    ren "%windir%\System32\catroot2" "catroot2.old"
)

echo.
echo Resetting BITS and Windows Update services security descriptors...
sc.exe sdset bits D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;PU)
sc.exe sdset wuauserv D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;PU)

echo.
echo Resetting Winsock and network settings related to updates...
netsh winsock reset
netsh winhttp reset proxy

echo.
echo Re-registering Windows Update related DLLs...
cd /d %windir%\system32
regsvr32.exe /s atl.dll
regsvr32.exe /s urlmon.dll
regsvr32.exe /s mshtml.dll
regsvr32.exe /s shdocvw.dll
regsvr32.exe /s browseui.dll
regsvr32.exe /s jscript.dll
regsvr32.exe /s vbscript.dll
regsvr32.exe /s scrrun.dll
regsvr32.exe /s msxml.dll
regsvr32.exe /s msxml3.dll
regsvr32.exe /s msxml6.dll
regsvr32.exe /s actxprxy.dll
regsvr32.exe /s softpub.dll
regsvr32.exe /s wintrust.dll
regsvr32.exe /s dssenh.dll
regsvr32.exe /s rsaenh.dll
regsvr32.exe /s gpkcsp.dll
regsvr32.exe /s sccbase.dll
regsvr32.exe /s slbcsp.dll
regsvr32.exe /s cryptdlg.dll
regsvr32.exe /s oleaut32.dll
regsvr32.exe /s ole32.dll
regsvr32.exe /s shell32.dll
regsvr32.exe /s initpki.dll
regsvr32.exe /s wuapi.dll
regsvr32.exe /s wuaueng.dll
regsvr32.exe /s wuaueng1.dll
regsvr32.exe /s wucltui.dll
regsvr32.exe /s wups.dll
regsvr32.exe /s wups2.dll
regsvr32.exe /s wuweb.dll
regsvr32.exe /s qmgr.dll
regsvr32.exe /s qmgrprxy.dll
regsvr32.exe /s wucltux.dll
regsvr32.exe /s muweb.dll
regsvr32.exe /s wuwebv.dll

echo.
echo Starting Windows Update related services again...
net start wuauserv
net start cryptSvc
net start bits
net start msiserver

echo.
echo ============================================================
echo Done. Please reboot your PC, then try Windows Update again.
echo (Settings ^> Windows Update ^> Check for updates)
echo ============================================================
echo.
pause
