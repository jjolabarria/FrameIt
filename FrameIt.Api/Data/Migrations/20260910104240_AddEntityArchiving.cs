using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FrameIt.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEntityArchiving : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Clients_ClientId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkshopSessions_Clients_ClientId",
                table: "WorkshopSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkshopSessions_DynamicTemplates_TemplateId",
                table: "WorkshopSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkshopSessions_Projects_ProjectId",
                table: "WorkshopSessions");

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "WorkshopSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Projects",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "DynamicTemplates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Clients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "IsArchived",
                value: false);

            migrationBuilder.UpdateData(
                table: "DynamicTemplates",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "IsArchived",
                value: false);

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "IsArchived",
                value: false);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Clients_ClientId",
                table: "Projects",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkshopSessions_Clients_ClientId",
                table: "WorkshopSessions",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkshopSessions_DynamicTemplates_TemplateId",
                table: "WorkshopSessions",
                column: "TemplateId",
                principalTable: "DynamicTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkshopSessions_Projects_ProjectId",
                table: "WorkshopSessions",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Clients_ClientId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkshopSessions_Clients_ClientId",
                table: "WorkshopSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkshopSessions_DynamicTemplates_TemplateId",
                table: "WorkshopSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkshopSessions_Projects_ProjectId",
                table: "WorkshopSessions");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "WorkshopSessions");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "DynamicTemplates");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Clients");

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Clients_ClientId",
                table: "Projects",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkshopSessions_Clients_ClientId",
                table: "WorkshopSessions",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkshopSessions_DynamicTemplates_TemplateId",
                table: "WorkshopSessions",
                column: "TemplateId",
                principalTable: "DynamicTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkshopSessions_Projects_ProjectId",
                table: "WorkshopSessions",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
