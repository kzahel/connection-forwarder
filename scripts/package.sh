rm package.zip
cp js/config.prod.js js/config.js
zip -r package.zip manifest.json *.html js/*.js js/third-party/*.js icons/icon-*.png dist/*.js css/*.css
