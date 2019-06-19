rm package.zip
cp js/config.prod.js js/config.js
zip -r package.zip \
    manifest.json \
    *.html \
    build/* \
    js/deps/* \
    js/*.js \
    js/third-party/*.js \
    icons/icon-*.png \
    css/*.css \
    css/*.woff2
