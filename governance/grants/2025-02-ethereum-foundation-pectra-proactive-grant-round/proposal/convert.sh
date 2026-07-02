#!/bin/bash

docker run --rm -v "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd):/proposal:rw" ubuntu:latest bash -c 'export DEBIAN_FRONTEND=noninteractive; apt-get update && apt-get install -y texlive-latex-base pandoc texlive-fonts-recommended texlive-latex-extra texlive-luatex fonts-dejavu && pandoc --pdf-engine lualatex -V mainfont='DejaVu Sans' -V colorlinks=true -V linkcolor=blue -V urlcolor=blue -V toccolor=gray -H /proposal/style.sty -o /proposal/proposal.pdf < /proposal/proposal.md'
