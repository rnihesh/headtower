# syntax=docker/dockerfile:1

FROM golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /agent .
# Seed an empty state dir owned by the distroless nonroot uid (65532) so the
# runtime volume is writable without running as root.
RUN mkdir -p /seedstate

# nonroot variant runs as uid 65532, not root.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /agent /agent
# tsnet state (node identity/keys) persists here; a fresh volume inherits this
# nonroot ownership. An EXISTING root-owned state volume must be chowned once on
# upgrade (e.g. `docker run --rm -u 0 -v headtower-agent-state:/state busybox
# chown -R 65532:65532 /state`).
COPY --from=build --chown=65532:65532 /seedstate /state
ENV HEADTOWER_AGENT_STATE_DIR=/state
ENV HEADTOWER_AGENT_ADDR=:8410
EXPOSE 8410
VOLUME ["/state"]
ENTRYPOINT ["/agent"]
