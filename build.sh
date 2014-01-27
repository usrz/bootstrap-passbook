#!/bin/sh

lessc -x passbook.less > passbook.min.css
uglifyjs passbook.js   > passbook.min.js
