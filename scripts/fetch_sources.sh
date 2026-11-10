#!/bin/sh
# Download the free/open source data into data/raw (re-run to refresh).
set -e
cd "$(dirname "$0")/../data/raw"
B=${1:-Gen}
curl -sL -o "$B.xml" "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/$B.xml"
curl -sL -o HebrewStrong.xml https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml
[ -d hin2017 ] || { curl -sL -o hin2017_usfm.zip https://ebible.org/Scriptures/hin2017_usfm.zip && unzip -q -o hin2017_usfm.zip -d hin2017; }
echo "ok: $B.xml, HebrewStrong.xml, hin2017/"
