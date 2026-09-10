using System.Text.Json;
using FrameIt.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace FrameIt.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<FacilitatorUser, IdentityRole<Guid>, Guid>(options)
{
    public bool OrganizationScopeEnabled { get; set; }
    public Guid? CurrentOrganizationId { get; set; }
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<FacilitatorLoginSession> FacilitatorLoginSessions => Set<FacilitatorLoginSession>();
    public DbSet<FacilitatorInvitation> FacilitatorInvitations => Set<FacilitatorInvitation>();
    public DbSet<AuthChallenge> AuthChallenges => Set<AuthChallenge>();
    public DbSet<FacilitatorRecoveryCode> FacilitatorRecoveryCodes => Set<FacilitatorRecoveryCode>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<DynamicTemplate> DynamicTemplates => Set<DynamicTemplate>();
    public DbSet<WorkshopSession> WorkshopSessions => Set<WorkshopSession>();
    public DbSet<SessionParticipant> SessionParticipants => Set<SessionParticipant>();
    public DbSet<QuestionResponse> QuestionResponses => Set<QuestionResponse>();
    public DbSet<SessionSatisfactionResponse> SessionSatisfactionResponses => Set<SessionSatisfactionResponse>();
    public DbSet<ParticipantQuestion> ParticipantQuestions => Set<ParticipantQuestion>();
    public DbSet<SessionAttachment> SessionAttachments => Set<SessionAttachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Project>().HasOne(x => x.Client).WithMany(x => x.Projects).HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WorkshopSession>().HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WorkshopSession>().HasOne(x => x.Project).WithMany(x => x.Sessions).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WorkshopSession>().HasOne(x => x.Template).WithMany(x => x.Sessions).HasForeignKey(x => x.TemplateId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Organization>().Property(x => x.Name).HasMaxLength(160);
        modelBuilder.Entity<Organization>().HasData(new Organization { Id = Organization.DefaultId, Name = "OLATIC" });
        modelBuilder.Entity<Client>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<Project>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<WorkshopSession>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<DynamicTemplate>().HasQueryFilter(x => !OrganizationScopeEnabled || x.IsBuiltIn || (CurrentOrganizationId != null && x.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<TemplateSection>().HasQueryFilter(x => !OrganizationScopeEnabled || x.DynamicTemplate!.IsBuiltIn || (CurrentOrganizationId != null && x.DynamicTemplate!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<TemplateQuestion>().HasQueryFilter(x => !OrganizationScopeEnabled || x.TemplateSection!.DynamicTemplate!.IsBuiltIn || (CurrentOrganizationId != null && x.TemplateSection!.DynamicTemplate!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<SessionSection>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<SessionQuestion>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.SessionSection!.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<SessionParticipant>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<QuestionResponse>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.SessionQuestion!.SessionSection!.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<SessionOutcome>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<SessionAttachment>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<ParticipantQuestion>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<SessionSatisfactionResponse>().HasQueryFilter(x => !OrganizationScopeEnabled || (CurrentOrganizationId != null && x.WorkshopSession!.Client!.OrganizationId == CurrentOrganizationId));
        modelBuilder.Entity<FacilitatorInvitation>(entity =>
        {
            entity.Property(x => x.Email).HasMaxLength(254);
            entity.Property(x => x.TokenHash).HasMaxLength(64);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => x.ExpiresAtUtc);
            entity.HasOne<FacilitatorUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });
        modelBuilder.Entity<FacilitatorLoginSession>().HasIndex(x => x.ExpiresAtUtc);
        modelBuilder.Entity<AuthChallenge>().HasIndex(x => x.ExpiresAtUtc);
        modelBuilder.Entity<Client>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Industry).HasMaxLength(120);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Code).HasMaxLength(50);
            entity.HasIndex(x => new { x.ClientId, x.Code }).IsUnique();
        });

        modelBuilder.Entity<DynamicTemplate>(entity =>
        {
            entity.Property(x => x.Key).HasMaxLength(80);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.HasIndex(x => new { x.OrganizationId, x.Key }).IsUnique();
        });

        modelBuilder.Entity<TemplateQuestion>(entity =>
        {
            entity.Property(x => x.OptionsJson).HasColumnType("jsonb");
            entity.Property(x => x.SettingsJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<WorkshopSession>(entity =>
        {
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.AccessCode).HasMaxLength(16);
            entity.HasIndex(x => x.AccessCode).IsUnique();
        });

        modelBuilder.Entity<SessionSatisfactionResponse>(entity =>
        {
            entity.Property(x => x.Comment).HasMaxLength(2000);
            entity.HasIndex(x => new { x.WorkshopSessionId, x.SessionParticipantId }).IsUnique();
        });

        modelBuilder.Entity<SessionQuestion>(entity =>
        {
            entity.Property(x => x.OptionsJson).HasColumnType("jsonb");
            entity.Property(x => x.SettingsJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<ParticipantQuestion>(entity =>
        {
            entity.Property(x => x.Question).HasMaxLength(2000);
            entity.Property(x => x.RoundContextJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<SessionAttachment>(entity =>
        {
            entity.Property(x => x.FileName).HasMaxLength(260);
            entity.Property(x => x.ContentType).HasMaxLength(200);
            entity.Property(x => x.StorageKey).HasMaxLength(500);
            entity.Property(x => x.Url).HasMaxLength(2000);
        });

        Seed(modelBuilder);
    }

    private static void Seed(ModelBuilder modelBuilder)
    {
        var clientId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var projectId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var templateId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var sectionOneId = Guid.Parse("44444444-4444-4444-4444-444444444444");
        var sectionTwoId = Guid.Parse("55555555-5555-5555-5555-555555555555");
        var questionOneId = Guid.Parse("66666666-6666-6666-6666-666666666666");
        var questionTwoId = Guid.Parse("77777777-7777-7777-7777-777777777777");
        var questionThreeId = Guid.Parse("88888888-8888-8888-8888-888888888888");

        modelBuilder.Entity<Client>().HasData(new Client
        {
            Id = clientId,
            Name = "Contoso",
            Industry = "Consulting"
        });

        modelBuilder.Entity<Project>().HasData(new Project
        {
            Id = projectId,
            ClientId = clientId,
            Name = "M365 Governance Rollout",
            Code = "M365-GOV"
        });

        modelBuilder.Entity<DynamicTemplate>().HasData(new DynamicTemplate
        {
            Id = templateId,
            Key = "m365-governance-workshop",
            Title = "M365 Governance Discovery",
            Objective = "Alinear decisiones de colaboración, permisos y acceso externo para un piloto de Microsoft 365.",
            Audience = "Negocio + IT",
            FacilitatorGuidance = "Mantén el foco en decisiones y aparca excepciones como pendientes.",
            IsBuiltIn = true,
            UpdatedAtUtc = new DateTimeOffset(2026, 4, 13, 15, 0, 0, TimeSpan.Zero)
        });

        modelBuilder.Entity<TemplateSection>().HasData(
            new TemplateSection
            {
                Id = sectionOneId,
                DynamicTemplateId = templateId,
                Key = "current-state",
                Title = "Mapa del trabajo real",
                Objective = "Capturar cómo trabaja hoy el equipo.",
                Order = 1
            },
            new TemplateSection
            {
                Id = sectionTwoId,
                DynamicTemplateId = templateId,
                Key = "governance",
                Title = "Gobernanza y límites",
                Objective = "Acordar lo que sí y no entra en el piloto.",
                Order = 2
            });

        modelBuilder.Entity<TemplateQuestion>().HasData(
            new TemplateQuestion
            {
                Id = questionOneId,
                TemplateSectionId = sectionOneId,
                Key = "work-documents",
                Kind = QuestionKind.StickyNotes,
                Title = "Documentos actuales",
                Prompt = "¿Qué tipo de documentos usáis y cuáles cambian a menudo?",
                Order = 1,
                OptionsJson = "[]",
                SettingsJson = JsonSerializer.Serialize(new Dictionary<string, string> { ["maxItems"] = "6" })
            },
            new TemplateQuestion
            {
                Id = questionTwoId,
                TemplateSectionId = sectionOneId,
                Key = "sharing-pain",
                Kind = QuestionKind.RichText,
                Title = "Problemas actuales",
                Prompt = "¿Qué problemas tenéis hoy al compartir y encontrar información?",
                Order = 2,
                OptionsJson = "[]",
                SettingsJson = "{}"
            },
            new TemplateQuestion
            {
                Id = questionThreeId,
                TemplateSectionId = sectionTwoId,
                Key = "external-access",
                Kind = QuestionKind.Choice,
                Title = "Semáforo del acceso externo",
                Prompt = "¿Cuál debe ser la postura base ante el acceso externo en el piloto?",
                Order = 1,
                OptionsJson = JsonSerializer.Serialize(new[]
                {
                    new QuestionOptionDto("green", "Permitido"),
                    new QuestionOptionDto("yellow", "Permitido con control"),
                    new QuestionOptionDto("red", "No permitido")
                }),
                SettingsJson = JsonSerializer.Serialize(new Dictionary<string, string> { ["selectionMode"] = "single" })
            });
    }
}
