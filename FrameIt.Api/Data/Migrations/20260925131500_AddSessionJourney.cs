using System;
using FrameIt.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FrameIt.Api.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260925131500_AddSessionJourney")]
public sealed class AddSessionJourney : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(name: "JourneyPositionMs", table: "WorkshopSessions", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<string>(name: "JourneyPlaybackState", table: "WorkshopSessions", type: "text", nullable: false, defaultValue: "Stopped");
        migrationBuilder.AddColumn<int>(name: "JourneyRevision", table: "WorkshopSessions", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<DateTimeOffset>(name: "JourneyStartedAtUtc", table: "WorkshopSessions", type: "timestamp with time zone", nullable: true);
        migrationBuilder.CreateTable(
            name: "SessionJourneyEvents",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                WorkshopSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                SessionSectionId = table.Column<Guid>(type: "uuid", nullable: true),
                SessionQuestionId = table.Column<Guid>(type: "uuid", nullable: true),
                EventType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                MetadataJson = table.Column<string>(type: "jsonb", nullable: false),
                OccurredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SessionJourneyEvents", x => x.Id);
                table.ForeignKey("FK_SessionJourneyEvents_WorkshopSessions_WorkshopSessionId", x => x.WorkshopSessionId, "WorkshopSessions", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(name: "IX_SessionJourneyEvents_WorkshopSessionId_OccurredAtUtc", table: "SessionJourneyEvents", columns: new[] { "WorkshopSessionId", "OccurredAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SessionJourneyEvents");
        migrationBuilder.DropColumn(name: "JourneyPositionMs", table: "WorkshopSessions");
        migrationBuilder.DropColumn(name: "JourneyPlaybackState", table: "WorkshopSessions");
        migrationBuilder.DropColumn(name: "JourneyRevision", table: "WorkshopSessions");
        migrationBuilder.DropColumn(name: "JourneyStartedAtUtc", table: "WorkshopSessions");
    }
}
