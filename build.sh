#!/bin/bash

[ -d ".build/" ] && rm -r .build/

mkdir .build/

tsc

cp dist/extension.js .build/
cp src/metadata.json .build/
cp -R po .build/

cd .build

gnome-extensions pack --podir=po --out-dir=../ --force

cd ..

rm -r .build/