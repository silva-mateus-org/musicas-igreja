using Core.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using MusicasIgreja.Api.Models;

namespace MusicasIgreja.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<PdfFile> PdfFiles { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<LiturgicalTime> LiturgicalTimes { get; set; }
    public DbSet<Artist> Artists { get; set; }
    public DbSet<MergeList> MergeLists { get; set; }
    public DbSet<MergeListItem> MergeListItems { get; set; }
    public DbSet<FileCategory> FileCategories { get; set; }
    public DbSet<FileLiturgicalTime> FileLiturgicalTimes { get; set; }
    public DbSet<FileArtist> FileArtists { get; set; }

    // Monitoring tables
    public DbSet<SystemEvent> SystemEvents { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<SystemMetric> SystemMetrics { get; set; }
    public DbSet<AlertConfiguration> AlertConfigurations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Core entities (Users, Roles, Permissions, StoredFiles)
        modelBuilder.ApplyCoreAuthEntities();
        modelBuilder.ApplyCoreFileEntities();

        // PdfFile configuration
        modelBuilder.Entity<PdfFile>(entity =>
        {
            entity.ToTable("pdf_files");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Filename).HasColumnName("filename").IsRequired();
            entity.Property(e => e.OriginalName).HasColumnName("original_name").IsRequired();
            entity.Property(e => e.SongName).HasColumnName("song_name");
            entity.Property(e => e.Artist).HasColumnName("artist");
            entity.Property(e => e.Category).HasColumnName("category").IsRequired();
            entity.Property(e => e.LiturgicalTime).HasColumnName("liturgical_time");
            entity.Property(e => e.MusicalKey).HasColumnName("musical_key");
            entity.Property(e => e.YoutubeLink).HasColumnName("youtube_link");
            entity.Property(e => e.FilePath).HasColumnName("file_path").IsRequired();
            entity.Property(e => e.FileSize).HasColumnName("file_size");
            entity.Property(e => e.UploadDate).HasColumnName("upload_date");
            entity.Property(e => e.FileHash).HasColumnName("file_hash");
            entity.Property(e => e.PageCount).HasColumnName("page_count");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.HasIndex(e => e.FileHash).IsUnique();
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedDate).HasColumnName("created_date");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // LiturgicalTime configuration
        modelBuilder.Entity<LiturgicalTime>(entity =>
        {
            entity.ToTable("liturgical_times");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedDate).HasColumnName("created_date");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Artist configuration
        modelBuilder.Entity<Artist>(entity =>
        {
            entity.ToTable("artists");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedDate).HasColumnName("created_date");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // MergeList configuration
        modelBuilder.Entity<MergeList>(entity =>
        {
            entity.ToTable("merge_lists");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.Observations).HasColumnName("observations");
            entity.Property(e => e.CreatedDate).HasColumnName("created_date");
            entity.Property(e => e.UpdatedDate).HasColumnName("updated_date");
        });

        // MergeListItem configuration
        modelBuilder.Entity<MergeListItem>(entity =>
        {
            entity.ToTable("merge_list_items");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MergeListId).HasColumnName("merge_list_id");
            entity.Property(e => e.PdfFileId).HasColumnName("pdf_file_id");
            entity.Property(e => e.OrderPosition).HasColumnName("order_position");

            entity.HasOne(e => e.MergeList)
                .WithMany(m => m.Items)
                .HasForeignKey(e => e.MergeListId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PdfFile)
                .WithMany(p => p.MergeListItems)
                .HasForeignKey(e => e.PdfFileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // FileCategory (N:N relationship)
        modelBuilder.Entity<FileCategory>(entity =>
        {
            entity.ToTable("file_categories");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FileId).HasColumnName("file_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");

            entity.HasOne(e => e.PdfFile)
                .WithMany(p => p.FileCategories)
                .HasForeignKey(e => e.FileId);

            entity.HasOne(e => e.Category)
                .WithMany(c => c.FileCategories)
                .HasForeignKey(e => e.CategoryId);

            entity.HasIndex(e => new { e.FileId, e.CategoryId }).IsUnique();
        });

        // FileLiturgicalTime (N:N relationship)
        modelBuilder.Entity<FileLiturgicalTime>(entity =>
        {
            entity.ToTable("file_liturgical_times");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FileId).HasColumnName("file_id");
            entity.Property(e => e.LiturgicalTimeId).HasColumnName("liturgical_time_id");

            entity.HasOne(e => e.PdfFile)
                .WithMany(p => p.FileLiturgicalTimes)
                .HasForeignKey(e => e.FileId);

            entity.HasOne(e => e.LiturgicalTime)
                .WithMany(l => l.FileLiturgicalTimes)
                .HasForeignKey(e => e.LiturgicalTimeId);

            entity.HasIndex(e => new { e.FileId, e.LiturgicalTimeId }).IsUnique();
        });

        // Seed default categories
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Aclamação" },
            new Category { Id = 2, Name = "Adoração" },
            new Category { Id = 3, Name = "Ato penitencial" },
            new Category { Id = 4, Name = "Comunhão" },
            new Category { Id = 5, Name = "Cordeiro" },
            new Category { Id = 6, Name = "Entrada" },
            new Category { Id = 7, Name = "Espírito Santo" },
            new Category { Id = 8, Name = "Final" },
            new Category { Id = 9, Name = "Glória" },
            new Category { Id = 10, Name = "Maria" },
            new Category { Id = 11, Name = "Ofertório" },
            new Category { Id = 12, Name = "Pós Comunhão" },
            new Category { Id = 13, Name = "Salmo" },
            new Category { Id = 14, Name = "Santo" },
            new Category { Id = 15, Name = "Diversos" }
        );

        // FileArtist (N:N relationship)
        modelBuilder.Entity<FileArtist>(entity =>
        {
            entity.ToTable("file_artists");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FileId).HasColumnName("file_id");
            entity.Property(e => e.ArtistId).HasColumnName("artist_id");

            entity.HasOne(e => e.PdfFile)
                .WithMany(p => p.FileArtists)
                .HasForeignKey(e => e.FileId);

            entity.HasOne(e => e.Artist)
                .WithMany(a => a.FileArtists)
                .HasForeignKey(e => e.ArtistId);

            entity.HasIndex(e => new { e.FileId, e.ArtistId }).IsUnique();
        });

        // Seed default liturgical times
        modelBuilder.Entity<LiturgicalTime>().HasData(
            new LiturgicalTime { Id = 1, Name = "Advento" },
            new LiturgicalTime { Id = 2, Name = "Natal" },
            new LiturgicalTime { Id = 3, Name = "Quaresma" },
            new LiturgicalTime { Id = 4, Name = "Páscoa" },
            new LiturgicalTime { Id = 5, Name = "Tempo Comum" },
            new LiturgicalTime { Id = 6, Name = "Pentecostes" }
        );
    }
}

