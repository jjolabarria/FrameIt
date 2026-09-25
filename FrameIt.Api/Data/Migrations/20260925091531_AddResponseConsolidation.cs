using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FrameIt.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddResponseConsolidation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResponseConsolidations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionQuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    DraftJson = table.Column<string>(type: "jsonb", nullable: false),
                    PublishedJson = table.Column<string>(type: "jsonb", nullable: false),
                    SourceFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SourceCount = table.Column<int>(type: "integer", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    ShowConsolidated = table.Column<bool>(type: "boolean", nullable: false),
                    Error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    NextAttemptAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponseConsolidations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponseConsolidations_SessionQuestion_SessionQuestionId",
                        column: x => x.SessionQuestionId,
                        principalTable: "SessionQuestion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResponseConsolidations_SessionQuestionId",
                table: "ResponseConsolidations",
                column: "SessionQuestionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResponseConsolidations");
        }
    }
}
