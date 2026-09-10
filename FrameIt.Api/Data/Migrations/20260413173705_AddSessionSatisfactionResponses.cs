using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FrameIt.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionSatisfactionResponses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SatisfactionSurveyOpen",
                table: "WorkshopSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "SessionSatisfactionResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkshopSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionSatisfactionResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionSatisfactionResponses_SessionParticipants_SessionPar~",
                        column: x => x.SessionParticipantId,
                        principalTable: "SessionParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionSatisfactionResponses_WorkshopSessions_WorkshopSessi~",
                        column: x => x.WorkshopSessionId,
                        principalTable: "WorkshopSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SessionSatisfactionResponses_SessionParticipantId",
                table: "SessionSatisfactionResponses",
                column: "SessionParticipantId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionSatisfactionResponses_WorkshopSessionId_SessionParti~",
                table: "SessionSatisfactionResponses",
                columns: new[] { "WorkshopSessionId", "SessionParticipantId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionSatisfactionResponses");

            migrationBuilder.DropColumn(
                name: "SatisfactionSurveyOpen",
                table: "WorkshopSessions");
        }
    }
}
