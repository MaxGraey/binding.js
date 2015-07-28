#!/bin/sh
echo "Start generate documentation..."
jsdoc ../binding.js -c ./config.json
echo "complete!"