# Home Assistant builds this on the device, so the source is downloaded from GitHub at ATLAS_REF.
FROM golang:1.26-alpine AS build
ARG ATLAS_REF=main
ADD https://github.com/BanterBoy/homelab-atlas/archive/refs/heads/${ATLAS_REF}.tar.gz /tmp/atlas.tar.gz
WORKDIR /src
RUN tar -xzf /tmp/atlas.tar.gz --strip-components=1 \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/atlas ./app \
 && mkdir -p /out/licenses && cp LICENSE docs/THIRD_PARTY_NOTICES.md /out/licenses/

FROM alpine:3.22
RUN apk add --no-cache ca-certificates jq nmap nmap-nselibs nmap-scripts
COPY --from=build /out/atlas /usr/local/bin/atlas
COPY --from=build /out/licenses/ /usr/share/licenses/homelab-atlas/
COPY run.sh /run.sh
RUN chmod a+x /run.sh
ENV HOST=0.0.0.0 PORT=8080 ATLAS_DATA_DIR=/data ATLAS_INGRESS_PROXY=172.30.32.2
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["atlas","healthcheck"]
CMD ["/run.sh"]
