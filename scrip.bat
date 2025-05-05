@echo off
"C:\Program Files\Git\git-bash.exe" -c "git branch --merged | grep -v '^\*\|develop\|main' | xargs -r git branch -d"