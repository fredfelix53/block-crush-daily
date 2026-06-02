#!/bin/bash
# Script to copy game files into android assets
cp -r game/* android/app/src/main/assets/game/
echo "Game files synced to android assets."
