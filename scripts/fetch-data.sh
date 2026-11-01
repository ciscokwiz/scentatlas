#!/usr/bin/env bash
# Downloads the open perfume datasets into data-raw/ and verifies them.
#
# Security: every file is pinned to an exact upstream commit and checked against a
# SHA-256 hash, so a changed or tampered upstream file is rejected instead of being
# built into the site. Nothing from these repositories is ever executed: the build
# only parses the files as CSV text (see scripts/build_data.py).
#
# Licences differ per source; read DATA.md before any public or commercial launch.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data-raw
GH=https://raw.githubusercontent.com

fetch() { # url  output  sha256
  local tmp; tmp=$(mktemp)
  curl -sSfL --max-time 300 "$1" -o "$tmp"
  echo "$3  $tmp" | sha256sum -c --quiet - || { echo "CHECKSUM MISMATCH: $1" >&2; rm -f "$tmp"; exit 1; }
  mv "$tmp" "data-raw/$2"
  echo "  ok  $2"
}

# ~38k Fragrantica perfumes, note pyramids, ordered accords (scraped ~2017)
fetch "$GH/ThatCoryGirl/Project4-Perfume/HEAD/Resources/perfume_database.csv" perfume_database.csv \
  a1373ad87fb56a74cee1626f4a072fc1aee7dea2aecacc3e6158c85ff45ea581
# ~480 perfumes with accord strengths and labelled longevity/sillage votes
fetch "$GH/sir-omoreno/perfume_designer_app/HEAD/perfume_data_combined.csv" perfume_data_combined.csv \
  e27b748e30c58a73ab487fbba89811036bd9a34a34c8c63d5309eda259ee644f
# 33k Fragrantica perfumes released up to 2026: weighted notes and accords, longevity/sillage averages
fetch "$GH/aStyxxx/dataset_Fragrantica_perfumes/95ae83c537b6c43c656ef88f530b6f1a28205c04/perfumes_actual.csv" fragrantica_recent.csv \
  b928d9562764c329c7e456d9b98bd35d02893782d85358e77b63032aa44c7268
# 70k Fragrantica perfumes up to 2024 (mirror of the Kaggle "Fragrantica.com Fragrance Dataset")
fetch "$GH/leev75/Fragrance-Analytics-Dashboard-/9a4a0f8069c0434efc320f7fbb4f5c410de52235/fra_perfumes.csv" fragrantica_2024.csv \
  4e5a760e368f949095099c66e360b9dea11b1d0818f80c73eb4c3b7cd654e5ca
# 59k Parfumo perfumes up to 2024 (TidyTuesday, 10 Dec 2024)
fetch "$GH/rfordatascience/tidytuesday/main/data/2024/2024-12-10/parfumo_data_clean.csv" parfumo_2024.csv \
  94956339772a02c0355ff3f9de4f15cd3f078a124b2829dde30bcee83446cc7d
# Scento verified perfume database, CC BY 4.0 (descriptions, seasons) + raw materials
fetch "$GH/Scento-com/perfume-dataset/58da85556a4bb42a7d56279d66fbec4dbf42cc4a/perfumes.csv" scento_perfumes.csv \
  726a1a2af8aef42d801b424b086415b50f6ca33dd2189d6fbd2bcbcb442bf8e5
fetch "$GH/Scento-com/perfume-dataset/58da85556a4bb42a7d56279d66fbec4dbf42cc4a/materials.csv" scento_materials.csv \
  9b342c803f0b370e96106a4dff0ae56f1f5340bdc82c6e32d180473a9f31764c

echo "Raw data in data-raw/. Next: npm run data:build"
