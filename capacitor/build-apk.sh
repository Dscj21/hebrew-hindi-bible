#!/usr/bin/env bash
# Build Android APKs (debug + self-signed release) into ../dist. Needs JDK 21 (~/jdk21), Android SDK (~/android-sdk), Node >= 22.
set -euo pipefail
cd "$(dirname "$0")"
export JAVA_HOME=${JAVA_HOME:-$HOME/jdk21} ANDROID_HOME=${ANDROID_HOME:-$HOME/android-sdk}
export PATH=$JAVA_HOME/bin:$PATH
[ -d node_modules ] || npm ci
NODE=node; [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || { npm i --no-save node@22 >/dev/null; NODE=$(readlink -f node_modules/node/bin/node); }
node copy-www.js && "$NODE" node_modules/@capacitor/cli/bin/capacitor sync android
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew --no-daemon -q assembleDebug assembleRelease bundleRelease)
mkdir -p ../dist && cp android/app/build/outputs/apk/debug/app-debug.apk ../dist/hebrew-hindi-bible-debug.apk
KS=../.deploy/release.jks; BT=$(ls -d $ANDROID_HOME/build-tools/* | tail -1)
if [ -f "$KS" ]; then
  PW=$(grep ^password ../.deploy/keystore.properties | cut -d= -f2)
  "$BT/zipalign" -f -p 4 android/app/build/outputs/apk/release/app-release-unsigned.apk /tmp/hhb-aligned.apk
  "$BT/apksigner" sign --ks "$KS" --ks-pass pass:"$PW" --ks-key-alias hhb --out ../dist/hebrew-hindi-bible-release.apk /tmp/hhb-aligned.apk
  # Play Store bundle, signed with the same upload/release key
  HHB_PW="$PW" jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -storepass:env HHB_PW -keystore "$KS" -signedjar ../dist/hebrew-greek-hindi-bible-release.aab android/app/build/outputs/bundle/release/app-release.aab hhb >/dev/null
  rm -f ../dist/*.idsig
fi
ls -la ../dist
