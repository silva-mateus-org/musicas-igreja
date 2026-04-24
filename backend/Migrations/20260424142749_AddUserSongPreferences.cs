using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MusicasIgreja.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSongPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "alert_configurations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    config_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    metric_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    threshold_value = table.Column<double>(type: "double precision", nullable: false),
                    threshold_unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    comparison_operator = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_configurations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "artists",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_artists", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "core_roles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_core_roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "core_stored_files",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OriginalName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RelativePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FileHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByUserId = table.Column<int>(type: "integer", nullable: true),
                    Category = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: true),
                    UpdatedByUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_core_stored_files", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "system_metrics",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    metric_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    value = table.Column<double>(type: "double precision", nullable: false),
                    unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    metadata = table.Column<string>(type: "text", nullable: true),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_metrics", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "workspaces",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    slug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspaces", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "core_role_permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<int>(type: "integer", nullable: false),
                    PermissionKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_core_role_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_core_role_permissions_core_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "core_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "core_users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RoleId = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    MustChangePassword = table.Column<bool>(type: "boolean", nullable: false),
                    LastLoginDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_core_users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_core_users_core_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "core_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    workspace_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_categories_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "custom_filter_groups",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    show_as_tab = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    workspace_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_custom_filter_groups", x => x.id);
                    table.ForeignKey(
                        name: "FK_custom_filter_groups_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merge_lists",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    observations = table.Column<string>(type: "text", nullable: true),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    workspace_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merge_lists", x => x.id);
                    table.ForeignKey(
                        name: "FK_merge_lists_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pdf_files",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    filename = table.Column<string>(type: "text", nullable: false),
                    original_name = table.Column<string>(type: "text", nullable: false),
                    song_name = table.Column<string>(type: "text", nullable: true),
                    musical_key = table.Column<string>(type: "text", nullable: true),
                    youtube_link = table.Column<string>(type: "text", nullable: true),
                    file_path = table.Column<string>(type: "text", nullable: true),
                    file_size = table.Column<long>(type: "bigint", nullable: true),
                    upload_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    file_hash = table.Column<string>(type: "text", nullable: true),
                    page_count = table.Column<int>(type: "integer", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    content_type = table.Column<string>(type: "text", nullable: false, defaultValue: "pdf_only"),
                    chord_content = table.Column<string>(type: "text", nullable: true),
                    ocr_status = table.Column<string>(type: "text", nullable: true),
                    ocr_started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ocr_error = table.Column<string>(type: "text", nullable: true),
                    workspace_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pdf_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_pdf_files_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_id = table.Column<int>(type: "integer", nullable: true),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    old_value = table.Column<string>(type: "text", nullable: true),
                    new_value = table.Column<string>(type: "text", nullable: true),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_audit_logs_core_users_user_id",
                        column: x => x.user_id,
                        principalTable: "core_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "system_events",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    event_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    metadata = table.Column<string>(type: "text", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_system_events_core_users_user_id",
                        column: x => x.user_id,
                        principalTable: "core_users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "custom_filter_values",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    filter_group_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_custom_filter_values", x => x.id);
                    table.ForeignKey(
                        name: "FK_custom_filter_values_custom_filter_groups_filter_group_id",
                        column: x => x.filter_group_id,
                        principalTable: "custom_filter_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "file_artists",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_id = table.Column<int>(type: "integer", nullable: false),
                    artist_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_file_artists", x => x.id);
                    table.ForeignKey(
                        name: "FK_file_artists_artists_artist_id",
                        column: x => x.artist_id,
                        principalTable: "artists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_file_artists_pdf_files_file_id",
                        column: x => x.file_id,
                        principalTable: "pdf_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "file_categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_id = table.Column<int>(type: "integer", nullable: false),
                    category_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_file_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_file_categories_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_file_categories_pdf_files_file_id",
                        column: x => x.file_id,
                        principalTable: "pdf_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merge_list_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    merge_list_id = table.Column<int>(type: "integer", nullable: false),
                    pdf_file_id = table.Column<int>(type: "integer", nullable: false),
                    order_position = table.Column<int>(type: "integer", nullable: false),
                    key_override = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    capo_override = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merge_list_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_merge_list_items_merge_lists_merge_list_id",
                        column: x => x.merge_list_id,
                        principalTable: "merge_lists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merge_list_items_pdf_files_pdf_file_id",
                        column: x => x.pdf_file_id,
                        principalTable: "pdf_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_song_preferences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    pdf_file_id = table.Column<int>(type: "integer", nullable: false),
                    transpose_amount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    capo_fret = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    arrangement_json = table.Column<string>(type: "json", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_song_preferences", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_song_preferences_pdf_files_pdf_file_id",
                        column: x => x.pdf_file_id,
                        principalTable: "pdf_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "file_custom_filters",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_id = table.Column<int>(type: "integer", nullable: false),
                    filter_value_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_file_custom_filters", x => x.id);
                    table.ForeignKey(
                        name: "FK_file_custom_filters_custom_filter_values_filter_value_id",
                        column: x => x.filter_value_id,
                        principalTable: "custom_filter_values",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_file_custom_filters_pdf_files_file_id",
                        column: x => x.file_id,
                        principalTable: "pdf_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "workspaces",
                columns: new[] { "id", "color", "created_date", "description", "icon", "is_active", "name", "slug", "sort_order" },
                values: new object[] { 1, null, new DateTime(2026, 4, 24, 14, 27, 49, 174, DateTimeKind.Utc).AddTicks(9752), null, "church", true, "Igreja", "igreja", 0 });

            migrationBuilder.InsertData(
                table: "categories",
                columns: new[] { "id", "created_date", "description", "name", "slug", "workspace_id" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(6470), null, "Aclamação", "aclamacao", 1 },
                    { 2, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7054), null, "Adoração", "adoracao", 1 },
                    { 3, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7056), null, "Ato penitencial", "ato-penitencial", 1 },
                    { 4, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7057), null, "Comunhão", "comunhao", 1 },
                    { 5, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7058), null, "Cordeiro", "cordeiro", 1 },
                    { 6, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7060), null, "Entrada", "entrada", 1 },
                    { 7, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7061), null, "Espírito Santo", "espirito-santo", 1 },
                    { 8, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7062), null, "Final", "final", 1 },
                    { 9, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7063), null, "Glória", "gloria", 1 },
                    { 10, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7064), null, "Maria", "maria", 1 },
                    { 11, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7065), null, "Ofertório", "ofertorio", 1 },
                    { 12, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7066), null, "Pós Comunhão", "pos-comunhao", 1 },
                    { 13, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7067), null, "Salmo", "salmo", 1 },
                    { 14, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7068), null, "Santo", "santo", 1 },
                    { 15, new DateTime(2026, 4, 24, 14, 27, 49, 175, DateTimeKind.Utc).AddTicks(7069), null, "Diversos", "diversos", 1 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_artists_name",
                table: "artists",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_artists_slug",
                table: "artists",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_user_id",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_categories_workspace_id_name",
                table: "categories",
                columns: new[] { "workspace_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_categories_workspace_id_slug",
                table: "categories",
                columns: new[] { "workspace_id", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_core_role_permissions_RoleId_PermissionKey",
                table: "core_role_permissions",
                columns: new[] { "RoleId", "PermissionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_core_roles_Name",
                table: "core_roles",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_core_stored_files_Category",
                table: "core_stored_files",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_core_stored_files_FileHash",
                table: "core_stored_files",
                column: "FileHash");

            migrationBuilder.CreateIndex(
                name: "IX_core_users_RoleId",
                table: "core_users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_core_users_Username",
                table: "core_users",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_custom_filter_groups_workspace_id_slug",
                table: "custom_filter_groups",
                columns: new[] { "workspace_id", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_custom_filter_values_filter_group_id_slug",
                table: "custom_filter_values",
                columns: new[] { "filter_group_id", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_file_artists_artist_id",
                table: "file_artists",
                column: "artist_id");

            migrationBuilder.CreateIndex(
                name: "IX_file_artists_file_id_artist_id",
                table: "file_artists",
                columns: new[] { "file_id", "artist_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_file_categories_category_id",
                table: "file_categories",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_file_categories_file_id_category_id",
                table: "file_categories",
                columns: new[] { "file_id", "category_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_file_custom_filters_file_id_filter_value_id",
                table: "file_custom_filters",
                columns: new[] { "file_id", "filter_value_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_file_custom_filters_filter_value_id",
                table: "file_custom_filters",
                column: "filter_value_id");

            migrationBuilder.CreateIndex(
                name: "IX_merge_list_items_merge_list_id_order_position",
                table: "merge_list_items",
                columns: new[] { "merge_list_id", "order_position" });

            migrationBuilder.CreateIndex(
                name: "IX_merge_list_items_pdf_file_id",
                table: "merge_list_items",
                column: "pdf_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_merge_lists_workspace_id",
                table: "merge_lists",
                column: "workspace_id");

            migrationBuilder.CreateIndex(
                name: "IX_pdf_files_file_hash",
                table: "pdf_files",
                column: "file_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pdf_files_upload_date",
                table: "pdf_files",
                column: "upload_date",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_pdf_files_workspace_id",
                table: "pdf_files",
                column: "workspace_id");

            migrationBuilder.CreateIndex(
                name: "IX_system_events_user_id",
                table: "system_events",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_song_preferences_pdf_file_id",
                table: "user_song_preferences",
                column: "pdf_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_song_preferences_user_id_pdf_file_id",
                table: "user_song_preferences",
                columns: new[] { "user_id", "pdf_file_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_slug",
                table: "workspaces",
                column: "slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alert_configurations");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "core_role_permissions");

            migrationBuilder.DropTable(
                name: "core_stored_files");

            migrationBuilder.DropTable(
                name: "file_artists");

            migrationBuilder.DropTable(
                name: "file_categories");

            migrationBuilder.DropTable(
                name: "file_custom_filters");

            migrationBuilder.DropTable(
                name: "merge_list_items");

            migrationBuilder.DropTable(
                name: "system_events");

            migrationBuilder.DropTable(
                name: "system_metrics");

            migrationBuilder.DropTable(
                name: "user_song_preferences");

            migrationBuilder.DropTable(
                name: "artists");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "custom_filter_values");

            migrationBuilder.DropTable(
                name: "merge_lists");

            migrationBuilder.DropTable(
                name: "core_users");

            migrationBuilder.DropTable(
                name: "pdf_files");

            migrationBuilder.DropTable(
                name: "custom_filter_groups");

            migrationBuilder.DropTable(
                name: "core_roles");

            migrationBuilder.DropTable(
                name: "workspaces");
        }
    }
}
