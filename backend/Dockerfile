# Build stage - context must be project root (.)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files for restore
COPY backend/MusicasIgreja.Api.csproj ./backend/
COPY core/backend/src/Core.Auth/Core.Auth.csproj ./core/backend/src/Core.Auth/
COPY core/backend/src/Core.Common/Core.Common.csproj ./core/backend/src/Core.Common/
COPY core/backend/src/Core.FileManagement/Core.FileManagement.csproj ./core/backend/src/Core.FileManagement/
COPY core/backend/src/Core.Infrastructure/Core.Infrastructure.csproj ./core/backend/src/Core.Infrastructure/

WORKDIR /src/backend
RUN dotnet restore

# Copy all source
WORKDIR /src
COPY backend/ ./backend/
COPY core/backend/src/ ./core/backend/src/

WORKDIR /src/backend
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

RUN mkdir -p /app/data /app/organized

EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "MusicasIgreja.Api.dll"]
