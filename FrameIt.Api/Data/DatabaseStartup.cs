using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;

namespace FrameIt.Api.Data;

public static class DatabaseStartup
{
    public static async Task ApplyMigrationsAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        var hasHistoryTable = await HasTableAsync(db, "__EFMigrationsHistory", cancellationToken);

        if (!hasHistoryTable)
        {
            var hasExistingSchema = await HasAnyAppTablesAsync(db, cancellationToken);
            if (hasExistingSchema)
            {
                await DbSchemaPatcher.ApplyAsync(db, cancellationToken);
                await BaselineExistingDatabaseAsync(db, cancellationToken);
            }
        }

        await db.Database.MigrateAsync(cancellationToken);
    }

    private static async Task BaselineExistingDatabaseAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var createHistoryCommand = connection.CreateCommand();
            createHistoryCommand.CommandText =
                """
                CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                    "MigrationId" character varying(150) NOT NULL,
                    "ProductVersion" character varying(32) NOT NULL,
                    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
                );
                """;
            await createHistoryCommand.ExecuteNonQueryAsync(cancellationToken);

            var productVersion = typeof(Migration).Assembly.GetName().Version?.ToString() ?? "9.0.0";
            foreach (var migrationId in new[] { "20260413163740_InitialSchema", "20260413173705_AddSessionSatisfactionResponses", "20260909105953_AddQuestionRoundContext" })
            {
                await using var insertCommand = connection.CreateCommand();
                insertCommand.CommandText =
                    """
                    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                    VALUES (@migrationId, @productVersion)
                    ON CONFLICT ("MigrationId") DO NOTHING;
                    """;

                var migrationParameter = insertCommand.CreateParameter();
                migrationParameter.ParameterName = "@migrationId";
                migrationParameter.Value = migrationId;
                insertCommand.Parameters.Add(migrationParameter);

                var versionParameter = insertCommand.CreateParameter();
                versionParameter.ParameterName = "@productVersion";
                versionParameter.Value = productVersion;
                insertCommand.Parameters.Add(versionParameter);

                await insertCommand.ExecuteNonQueryAsync(cancellationToken);
            }
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> HasAnyAppTablesAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        foreach (var tableName in new[] { "Clients", "DynamicTemplates", "Projects", "WorkshopSessions" })
        {
            if (await HasTableAsync(db, tableName, cancellationToken))
            {
                return true;
            }
        }

        return false;
    }

    private static async Task<bool> HasTableAsync(AppDbContext db, string tableName, CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = @tableName
                );
                """;

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@tableName";
            parameter.Value = tableName;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is bool exists && exists;
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }
}
