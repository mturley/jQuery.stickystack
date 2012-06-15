#!/bin/sh
docco jQuery.stickystack.js
jsmin jQuery.stickystack.js > jQuery.stickystack.min.js
echo "jsmin: jQuery.stickystack.js -> jQuery.stickystack.min.js"
echo "Updated docs and minified script from source!"
