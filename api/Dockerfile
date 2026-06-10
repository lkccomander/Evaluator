# syntax=docker/dockerfile:1
FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/server

FROM alpine:3.21
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /api /api

EXPOSE 8080
CMD ["/api"]
