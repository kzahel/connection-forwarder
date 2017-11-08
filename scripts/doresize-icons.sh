for sz in 512 128 96 64 48 38 32 19 16; do convert -resize $szx$sz app/icons/icon_orig.png app/icons/icon-$sz.png; done
