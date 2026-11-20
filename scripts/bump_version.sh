#!/bin/sh
# Stamp a new ?v= on every local asset in index.html so browsers load fresh files after a deploy.
cd "$(dirname "$0")/.." && V=$(date +%Y%m%d%H%M) && sed -E -i '' "s#(src|href)=\"((js|css|data)/[^\"?]+)(\?v=[0-9]+)?\"#\1=\"\2?v=$V\"#g" index.html && echo "assets stamped v=$V"
