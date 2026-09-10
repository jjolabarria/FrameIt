using Microsoft.EntityFrameworkCore;

namespace FrameIt.Api.Data;

public static class DbSchemaPatcher
{
    public static async Task ApplyAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE "WorkshopSessions" ADD COLUMN IF NOT EXISTS "RoundOpen" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE "WorkshopSessions" ADD COLUMN IF NOT EXISTS "ResultsVisible" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE "WorkshopSessions" ADD COLUMN IF NOT EXISTS "SatisfactionSurveyOpen" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE "WorkshopSessions" ADD COLUMN IF NOT EXISTS "RoundOpenedAtUtc" timestamp with time zone NULL;
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS "ParticipantQuestions" (
                "Id" uuid NOT NULL,
                "WorkshopSessionId" uuid NOT NULL,
                "SessionParticipantId" uuid NOT NULL,
                "Question" character varying(2000) NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_ParticipantQuestions" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_ParticipantQuestions_SessionParticipants_SessionParticipantId"
                    FOREIGN KEY ("SessionParticipantId") REFERENCES "SessionParticipants" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_ParticipantQuestions_WorkshopSessions_WorkshopSessionId"
                    FOREIGN KEY ("WorkshopSessionId") REFERENCES "WorkshopSessions" ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_ParticipantQuestions_SessionParticipantId"
                ON "ParticipantQuestions" ("SessionParticipantId");
            CREATE INDEX IF NOT EXISTS "IX_ParticipantQuestions_WorkshopSessionId"
                ON "ParticipantQuestions" ("WorkshopSessionId");
            ALTER TABLE "WorkshopSessions" ADD COLUMN IF NOT EXISTS "SessionStartedAtUtc" timestamp with time zone NULL;
            ALTER TABLE "WorkshopSessions" ADD COLUMN IF NOT EXISTS "TracksSessionTime" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE "ParticipantQuestions" ADD COLUMN IF NOT EXISTS "RoundContextJson" jsonb NULL;
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS "SessionSatisfactionResponses" (
                "Id" uuid NOT NULL,
                "WorkshopSessionId" uuid NOT NULL,
                "SessionParticipantId" uuid NOT NULL,
                "Rating" integer NOT NULL,
                "Comment" character varying(2000) NOT NULL,
                "SubmittedAtUtc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_SessionSatisfactionResponses" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_SessionSatisfactionResponses_SessionParticipants_SessionParticipantId"
                    FOREIGN KEY ("SessionParticipantId") REFERENCES "SessionParticipants" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_SessionSatisfactionResponses_WorkshopSessions_WorkshopSessionId"
                    FOREIGN KEY ("WorkshopSessionId") REFERENCES "WorkshopSessions" ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_SessionSatisfactionResponses_SessionParticipantId"
                ON "SessionSatisfactionResponses" ("SessionParticipantId");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_SessionSatisfactionResponses_WorkshopSessionId_SessionParticipantId"
                ON "SessionSatisfactionResponses" ("WorkshopSessionId", "SessionParticipantId");
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS "SessionAttachments" (
                "Id" uuid NOT NULL,
                "WorkshopSessionId" uuid NOT NULL,
                "SessionParticipantId" uuid NOT NULL,
                "FileName" character varying(260) NOT NULL,
                "ContentType" character varying(200) NOT NULL,
                "SizeBytes" bigint NOT NULL,
                "StorageKey" character varying(500) NOT NULL,
                "Url" character varying(2000) NOT NULL,
                "UploadedAtUtc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_SessionAttachments" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_SessionAttachments_SessionParticipants_SessionParticipantId"
                    FOREIGN KEY ("SessionParticipantId") REFERENCES "SessionParticipants" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_SessionAttachments_WorkshopSessions_WorkshopSessionId"
                    FOREIGN KEY ("WorkshopSessionId") REFERENCES "WorkshopSessions" ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_SessionAttachments_SessionParticipantId"
                ON "SessionAttachments" ("SessionParticipantId");
            CREATE INDEX IF NOT EXISTS "IX_SessionAttachments_WorkshopSessionId"
                ON "SessionAttachments" ("WorkshopSessionId");
            """,
            cancellationToken);
    }
}
