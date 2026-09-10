using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FrameIt.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Industry = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DynamicTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Objective = table.Column<string>(type: "text", nullable: false),
                    Audience = table.Column<string>(type: "text", nullable: false),
                    FacilitatorGuidance = table.Column<string>(type: "text", nullable: true),
                    IsBuiltIn = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DynamicTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Projects_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TemplateSection",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DynamicTemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Objective = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateSection", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TemplateSection_DynamicTemplates_DynamicTemplateId",
                        column: x => x.DynamicTemplateId,
                        principalTable: "DynamicTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkshopSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AccessCode = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Phase = table.Column<int>(type: "integer", nullable: false),
                    RoundOpen = table.Column<bool>(type: "boolean", nullable: false),
                    ResultsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    RoundOpenedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ActiveSectionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActiveQuestionId = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkshopSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkshopSessions_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkshopSessions_DynamicTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "DynamicTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkshopSessions_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TemplateQuestion",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateSectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Prompt = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    OptionsJson = table.Column<string>(type: "jsonb", nullable: false),
                    SettingsJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateQuestion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TemplateQuestion_TemplateSection_TemplateSectionId",
                        column: x => x.TemplateSectionId,
                        principalTable: "TemplateSection",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SessionOutcome",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkshopSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Bucket = table.Column<string>(type: "text", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionOutcome", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionOutcome_WorkshopSessions_WorkshopSessionId",
                        column: x => x.WorkshopSessionId,
                        principalTable: "WorkshopSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SessionParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkshopSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false),
                    IsConnected = table.Column<bool>(type: "boolean", nullable: false),
                    JoinedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionParticipants_WorkshopSessions_WorkshopSessionId",
                        column: x => x.WorkshopSessionId,
                        principalTable: "WorkshopSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SessionSection",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkshopSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Objective = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionSection", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionSection_WorkshopSessions_WorkshopSessionId",
                        column: x => x.WorkshopSessionId,
                        principalTable: "WorkshopSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParticipantQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkshopSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Question = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParticipantQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParticipantQuestions_SessionParticipants_SessionParticipant~",
                        column: x => x.SessionParticipantId,
                        principalTable: "SessionParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParticipantQuestions_WorkshopSessions_WorkshopSessionId",
                        column: x => x.WorkshopSessionId,
                        principalTable: "WorkshopSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SessionAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkshopSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    UploadedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionAttachments_SessionParticipants_SessionParticipantId",
                        column: x => x.SessionParticipantId,
                        principalTable: "SessionParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionAttachments_WorkshopSessions_WorkshopSessionId",
                        column: x => x.WorkshopSessionId,
                        principalTable: "WorkshopSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SessionQuestion",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionSectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Prompt = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    OptionsJson = table.Column<string>(type: "jsonb", nullable: false),
                    SettingsJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionQuestion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionQuestion_SessionSection_SessionSectionId",
                        column: x => x.SessionSectionId,
                        principalTable: "SessionSection",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuestionResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionQuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionParticipantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionResponses_SessionParticipants_SessionParticipantId",
                        column: x => x.SessionParticipantId,
                        principalTable: "SessionParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QuestionResponses_SessionQuestion_SessionQuestionId",
                        column: x => x.SessionQuestionId,
                        principalTable: "SessionQuestion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Clients",
                columns: new[] { "Id", "Industry", "Name" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), "Consulting", "Contoso" });

            migrationBuilder.InsertData(
                table: "DynamicTemplates",
                columns: new[] { "Id", "Audience", "FacilitatorGuidance", "IsBuiltIn", "Key", "Objective", "Title", "UpdatedAtUtc" },
                values: new object[] { new Guid("33333333-3333-3333-3333-333333333333"), "Negocio + IT", "Mantén el foco en decisiones y aparca excepciones como pendientes.", true, "m365-governance-workshop", "Alinear decisiones de colaboración, permisos y acceso externo para un piloto de Microsoft 365.", "M365 Governance Discovery", new DateTimeOffset(new DateTime(2026, 4, 13, 15, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.InsertData(
                table: "Projects",
                columns: new[] { "Id", "ClientId", "Code", "Name" },
                values: new object[] { new Guid("22222222-2222-2222-2222-222222222222"), new Guid("11111111-1111-1111-1111-111111111111"), "M365-GOV", "M365 Governance Rollout" });

            migrationBuilder.InsertData(
                table: "TemplateSection",
                columns: new[] { "Id", "DynamicTemplateId", "Key", "Objective", "Order", "Title" },
                values: new object[,]
                {
                    { new Guid("44444444-4444-4444-4444-444444444444"), new Guid("33333333-3333-3333-3333-333333333333"), "current-state", "Capturar cómo trabaja hoy el equipo.", 1, "Mapa del trabajo real" },
                    { new Guid("55555555-5555-5555-5555-555555555555"), new Guid("33333333-3333-3333-3333-333333333333"), "governance", "Acordar lo que sí y no entra en el piloto.", 2, "Gobernanza y límites" }
                });

            migrationBuilder.InsertData(
                table: "TemplateQuestion",
                columns: new[] { "Id", "Key", "Kind", "OptionsJson", "Order", "Prompt", "SettingsJson", "TemplateSectionId", "Title" },
                values: new object[,]
                {
                    { new Guid("66666666-6666-6666-6666-666666666666"), "work-documents", 2, "[]", 1, "¿Qué tipo de documentos usáis y cuáles cambian a menudo?", "{\"maxItems\":\"6\"}", new Guid("44444444-4444-4444-4444-444444444444"), "Documentos actuales" },
                    { new Guid("77777777-7777-7777-7777-777777777777"), "sharing-pain", 1, "[]", 2, "¿Qué problemas tenéis hoy al compartir y encontrar información?", "{}", new Guid("44444444-4444-4444-4444-444444444444"), "Problemas actuales" },
                    { new Guid("88888888-8888-8888-8888-888888888888"), "external-access", 4, "[{\"Id\":\"green\",\"Label\":\"Permitido\",\"Description\":null},{\"Id\":\"yellow\",\"Label\":\"Permitido con control\",\"Description\":null},{\"Id\":\"red\",\"Label\":\"No permitido\",\"Description\":null}]", 1, "¿Cuál debe ser la postura base ante el acceso externo en el piloto?", "{\"selectionMode\":\"single\"}", new Guid("55555555-5555-5555-5555-555555555555"), "Semáforo del acceso externo" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_DynamicTemplates_Key",
                table: "DynamicTemplates",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParticipantQuestions_SessionParticipantId",
                table: "ParticipantQuestions",
                column: "SessionParticipantId");

            migrationBuilder.CreateIndex(
                name: "IX_ParticipantQuestions_WorkshopSessionId",
                table: "ParticipantQuestions",
                column: "WorkshopSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ClientId_Code",
                table: "Projects",
                columns: new[] { "ClientId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuestionResponses_SessionParticipantId",
                table: "QuestionResponses",
                column: "SessionParticipantId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionResponses_SessionQuestionId",
                table: "QuestionResponses",
                column: "SessionQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttachments_SessionParticipantId",
                table: "SessionAttachments",
                column: "SessionParticipantId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttachments_WorkshopSessionId",
                table: "SessionAttachments",
                column: "WorkshopSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionOutcome_WorkshopSessionId",
                table: "SessionOutcome",
                column: "WorkshopSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionParticipants_WorkshopSessionId",
                table: "SessionParticipants",
                column: "WorkshopSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionQuestion_SessionSectionId",
                table: "SessionQuestion",
                column: "SessionSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionSection_WorkshopSessionId",
                table: "SessionSection",
                column: "WorkshopSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateQuestion_TemplateSectionId",
                table: "TemplateQuestion",
                column: "TemplateSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateSection_DynamicTemplateId",
                table: "TemplateSection",
                column: "DynamicTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkshopSessions_AccessCode",
                table: "WorkshopSessions",
                column: "AccessCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkshopSessions_ClientId",
                table: "WorkshopSessions",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkshopSessions_ProjectId",
                table: "WorkshopSessions",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkshopSessions_TemplateId",
                table: "WorkshopSessions",
                column: "TemplateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ParticipantQuestions");

            migrationBuilder.DropTable(
                name: "QuestionResponses");

            migrationBuilder.DropTable(
                name: "SessionAttachments");

            migrationBuilder.DropTable(
                name: "SessionOutcome");

            migrationBuilder.DropTable(
                name: "TemplateQuestion");

            migrationBuilder.DropTable(
                name: "SessionQuestion");

            migrationBuilder.DropTable(
                name: "SessionParticipants");

            migrationBuilder.DropTable(
                name: "TemplateSection");

            migrationBuilder.DropTable(
                name: "SessionSection");

            migrationBuilder.DropTable(
                name: "WorkshopSessions");

            migrationBuilder.DropTable(
                name: "DynamicTemplates");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropTable(
                name: "Clients");
        }
    }
}
