using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FrameIt.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationsAndFacilitatorInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DynamicTemplates_Key",
                table: "DynamicTemplates");

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "DynamicTemplates",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "Clients",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<bool>(
                name: "IsPlatformAdmin",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "AspNetUsers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FacilitatorInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AcceptedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FacilitatorInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FacilitatorInvitations_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_FacilitatorInvitations_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "OrganizationId",
                value: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));

            migrationBuilder.UpdateData(
                table: "DynamicTemplates",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "OrganizationId",
                value: null);

            migrationBuilder.InsertData(
                table: "Organizations",
                columns: new[] { "Id", "Name" },
                values: new object[] { new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), "OLATIC" });

            // The preceding version only allowed the single bootstrap account.
            // Keep that account administrative and retain all existing work in OLATIC.
            migrationBuilder.Sql("""
                UPDATE "AspNetUsers" SET "IsPlatformAdmin" = TRUE;
                UPDATE "Clients" SET "OrganizationId" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
                UPDATE "DynamicTemplates" SET "OrganizationId" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE NOT "IsBuiltIn";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_DynamicTemplates_OrganizationId_Key",
                table: "DynamicTemplates",
                columns: new[] { "OrganizationId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_OrganizationId",
                table: "Clients",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_OrganizationId",
                table: "AspNetUsers",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_FacilitatorInvitations_ExpiresAtUtc",
                table: "FacilitatorInvitations",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_FacilitatorInvitations_OrganizationId",
                table: "FacilitatorInvitations",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_FacilitatorInvitations_TokenHash",
                table: "FacilitatorInvitations",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FacilitatorInvitations_UserId",
                table: "FacilitatorInvitations",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Organizations_OrganizationId",
                table: "AspNetUsers",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Organizations_OrganizationId",
                table: "Clients",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DynamicTemplates_Organizations_OrganizationId",
                table: "DynamicTemplates",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Organizations_OrganizationId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Organizations_OrganizationId",
                table: "Clients");

            migrationBuilder.DropForeignKey(
                name: "FK_DynamicTemplates_Organizations_OrganizationId",
                table: "DynamicTemplates");

            migrationBuilder.DropTable(
                name: "FacilitatorInvitations");

            migrationBuilder.DropTable(
                name: "Organizations");

            migrationBuilder.DropIndex(
                name: "IX_DynamicTemplates_OrganizationId_Key",
                table: "DynamicTemplates");

            migrationBuilder.DropIndex(
                name: "IX_Clients_OrganizationId",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_OrganizationId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "DynamicTemplates");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "IsPlatformAdmin",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "AspNetUsers");

            migrationBuilder.CreateIndex(
                name: "IX_DynamicTemplates_Key",
                table: "DynamicTemplates",
                column: "Key",
                unique: true);
        }
    }
}
