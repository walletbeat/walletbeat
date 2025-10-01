FROM docker.io/library/node:trixie-slim

# https://github.com/eternalsafe/wallet/commits/eternalsafe/
ENV ETERNAL_SAFE_COMMIT='1b3b97c8719f7dfe1aa6a9a1a12d57414baed6ef'
ENV ETERNAL_SAFE_GIT_URL='https://github.com/eternalsafe/wallet'

RUN    export DEBIAN_FRONTEND=noninteractive; \
       apt update \
    && apt upgrade -y \
    && apt install -y  \
          bash \
          build-essential \
          ca-certificates \
          coreutils \
          git \
          jq \
          python3 \
          tor \
          torsocks \
          wget \
    && npm install -g local-cors-proxy \
    && git clone "$ETERNAL_SAFE_GIT_URL" /eternalsafe \
    && cd /eternalsafe \
    && git reset --hard "$ETERNAL_SAFE_COMMIT" \
    && yarn install

COPY container-run.sh container-run-wrapped.sh torrc /
RUN chmod 555 /container-run.sh /container-run-wrapped.sh
ENTRYPOINT ["/container-run.sh"]
