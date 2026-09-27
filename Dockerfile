# syntax=docker/dockerfile:1

# ---- Stage 1: build & publish ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar solo los .csproj primero para aprovechar la cache de capas en el restore
COPY backend/src/PollaMundialista.Api/PollaMundialista.Api.csproj backend/src/PollaMundialista.Api/
COPY backend/src/PollaMundialista.Domain/PollaMundialista.Domain.csproj backend/src/PollaMundialista.Domain/
COPY backend/src/PollaMundialista.Application/PollaMundialista.Application.csproj backend/src/PollaMundialista.Application/
COPY backend/src/PollaMundialista.Infrastructure/PollaMundialista.Infrastructure.csproj backend/src/PollaMundialista.Infrastructure/

RUN dotnet restore backend/src/PollaMundialista.Api/PollaMundialista.Api.csproj

# Copiar el resto del código fuente del backend y publicar
COPY backend/src/ backend/src/

RUN dotnet publish backend/src/PollaMundialista.Api/PollaMundialista.Api.csproj -c Release -o /app/publish --no-restore

# ---- Stage 2: runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# MatchSeedLoader busca docs/fixtures/matches-seed.json subiendo desde
# AppContext.BaseDirectory (/app en este contenedor) — EF Core necesita este
# archivo para construir el modelo (HasData) incluso cuando no hay migraciones
# pendientes, así que debe existir dentro de la imagen.
COPY docs/fixtures/matches-seed.json docs/fixtures/matches-seed.json

# Valor por defecto para correr localmente; Render sobrescribe ASPNETCORE_URLS
# en el dashboard apuntando a http://+:$PORT (Render inyecta PORT en runtime).
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "PollaMundialista.Api.dll"]
