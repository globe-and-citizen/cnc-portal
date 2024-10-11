#!/bin/bash
git branch --merged | grep -v "^\*\|develop\|main" | xargs git branch -d
