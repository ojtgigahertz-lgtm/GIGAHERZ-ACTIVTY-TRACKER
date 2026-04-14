@echo off
cd /d C:\Users\Lenovo\Desktop\GIGAHERZ-ACTIVTY-TRACKER

echo Running auto commit...

git add .

git commit -m "auto update %date% %time%"

git push origin master

echo.
echo ==========================
echo PUSH COMPLETE 🚀
echo ==========================
pause