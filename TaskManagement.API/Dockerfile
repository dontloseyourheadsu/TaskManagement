FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files and restore as distinct layers
COPY ["TaskManagement.API/TaskManagement.API.csproj", "TaskManagement.API/"]
COPY ["TaskManagement.Core/TaskManagement.Core.csproj", "TaskManagement.Core/"]
RUN dotnet restore "TaskManagement.API/TaskManagement.API.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/TaskManagement.API"
RUN dotnet build "TaskManagement.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TaskManagement.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 80

ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Development
ENV DOTNET_RUNNING_IN_CONTAINER=true

ENTRYPOINT ["dotnet", "TaskManagement.API.dll"]
