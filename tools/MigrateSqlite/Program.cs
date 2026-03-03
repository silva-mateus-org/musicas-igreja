using System.Data;
using Microsoft.Data.Sqlite;
using MySqlConnector;

namespace MigrateSqlite;

class Program
{
    static async Task<int> Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("SQLite to MySQL Migration Tool");
            Console.WriteLine("==============================");
            Console.WriteLine();
            Console.WriteLine("Usage: dotnet run -- <sqlite-path> <mysql-connection-string>");
            Console.WriteLine();
            Console.WriteLine("Example:");
            Console.WriteLine("  dotnet run -- ./pdf_organizer.db \"Server=localhost;Port=3307;Database=musicas_igreja;User=musicas_user;Password=xxx;CharSet=utf8mb4\"");
            Console.WriteLine();
            Console.WriteLine("To extract the SQLite file from Docker:");
            Console.WriteLine("  docker cp musicas-igreja-app:/app/data/pdf_organizer.db ./pdf_organizer.db");
            return 1;
        }

        var sqlitePath = args[0];
        var mysqlConnectionString = args[1];

        if (!File.Exists(sqlitePath))
        {
            Console.WriteLine($"[ERROR] SQLite file not found: {sqlitePath}");
            return 1;
        }

        Console.WriteLine("SQLite to MySQL Migration Tool");
        Console.WriteLine("==============================");
        Console.WriteLine($"  Source:  {sqlitePath}");
        Console.WriteLine($"  Target:  MySQL ({ExtractHost(mysqlConnectionString)})");
        Console.WriteLine();

        try
        {
            await using var sqliteConn = new SqliteConnection($"Data Source={sqlitePath};Mode=ReadOnly");
            await sqliteConn.OpenAsync();

            await using var mysqlConn = new MySqlConnection(mysqlConnectionString);
            await mysqlConn.OpenAsync();

            var summary = new Dictionary<string, (int read, int written)>();

            // Order matters: parent tables first, then junction/child tables
            summary["categories"] = await MigrateTableAsync(sqliteConn, mysqlConn, "categories",
                "id, name, description, created_date");

            summary["liturgical_times"] = await MigrateTableAsync(sqliteConn, mysqlConn, "liturgical_times",
                "id, name, description, created_date");

            summary["artists"] = await MigrateTableAsync(sqliteConn, mysqlConn, "artists",
                "id, name, description, created_date");

            summary["pdf_files"] = await MigrateTableAsync(sqliteConn, mysqlConn, "pdf_files",
                "id, filename, original_name, song_name, artist, category, liturgical_time, musical_key, youtube_link, file_path, file_size, upload_date, file_hash, page_count, description");

            summary["merge_lists"] = await MigrateTableAsync(sqliteConn, mysqlConn, "merge_lists",
                "id, name, observations, created_date, updated_date");

            summary["merge_list_items"] = await MigrateTableAsync(sqliteConn, mysqlConn, "merge_list_items",
                "id, merge_list_id, pdf_file_id, order_position");

            summary["file_categories"] = await MigrateTableAsync(sqliteConn, mysqlConn, "file_categories",
                "id, file_id, category_id");

            summary["file_liturgical_times"] = await MigrateTableAsync(sqliteConn, mysqlConn, "file_liturgical_times",
                "id, file_id, liturgical_time_id");

            summary["file_artists"] = await MigrateTableAsync(sqliteConn, mysqlConn, "file_artists",
                "id, file_id, artist_id");

            // Migrate users (old schema → core_users)
            summary["users → core_users"] = await MigrateUsersAsync(sqliteConn, mysqlConn);

            Console.WriteLine();
            Console.WriteLine("==============================");
            Console.WriteLine("  Migration Summary");
            Console.WriteLine("==============================");
            foreach (var (table, (read, written)) in summary)
            {
                var skipped = read - written;
                var status = skipped > 0 ? $" ({skipped} already existed)" : "";
                Console.WriteLine($"  {table,-25} {read,5} read -> {written,5} inserted{status}");
            }
            Console.WriteLine("==============================");
            Console.WriteLine("  Migration completed successfully!");

            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Migration failed: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
            return 1;
        }
    }

    static async Task<(int read, int written)> MigrateTableAsync(
        SqliteConnection sqlite, MySqlConnection mysql,
        string table, string columns)
    {
        Console.Write($"  Migrating {table}...");

        var columnList = columns.Split(',').Select(c => c.Trim()).ToArray();

        // Check if table exists in SQLite
        await using var checkCmd = sqlite.CreateCommand();
        checkCmd.CommandText = $"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'";
        var exists = await checkCmd.ExecuteScalarAsync();
        if (exists == null)
        {
            Console.WriteLine(" SKIPPED (table not found in SQLite)");
            return (0, 0);
        }

        // Read all rows from SQLite
        await using var readCmd = sqlite.CreateCommand();
        readCmd.CommandText = $"SELECT {columns} FROM {table}";
        await using var reader = await readCmd.ExecuteReaderAsync();

        var rows = new List<object?[]>();
        while (await reader.ReadAsync())
        {
            var values = new object?[columnList.Length];
            for (int i = 0; i < columnList.Length; i++)
            {
                values[i] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            }
            rows.Add(values);
        }

        if (rows.Count == 0)
        {
            Console.WriteLine(" 0 rows (empty table)");
            return (0, 0);
        }

        // Insert into MySQL using INSERT IGNORE (idempotent)
        var paramNames = columnList.Select((_, i) => $"@p{i}").ToArray();
        var insertSql = $"INSERT IGNORE INTO {table} ({columns}) VALUES ({string.Join(", ", paramNames)})";

        int written = 0;
        foreach (var row in rows)
        {
            await using var insertCmd = mysql.CreateCommand();
            insertCmd.CommandText = insertSql;

            for (int i = 0; i < columnList.Length; i++)
            {
                insertCmd.Parameters.AddWithValue(paramNames[i], row[i] ?? DBNull.Value);
            }

            written += await insertCmd.ExecuteNonQueryAsync();
        }

        Console.WriteLine($" {rows.Count} read, {written} inserted");
        return (rows.Count, written);
    }

    static async Task<(int read, int written)> MigrateUsersAsync(
        SqliteConnection sqlite, MySqlConnection mysql)
    {
        Console.Write("  Migrating users → core_users...");

        // Check if users table exists in SQLite
        await using var checkCmd = sqlite.CreateCommand();
        checkCmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='users'";
        if (await checkCmd.ExecuteScalarAsync() == null)
        {
            Console.WriteLine(" SKIPPED (users table not found in SQLite)");
            return (0, 0);
        }

        // Build old role_id → role_name map from SQLite
        var oldRoleNames = new Dictionary<int, string>();
        {
            await using var cmd = sqlite.CreateCommand();
            cmd.CommandText = "SELECT id, name FROM roles";
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                oldRoleNames[reader.GetInt32(0)] = reader.GetString(1).ToLowerInvariant();
        }

        // Build role_name → new core_roles Id map from MySQL
        var newRoleIds = new Dictionary<string, int>();
        {
            await using var cmd = mysql.CreateCommand();
            cmd.CommandText = "SELECT Id, Name FROM core_roles";
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                newRoleIds[reader.GetString(1).ToLowerInvariant()] = reader.GetInt32(0);
        }

        var defaultRoleId = newRoleIds.GetValueOrDefault("viewer", 1);

        // Read all users from SQLite into memory first
        var users = new List<Dictionary<string, object?>>();
        {
            await using var cmd = sqlite.CreateCommand();
            cmd.CommandText = "SELECT id, username, full_name, password_hash, role_id, is_active, must_change_password, created_date, last_login_date FROM users";
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object?>();
                for (int i = 0; i < reader.FieldCount; i++)
                    row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                users.Add(row);
            }
        }

        if (users.Count == 0)
        {
            Console.WriteLine(" 0 rows (empty table)");
            return (0, 0);
        }

        // Insert each user into core_users
        int written = 0;
        foreach (var u in users)
        {
            var oldRoleId = u["role_id"] != null ? Convert.ToInt32(u["role_id"]) : 0;
            var oldRoleName = oldRoleNames.GetValueOrDefault(oldRoleId, "viewer");
            var newRoleId = newRoleIds.GetValueOrDefault(oldRoleName, defaultRoleId);

            await using var insertCmd = mysql.CreateCommand();
            insertCmd.CommandText = @"INSERT IGNORE INTO core_users 
                (Id, Username, FullName, PasswordHash, RoleId, IsActive, MustChangePassword, CreatedAt, LastLoginDate) 
                VALUES (@id, @username, @fullName, @passwordHash, @roleId, @isActive, @mustChange, @createdAt, @lastLogin)";

            insertCmd.Parameters.AddWithValue("@id", u["id"]!);
            insertCmd.Parameters.AddWithValue("@username", u["username"]!);
            insertCmd.Parameters.AddWithValue("@fullName", u["full_name"] ?? "");
            insertCmd.Parameters.AddWithValue("@passwordHash", u["password_hash"]!);
            insertCmd.Parameters.AddWithValue("@roleId", newRoleId);
            insertCmd.Parameters.AddWithValue("@isActive", u["is_active"] != null ? Convert.ToInt32(u["is_active"]) : 1);
            insertCmd.Parameters.AddWithValue("@mustChange", u["must_change_password"] != null ? Convert.ToInt32(u["must_change_password"]) : 0);
            insertCmd.Parameters.AddWithValue("@createdAt", u["created_date"] ?? DateTime.UtcNow);
            insertCmd.Parameters.AddWithValue("@lastLogin", u["last_login_date"] ?? DBNull.Value);

            written += await insertCmd.ExecuteNonQueryAsync();
        }

        Console.WriteLine($" {users.Count} read, {written} inserted");
        if (written > 0)
        {
            Console.WriteLine("    Role mapping:");
            foreach (var (oldId, oldName) in oldRoleNames)
            {
                var newId = newRoleIds.GetValueOrDefault(oldName, defaultRoleId);
                Console.WriteLine($"      '{oldName}' (old id:{oldId}) → core_roles Id:{newId}");
            }
        }

        return (users.Count, written);
    }

    static string ExtractHost(string connectionString)
    {
        try
        {
            var parts = connectionString.Split(';')
                .Select(p => p.Split('='))
                .Where(p => p.Length == 2)
                .ToDictionary(p => p[0].Trim(), p => p[1].Trim(), StringComparer.OrdinalIgnoreCase);

            var server = parts.GetValueOrDefault("Server", "?");
            var port = parts.GetValueOrDefault("Port", "3306");
            var db = parts.GetValueOrDefault("Database", "?");
            return $"{server}:{port}/{db}";
        }
        catch
        {
            return "(unable to parse)";
        }
    }
}
