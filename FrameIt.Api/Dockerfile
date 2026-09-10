FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY FrameIt.Api/FrameIt.Api.csproj FrameIt.Api/
COPY FrameIt.Contracts/FrameIt.Contracts.csproj FrameIt.Contracts/
RUN dotnet restore FrameIt.Api/FrameIt.Api.csproj
COPY frontend/public/favicon.svg frontend/public/favicon.svg
COPY FrameIt.Api/ FrameIt.Api/
COPY FrameIt.Contracts/ FrameIt.Contracts/
RUN dotnet publish FrameIt.Api/FrameIt.Api.csproj -c Release --no-restore -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl fontconfig fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "FrameIt.Api.dll"]
