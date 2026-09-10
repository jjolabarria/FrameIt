using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FrameIt.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionRoundContext : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SessionStartedAtUtc",
                table: "WorkshopSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TracksSessionTime",
                table: "WorkshopSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RoundContextJson",
                table: "ParticipantQuestions",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SessionStartedAtUtc",
                table: "WorkshopSessions");

            migrationBuilder.DropColumn(
                name: "TracksSessionTime",
                table: "WorkshopSessions");

            migrationBuilder.DropColumn(
                name: "RoundContextJson",
                table: "ParticipantQuestions");
        }
    }
}
